const express = require('express');
const { searchJobs } = require('../services/aggregator');
const { db } = require('../db/database');
const { calculateMatchScore } = require('../services/matchingEngine');
const { parsePostedDate, formatPostedDateLabel, isFreshPosting, shouldIngest } = require('../utils/parsePostedDate');
const { logger } = require('../utils/logger');

const router = express.Router();

// GET /api/jobs and GET /api/jobs/search
router.get(['/', '/search'], async (req, res) => {
  try {
    const {
      domain = 'all',
      keywords = '',
      experienceLevel = 'all',
      location = 'Worldwide',
      source = 'all',
      workType = 'all',
      limit = '50',
      refresh = 'false',
      postedAfter,
      postedBefore,
      maxAgeDays,
      dateStatus
    } = req.query;

    const userProfile = db.prepare('SELECT * FROM user_profile WHERE id = ?').get('default');

    const result = await searchJobs({
      domain,
      keywords,
      experienceLevel,
      location,
      source,
      workType,
      limit: parseInt(limit, 10) || 50,
      forceRefresh: refresh === 'true'
    });

    const now = Date.now();

    // Attach AI match scores and normalized date metadata to jobs
    const jobsWithScores = (result.jobs || []).map(job => {
      const match = calculateMatchScore(job, userProfile);
      const rawDate = job.dateRaw !== undefined ? job.dateRaw : (job.date || job.datePosted || job.publishedAt || job.published_at || job.postedAt || null);
      const parsedDate = job.postedAt instanceof Date ? job.postedAt : (job.postedAt ? new Date(job.postedAt) : parsePostedDate(rawDate, now));
      const postedAt = parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : null;
      const computedDateStatus = job.dateStatus || (postedAt ? 'parsed' : 'unknown');
      const isFresh = isFreshPosting(parsedDate, now);
      const postedAtLabel = formatPostedDateLabel(parsedDate, now);

      return {
        ...job,
        postedAt,
        datePosted: postedAt || job.datePosted || '',
        publishedAt: postedAt || job.publishedAt || '',
        dateRaw: rawDate != null ? String(rawDate) : null,
        dateStatus: computedDateStatus,
        isFresh,
        postedAtLabel,
        matchScore: match.matchScore,
        matchedSkills: match.matchedSkills,
        missingSkills: match.missingSkills
      };
    });

    // Apply API Query Filters (Date filtering)
    let filteredJobs = jobsWithScores;

    if (postedAfter) {
      const afterTime = new Date(postedAfter).getTime();
      if (!isNaN(afterTime)) {
        filteredJobs = filteredJobs.filter(j => j.postedAt && new Date(j.postedAt).getTime() >= afterTime);
      }
    }

    if (postedBefore) {
      const beforeTime = new Date(postedBefore).getTime();
      if (!isNaN(beforeTime)) {
        filteredJobs = filteredJobs.filter(j => j.postedAt && new Date(j.postedAt).getTime() <= beforeTime);
      }
    }

    if (maxAgeDays && !isNaN(Number(maxAgeDays))) {
      const cutoffTime = now - Number(maxAgeDays) * 86400e3;
      filteredJobs = filteredJobs.filter(j => j.postedAt && new Date(j.postedAt).getTime() >= cutoffTime);
    }

    if (dateStatus && dateStatus !== 'all') {
      filteredJobs = filteredJobs.filter(j => j.dateStatus === dateStatus);
    }

    // Default sorting:
    // Fresh-first (parsed -> inferred -> unknown), then actual posted_at DESC, then matchScore DESC
    filteredJobs.sort((a, b) => {
      const rankA = a.dateStatus === 'parsed' ? 0 : (a.dateStatus === 'inferred' ? 1 : 2);
      const rankB = b.dateStatus === 'parsed' ? 0 : (b.dateStatus === 'inferred' ? 1 : 2);
      if (rankA !== rankB) return rankA - rankB;

      const timeA = a.postedAt ? new Date(a.postedAt).getTime() : 0;
      const timeB = b.postedAt ? new Date(b.postedAt).getTime() : 0;
      if (timeA !== timeB) return timeB - timeA;

      return (b.matchScore || 0) - (a.matchScore || 0);
    });

    // Async persist eligible jobs to SQLite in background inside a transaction
    setImmediate(() => {
      try {
        const insertJob = db.prepare(`
          INSERT INTO jobs (
            id, external_id, title, company, location, is_remote, category, experience_level,
            contract_type, salary_range, description, tags_json, url, source, fingerprint,
            published_at, posted_at, date_raw, date_status, created_at, fetched_at, match_score, is_new
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
          ON CONFLICT(fingerprint) DO UPDATE SET
            fetched_at = excluded.fetched_at,
            match_score = excluded.match_score,
            posted_at = COALESCE(excluded.posted_at, jobs.posted_at),
            date_status = CASE WHEN excluded.posted_at IS NOT NULL THEN excluded.date_status ELSE jobs.date_status END
        `);

        const insertJobsBatch = db.transaction((jobs) => {
          for (const j of jobs) {
            if (!j.fingerprint) continue;
            // Staleness Cutoff at ingestion: drops jobs older than MAX_JOB_AGE_DAYS or undated
            if (!shouldIngest(j)) {
              logger.info({ provider: j.source, url: j.url, dateRaw: j.dateRaw }, 'job rejected: stale or undated');
              continue;
            }

            const nowIso = new Date().toISOString();
            insertJob.run(
              j.id,
              j.id,
              j.title,
              j.company,
              j.location,
              j.remote ? 1 : 0,
              j.category || 'tech',
              j.experienceLevel || 'Entry',
              j.contractType || 'CDI',
              j.salary || '',
              j.descriptionSnippet || '',
              JSON.stringify(j.tags || []),
              j.url,
              j.source,
              j.fingerprint,
              j.postedAt || null,
              j.postedAt || null,
              j.dateRaw || null,
              j.dateStatus || 'unknown',
              nowIso,
              nowIso,
              j.matchScore || 70
            );
          }
        });

        insertJobsBatch(filteredJobs.slice(0, 30));
      } catch (e) {
        // non-blocking
      }
    });

    res.json({
      success: true,
      jobs: filteredJobs,
      stats: {
        ...(result.stats || {}),
        total: filteredJobs.length
      },
      fromCache: result.fromCache || false
    });
  } catch (err) {
    logger.error({ err: err.stack || err.message }, '[Jobs Route Error]');
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/jobs/refresh (Forces fresh scrape)
router.post('/refresh', async (req, res) => {
  try {
    const { domain = 'all', keywords = '', location = 'Morocco' } = req.body || {};
    const result = await searchJobs({
      domain,
      keywords,
      location,
      source: 'all',
      forceRefresh: true
    });
    res.json({ success: true, message: 'Platform sweep refreshed', count: result.jobs ? result.jobs.length : 0 });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
