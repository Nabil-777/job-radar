const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { requestIdMiddleware, errorHandler } = require('../src/middleware/error.middleware');

test('TASK 4 (P0): In production, 5xx errors return sanitized error message with requestId', async () => {
  const origEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';

  const loggedErrors = [];
  const origConsoleError = console.error;
  console.error = (...args) => {
    loggedErrors.push(args.join(' '));
  };

  const app = express();
  app.use(requestIdMiddleware);

  // Forced 500 route
  app.get('/api/forced-500', (req, res, next) => {
    const err = new Error('Sensitive database connection string leaked: postgres://user:secret@db.internal:5432/prod');
    next(err);
  });

  // Client 400 route
  app.get('/api/client-400', (req, res, next) => {
    const err = new Error('Invalid email parameter format');
    err.status = 400;
    next(err);
  });

  app.use(errorHandler);

  const server = await new Promise(resolve => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = server.address().port;

  try {
    // 1. Test 500 in production
    const res500 = await fetch(`http://localhost:${port}/api/forced-500`);
    assert.equal(res500.status, 500);

    const body500 = await res500.json();
    assert.equal(body500.error, 'Internal server error');
    assert.ok(typeof body500.requestId === 'string' && body500.requestId.length > 0);
    assert.equal(Object.keys(body500).sort().join(','), 'error,requestId', 'Response must only contain error and requestId');

    // Verify stack was logged server-side
    assert.ok(loggedErrors.some(log => log.includes('Sensitive database connection string leaked')), 'Full error stack must be logged server-side');
    assert.ok(loggedErrors.some(log => log.includes(body500.requestId)), 'Logged error must contain request ID');

    // 2. Test 400 client error preserves validation message
    const res400 = await fetch(`http://localhost:${port}/api/client-400`);
    assert.equal(res400.status, 400);

    const body400 = await res400.json();
    assert.equal(body400.error, 'Invalid email parameter format');
    assert.ok(typeof body400.requestId === 'string');
  } finally {
    console.error = origConsoleError;
    process.env.NODE_ENV = origEnv;
    await new Promise(resolve => server.close(resolve));
  }
});
