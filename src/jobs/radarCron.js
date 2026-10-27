const { logger } = require('../utils/logger');
const cron = require('node-cron');
const { db } = require('../db/database');
const { broadcastJobAlert } = require('../services/notificationService');

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
          published_at, fetched_at, match_score, is_new
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertCronJobsBatch = db.transaction((jobs) => {
        let count = 0;
        for (const job of jobs) {
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
            job.datePosted || new Date().toISOString(),
            new Date().toISOString(),
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

      const newCount = insertCronJobsBatch(searchResult.jobs);
      logger.info(`[Radar Cron] Sweep completed. Discovered ${newCount} brand-new job postings.`);
    } catch (err) {
      logger.error('[Radar Cron] Sweep failed:', err.message);
    }
  });
}

function stopRadarCron() {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
  }
}

module.exports = { startRadarCron, stopRadarCron };
