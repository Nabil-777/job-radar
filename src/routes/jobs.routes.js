const express = require('express');
const { searchJobs } = require('../services/aggregator');
const { db } = require('../db/database');
const { calculateMatchScore } = require('../services/matchingEngine');

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
      refresh = 'false'
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

    // Attach AI match scores to jobs
    const jobsWithScores = (result.jobs || []).map(job => {
      const match = calculateMatchScore(job, userProfile);
      return {
        ...job,
        matchScore: match.matchScore,
        matchedSkills: match.matchedSkills,
        missingSkills: match.missingSkills
      };
    });

    // Sort by matchScore descending if level/domain search
    jobsWithScores.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

    // Async persist jobs to SQLite in background inside a transaction
    setImmediate(() => {
      try {
        const insertJob = db.prepare(`
          INSERT INTO jobs (
            id, external_id, title, company, location, is_remote, category, experience_level,
            contract_type, salary_range, description, tags_json, url, source, fingerprint,
            published_at, fetched_at, match_score, is_new
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
          ON CONFLICT(fingerprint) DO UPDATE SET
            fetched_at = excluded.fetched_at,
            match_score = excluded.match_score
        `);

        const insertJobsBatch = db.transaction((jobs) => {
          for (const j of jobs) {
            if (!j.fingerprint) continue;
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
              j.datePosted || new Date().toISOString(),
              new Date().toISOString(),
              j.matchScore || 70
            );
          }
        });

        insertJobsBatch(jobsWithScores.slice(0, 30));
      } catch (e) {
        // non-blocking
      }
    });

    res.json({
      success: true,
      jobs: jobsWithScores,
      stats: result.stats,
      fromCache: result.fromCache || false
    });
  } catch (err) {
    console.error('[Jobs Route Error]:', err);
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
