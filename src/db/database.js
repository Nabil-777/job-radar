const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'jobradar.db');
const db = new Database(DB_PATH);

// Enable WAL mode for high concurrency and performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      external_id TEXT,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      location TEXT,
      is_remote INTEGER DEFAULT 0,
      category TEXT,
      experience_level TEXT,
      contract_type TEXT,
      salary_range TEXT,
      description TEXT,
      tags_json TEXT,
      url TEXT NOT NULL,
      source TEXT,
      fingerprint TEXT UNIQUE,
      published_at TEXT,
      fetched_at TEXT,
      match_score INTEGER DEFAULT 0,
      is_new INTEGER DEFAULT 1
    );

    CREATE INDEX IF NOT EXISTS idx_jobs_fingerprint ON jobs(fingerprint);
    CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source);
    CREATE INDEX IF NOT EXISTS idx_jobs_experience_level ON jobs(experience_level);
    CREATE INDEX IF NOT EXISTS idx_jobs_fetched_at ON jobs(fetched_at);

    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      job_id TEXT,
      job_title TEXT NOT NULL,
      company TEXT NOT NULL,
      location TEXT,
      url TEXT,
      source TEXT,
      status TEXT DEFAULT 'Saved',
      notes TEXT,
      applied_at TEXT,
      follow_up_at TEXT,
      cover_letter TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

    CREATE TABLE IF NOT EXISTS user_profile (
      id TEXT PRIMARY KEY DEFAULT 'default',
      full_name TEXT,
      title TEXT,
      email TEXT,
      phone TEXT,
      location TEXT,
      linkedin_url TEXT,
      github_url TEXT,
      portfolio_url TEXT,
      skills_json TEXT,
      languages_json TEXT,
      experience_summary TEXT,
      education_summary TEXT,
      raw_cv_text TEXT,
      preferred_domains_json TEXT,
      preferred_locations_json TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS custom_providers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      type TEXT DEFAULT 'rss',
      category TEXT DEFAULT 'all',
      enabled INTEGER DEFAULT 1,
      last_status TEXT,
      last_fetched_at TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS provider_health (
      provider_name TEXT PRIMARY KEY,
      last_run_at TEXT,
      status TEXT DEFAULT 'ok',
      jobs_count INTEGER DEFAULT 0,
      latency_ms INTEGER DEFAULT 0,
      error_message TEXT
    );
  `);
}

initSchema();

module.exports = { db, DB_PATH, getDb: () => db };
