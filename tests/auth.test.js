const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const { db } = require('../src/db/database');
const { signUserToken } = require('../src/middleware/auth.middleware');

test('users table exists in SQLite', () => {
  const table = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
  assert.ok(table, 'users table must exist');
});

test('bcrypt hashing and verification works', async () => {
  const password = 'SuperSecretPassword2026!';
  const hash = await bcrypt.hash(password, 10);
  assert.ok(hash.startsWith('$2'));

  const valid = await bcrypt.compare(password, hash);
  assert.equal(valid, true);

  const invalid = await bcrypt.compare('WrongPassword', hash);
  assert.equal(invalid, false);
});

test('signUserToken generates valid signed JWT', () => {
  const token = signUserToken({
    id: 'usr_test_123',
    email: 'test@example.com',
    fullName: 'Test Candidate'
  });

  assert.ok(typeof token === 'string');
  assert.equal(token.split('.').length, 3, 'JWT must have header.payload.signature format');
});

test('user registration and profile link in database', () => {
  const testEmail = `test_${Date.now()}@jobradar.local`;
  const testUserId = `usr_${Date.now()}`;
  const now = new Date().toISOString();

  // Insert user
  db.prepare(`
    INSERT INTO users (id, email, password_hash, full_name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(testUserId, testEmail, 'fake_hash', 'Test User', now, now);

  const retrieved = db.prepare('SELECT id, email, full_name FROM users WHERE id = ?').get(testUserId);
  assert.ok(retrieved);
  assert.equal(retrieved.email, testEmail);

  // Clean up test record
  db.prepare('DELETE FROM users WHERE id = ?').run(testUserId);
});
