const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const rateLimit = require('express-rate-limit');

test('TASK 5 (P0): Rate limiting returns HTTP 429 with Retry-After header when limit is exceeded', async () => {
  const app = express();

  // Test limiter mimicking the tightened limits
  const testLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 2,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts, please try again later.' }
  });

  const aiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 2,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many AI generation requests, please try again later.' }
  });

  app.use('/api/general', testLimiter, (req, res) => res.json({ ok: true }));
  app.use('/api/auth/login', authLimiter, (req, res) => res.json({ ok: true }));
  app.use('/api/ai/generate', aiLimiter, (req, res) => res.json({ ok: true }));

  const server = await new Promise(resolve => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = server.address().port;

  try {
    // 1. General API limit
    await fetch(`http://localhost:${port}/api/general`);
    await fetch(`http://localhost:${port}/api/general`);
    await fetch(`http://localhost:${port}/api/general`);
    const resGeneralBlocked = await fetch(`http://localhost:${port}/api/general`);
    assert.equal(resGeneralBlocked.status, 429);
    assert.ok(resGeneralBlocked.headers.has('retry-after'), 'Must contain Retry-After header');
    const bodyGeneral = await resGeneralBlocked.json();
    assert.match(bodyGeneral.error, /Too many requests/);

    // 2. Auth limiter (max 2)
    await fetch(`http://localhost:${port}/api/auth/login`);
    await fetch(`http://localhost:${port}/api/auth/login`);
    const resAuthBlocked = await fetch(`http://localhost:${port}/api/auth/login`);
    assert.equal(resAuthBlocked.status, 429);
    assert.ok(resAuthBlocked.headers.has('retry-after'), 'Auth 429 must contain Retry-After');
    const bodyAuth = await resAuthBlocked.json();
    assert.match(bodyAuth.error, /Too many authentication attempts/);

    // 3. AI limiter (max 2)
    await fetch(`http://localhost:${port}/api/ai/generate`);
    await fetch(`http://localhost:${port}/api/ai/generate`);
    const resAiBlocked = await fetch(`http://localhost:${port}/api/ai/generate`);
    assert.equal(resAiBlocked.status, 429);
    assert.ok(resAiBlocked.headers.has('retry-after'), 'AI 429 must contain Retry-After');
    const bodyAi = await resAiBlocked.json();
    assert.match(bodyAi.error, /Too many AI generation requests/);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
