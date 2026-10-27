const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const cors = require('cors');

test('TASK 2 (P0): CORS restricts unlisted origins and allows configured origins', async () => {
  const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:4000').split(',').map(s => s.trim());
  const app = express();

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  }));

  app.use((err, req, res, next) => {
    if (err.message === 'Not allowed by CORS') {
      return res.status(403).json({ success: false, error: 'Not allowed by CORS' });
    }
    next(err);
  });

  app.get('/api/test-cors', (req, res) => res.json({ success: true }));

  const server = await new Promise(resolve => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = server.address().port;

  try {
    // 1. Allowed origin http://localhost:4000 succeeds
    const resAllowed = await fetch(`http://localhost:${port}/api/test-cors`, {
      headers: { Origin: 'http://localhost:4000' }
    });
    assert.equal(resAllowed.status, 200);
    assert.equal(resAllowed.headers.get('access-control-allow-origin'), 'http://localhost:4000');
    assert.equal(resAllowed.headers.get('access-control-allow-credentials'), 'true');

    // 2. Unlisted origin http://unauthorized-attacker.com is rejected
    const resUnlisted = await fetch(`http://localhost:${port}/api/test-cors`, {
      headers: { Origin: 'http://unauthorized-attacker.com' }
    });
    assert.equal(resUnlisted.status, 403);
    assert.equal(resUnlisted.headers.get('access-control-allow-origin'), null);

    // 3. Preflight OPTIONS from unlisted origin is rejected
    const resPreflightUnlisted = await fetch(`http://localhost:${port}/api/test-cors`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://unauthorized-attacker.com',
        'Access-Control-Request-Method': 'POST'
      }
    });
    assert.equal(resPreflightUnlisted.status, 403);
    assert.equal(resPreflightUnlisted.headers.get('access-control-allow-origin'), null);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
