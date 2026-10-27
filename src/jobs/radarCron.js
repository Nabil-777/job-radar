const { logger } = require('../utils/logger');
const cron = require('node-cron');
const { db } = require('../db/database');
const { broadcastJobAlert } = require('../services/notificationService');
const { shouldIngest, parsePostedDate } = require('../utils/parsePostedDate');

let cronTask = null;

function startRadarCron(aggregatorSearchFn) {
  if (cronTask) return;

  const scheduleExpression = process.env.RADAR_CRON_SCHEDULE || '0 */2 * * *'; // default every 2 hours
  logger.info(`[Radar Cron] Starting background job scanner with schedule "${scheduleExpression}"...`);

  cronTask = cron.schedule(scheduleExpression, async () => {
    logger.info('[Radar Cron] Sweeping platforms for newly posted internships & jobs...');
    try {
      // Get user profile for match scoring
      const profile = db.prepare('SELECT * FROM user_profile WHERE id = ?').get('default');

      // Search all sources
      const searchResult = await aggregatorSearchFn({
        domain: 'all',
        keywords: '',
        experienceLevel: 'all',
        location: 'Morocco',
        source: 'all',
        limit: 50
      });

      if (!searchResult || !searchResult.jobs) return;

      const insertJob = db.prepare(`
        INSERT OR IGNORE INTO jobs (
          id, external_id, title, company, location, is_remote, category, experience_level,
          contract_type, salary_range, description, tags_json, url, source, fingerprint,
          published_at, posted_at, date_raw, date_status, created_at, fetched_at, match_score, is_new
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertCronJobsBatch = db.transaction((jobs) => {
        let count = 0;
        const nowIso = new Date().toISOString();

        for (const job of jobs) {
          // Staleness & date accuracy check
          if (!shouldIngest(job)) {
            logger.info({ provider: job.source, url: job.url, dateRaw: job.dateRaw }, 'job rejected: stale or undated');
            continue;
          }

          const parsedDate = parsePostedDate(job.postedAt || job.datePosted || job.publishedAt);
          const postedAt = parsedDate ? parsedDate.toISOString() : null;
          const dateStatus = postedAt ? 'parsed' : 'unknown';

          const info = insertJob.run(
            job.id,
            job.id,
            job.title,
            job.company,
            job.location,
            job.remote ? 1 : 0,
            job.category || 'tech',
            job.experienceLevel || 'Entry',
            job.contractType || 'CDI',
            job.salary || '',
            job.descriptionSnippet || '',
            JSON.stringify(job.tags || []),
            job.url,
            job.source,
            job.fingerprint || `${job.company}-${job.title}`.toLowerCase(),
            postedAt,
            postedAt,
            job.dateRaw ? String(job.dateRaw) : null,
            dateStatus,
            nowIso,
            nowIso,
            job.matchScore || 70,
            1
          );

          if (info.changes > 0) {
            count++;
            // High match or stage alert
            if ((job.matchScore && job.matchScore >= 80) || (job.experienceLevel || '').toLowerCase().includes('intern')) {
              broadcastJobAlert(job);
            }
          }
        }
        return count;
      });

      const insertedCount = insertCronJobsBatch(searchResult.jobs);
      logger.info(`[Radar Cron] Ingested ${insertedCount} new fresh job listings into SQLite.`);
    } catch (err) {
      logger.error({ err: err.stack || err.message }, '[Radar Cron] Sweep encountered error');
    }
  });
}

function stopRadarCron() {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    logger.info('[Radar Cron] Background scanner stopped.');
  }
}

module.exports = {
  startRadarCron,
  stopRadarCron
};
