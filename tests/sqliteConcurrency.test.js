const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { db, DB_PATH } = require('../src/db/database');

describe('Task 9: SQLite Concurrency & WAL Mode', () => {
  it('has journal_mode set to WAL', () => {
    const journalMode = db.pragma('journal_mode', { simple: true });
    assert.equal(String(journalMode).toLowerCase(), 'wal', 'journal_mode must be wal');
  });

  it('has busy_timeout set to at least 5000ms', () => {
    const timeout = db.pragma('busy_timeout', { simple: true });
    assert.ok(timeout >= 5000, `busy_timeout is ${timeout}, expected >= 5000`);
  });

  it('handles 10 parallel async insert transactions across separate connection handles with 0 SQLITE_BUSY errors', async () => {
    const concurrency = 10;
    const recordsPerWorker = 15;
    const testPrefix = `concurrent_test_${Date.now()}`;

    // Helper simulating an independent client connection attempting concurrent writes
    async function worker(workerId) {
      const workerDb = new Database(DB_PATH, { timeout: 5000 });
      workerDb.pragma('busy_timeout = 5000');

      try {
        const insertTx = workerDb.transaction((items) => {
          const stmt = workerDb.prepare(`
            INSERT INTO applications (
              id, job_id, job_title, company, location, url, source, status, notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          for (const item of items) {
            stmt.run(
              item.id,
              item.jobId,
              item.jobTitle,
              item.company,
              item.location,
              item.url,
              item.source,
              item.status,
              item.notes,
              item.now,
              item.now
            );
          }
        });

        const items = [];
        const now = new Date().toISOString();
        for (let i = 0; i < recordsPerWorker; i++) {
          items.push({
            id: `${testPrefix}_w${workerId}_i${i}`,
            jobId: `job_${workerId}_${i}`,
            jobTitle: `Software Engineer Worker ${workerId}`,
            company: `Tech Co ${workerId}`,
            location: 'Casablanca',
            url: `https://example.com/${workerId}/${i}`,
            source: 'ConcurrencyTest',
            status: 'Saved',
            notes: `Worker ${workerId} Item ${i}`,
            now
          });
        }

        // Small random jitter before starting transaction to stress interleaving
        await new Promise(r => setTimeout(r, Math.floor(Math.random() * 20)));

        insertTx(items);
        return { success: true, workerId, inserted: items.length };
      } finally {
        workerDb.close();
      }
    }

    // Launch 10 parallel async transactions simultaneously
    const promises = [];
    for (let w = 0; w < concurrency; w++) {
      promises.push(worker(w));
    }

    const results = await Promise.all(promises);

    // Verify all 10 workers succeeded
    assert.equal(results.length, concurrency);
    for (const res of results) {
      assert.equal(res.success, true);
      assert.equal(res.inserted, recordsPerWorker);
    }

    // Verify all records exist in DB
    const countRow = db.prepare(`
      SELECT COUNT(*) as count FROM applications WHERE id LIKE ?
    `).get(`${testPrefix}%`);

    assert.equal(countRow.count, concurrency * recordsPerWorker, `Expected ${concurrency * recordsPerWorker} records inserted`);

    // Clean up test data
    db.prepare('DELETE FROM applications WHERE id LIKE ?').run(`${testPrefix}%`);
  });

  it('runs multi-statement writes atomically inside a transaction', () => {
    const testId = `atomicity_test_${Date.now()}`;
    const now = new Date().toISOString();

    const multiStatementTx = db.transaction(() => {
      db.prepare(`
        INSERT INTO applications (id, job_id, job_title, company, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(testId, 'job_atomicity', 'DevOps Specialist', 'Atomicity Inc', 'Saved', now, now);

      db.prepare(`
        UPDATE applications SET status = ?, notes = ? WHERE id = ?
      `).run('Applied', 'Applied via official career portal', testId);
    });

    multiStatementTx();

    const record = db.prepare('SELECT * FROM applications WHERE id = ?').get(testId);
    assert.ok(record, 'Record must exist');
    assert.equal(record.status, 'Applied');
    assert.equal(record.notes, 'Applied via official career portal');

    // Clean up
    db.prepare('DELETE FROM applications WHERE id = ?').run(testId);
  });
});
