const { logger } = require('../utils/logger');
const fs = require('fs');
const path = require('path');
const { db } = require('./database');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');

function runMigration() {
  try {
    // 1. Migrate Applications
    const appsFile = path.join(DATA_DIR, 'applications.json');
    if (fs.existsSync(appsFile)) {
      try {
        const raw = fs.readFileSync(appsFile, 'utf8');
        const apps = JSON.parse(raw);
        if (Array.isArray(apps) && apps.length > 0) {
          const insertApp = db.prepare(`
            INSERT OR IGNORE INTO applications (
              id, job_id, job_title, company, location, url, source, status, notes, applied_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          const count = db.prepare('SELECT COUNT(*) as c FROM applications').get().c;
          if (count === 0) {
            const tx = db.transaction((items) => {
              for (const a of items) {
                insertApp.run(
                  a.id || `app-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  a.jobId || a.id || null,
                  a.title || a.jobTitle || 'Untitled Position',
                  a.company || 'Unknown Company',
                  a.location || 'Morocco / Remote',
                  a.url || '',
                  a.source || 'Direct',
                  a.status || 'Saved',
                  a.notes || '',
                  a.dateApplied || a.appliedAt || null,
                  a.dateAdded || a.createdAt || new Date().toISOString(),
                  new Date().toISOString()
                );
              }
            });
            tx(apps);
            logger.info(`[Migration] Migrated ${apps.length} applications from applications.json to SQLite.`);
          }
        }
      } catch (err) {
        logger.warn('[Migration] Error migrating applications.json:', err.message);
      }
    }

    // 2. Migrate User Profile
    const profileFile = path.join(DATA_DIR, 'user_profile.json');
    if (fs.existsSync(profileFile)) {
      try {
        const raw = fs.readFileSync(profileFile, 'utf8');
        const p = JSON.parse(raw);
        const existing = db.prepare('SELECT id FROM user_profile WHERE id = ?').get('default');
        if (!existing && p) {
          const skills = p.skills ? (Array.isArray(p.skills) ? p.skills : p.skills.split(',').map(s => s.trim())) : [];
          db.prepare(`
            INSERT INTO user_profile (
              id, full_name, title, email, phone, location, linkedin_url, portfolio_url, skills_json, education_summary, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            'default',
            p.fullName || 'Tech Professional',
            p.title || 'Software Engineer',
            p.email || '',
            p.phone || '',
            p.location || 'Morocco',
            p.linkedinUrl || '',
            p.portfolioUrl || '',
            JSON.stringify(skills),
            p.school || '',
            new Date().toISOString()
          );
          logger.info('[Migration] Migrated user profile from user_profile.json to SQLite.');
        }
      } catch (err) {
        logger.warn('[Migration] Error migrating user_profile.json:', err.message);
      }
    }

    // 3. Migrate Custom Providers
    const providersFile = path.join(DATA_DIR, 'custom_providers.json');
    if (fs.existsSync(providersFile)) {
      try {
        const raw = fs.readFileSync(providersFile, 'utf8');
        const providers = JSON.parse(raw);
        if (Array.isArray(providers) && providers.length > 0) {
          const count = db.prepare('SELECT COUNT(*) as c FROM custom_providers').get().c;
          if (count === 0) {
            const insertProvider = db.prepare(`
              INSERT OR IGNORE INTO custom_providers (
                id, name, url, type, category, enabled, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            const tx = db.transaction((items) => {
              for (const p of items) {
                insertProvider.run(
                  p.id || `prov-${Date.now()}`,
                  p.name,
                  p.url,
                  p.type || 'rss',
                  p.category || 'dev',
                  p.active !== false && p.enabled !== false ? 1 : 0,
                  new Date().toISOString()
                );
              }
            });
            tx(providers);
            logger.info(`[Migration] Migrated ${providers.length} custom providers to SQLite.`);
          }
        }
      } catch (err) {
        logger.warn('[Migration] Error migrating custom_providers.json:', err.message);
      }
    }
  } catch (err) {
    logger.error('[Migration] Failed during JSON to SQLite migration:', err.message);
  }
}

module.exports = { runMigration };
