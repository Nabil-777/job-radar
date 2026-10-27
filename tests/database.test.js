const test = require('node:test');
const assert = require('node:assert/strict');
const { db } = require('../src/db/database');

test('database schema tables exist and queryable', () => {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);

  assert.ok(tables.includes('jobs'), 'jobs table must exist');
  assert.ok(tables.includes('applications'), 'applications table must exist');
  assert.ok(tables.includes('user_profile'), 'user_profile table must exist');
  assert.ok(tables.includes('custom_providers'), 'custom_providers table must exist');
  assert.ok(tables.includes('provider_health'), 'provider_health table must exist');
});

test('applications CRUD operations work seamlessly with Kanban stages', () => {
  const testId = 'test-app-' + Date.now();

  // Create
  db.prepare(`
    INSERT INTO applications (id, job_title, company, status, location, url, applied_at, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(testId, 'Test Fullstack Engineer', 'JobRadar Labs', 'Saved', 'Casablanca', 'https://example.com/test', new Date().toISOString(), 'Test note');

  // Read
  const created = db.prepare('SELECT * FROM applications WHERE id = ?').get(testId);
  assert.ok(created);
  assert.equal(created.company, 'JobRadar Labs');
  assert.equal(created.status, 'Saved');

  // Update status (e.g. Moved to Technical_Test)
  db.prepare('UPDATE applications SET status = ? WHERE id = ?').run('Technical_Test', testId);
  const updated = db.prepare('SELECT * FROM applications WHERE id = ?').get(testId);
  assert.equal(updated.status, 'Technical_Test');

  // Delete
  db.prepare('DELETE FROM applications WHERE id = ?').run(testId);
  const deleted = db.prepare('SELECT * FROM applications WHERE id = ?').get(testId);
  assert.equal(deleted, undefined);
});

test('user_profile default record exists and preserves skills', () => {
  const profile = db.prepare('SELECT * FROM user_profile WHERE id = ?').get('default');
  assert.ok(profile, 'Default user profile should exist');
  assert.ok(profile.skills_json, 'Profile should have skills JSON');
});
