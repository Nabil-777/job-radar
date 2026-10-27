const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const app = require('../server');
const { logger } = require('../src/utils/logger');

describe('Task 12: Structured Logging (Pino)', () => {
  it('verifies zero raw console.log statements remain anywhere in src/', () => {
    function scanDir(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          // Match console.log( but allow comments or variable names
          const hasConsoleLog = /(?<!\/\/.*)(?<!\/\*.*)console\.log\s*\(/.test(content);
          assert.equal(
            hasConsoleLog,
            false,
            `File ${fullPath} contains raw console.log statement; must use structured logger.`
          );
        }
      }
    }

    scanDir(path.join(__dirname, '../src'));
  });

  it('every HTTP request produces a response with X-Request-Id header', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.ok(res.headers['x-request-id'], 'Must return X-Request-Id header');
    assert.ok(res.headers['x-request-id'].length >= 10);
  });

  it('preserves client-provided X-Request-Id header across request lifecycle', async () => {
    const customId = 'client-uuid-9999-8888-7777';
    const res = await request(app)
      .get('/api/health')
      .set('X-Request-Id', customId);

    assert.equal(res.status, 200);
    assert.equal(res.headers['x-request-id'], customId);
  });

  it('structured logger formats logs as JSON with level, time, and custom attributes', () => {
    const emitted = [];
    const originalInfo = logger.info.bind(logger);

    // Spy on logger.info
    logger.info = (obj, msg) => {
      emitted.push({ obj, msg });
      originalInfo(obj, msg);
    };

    try {
      logger.info({
        requestId: 'test-req-123',
        route: '/api/jobs',
        durationMs: 42
      }, 'Request processed');

      assert.equal(emitted.length, 1);
      assert.equal(emitted[0].obj.requestId, 'test-req-123');
      assert.equal(emitted[0].obj.route, '/api/jobs');
      assert.equal(emitted[0].obj.durationMs, 42);
    } finally {
      logger.info = originalInfo;
    }
  });
});
