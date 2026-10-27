const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const helmet = require('helmet');

test('TASK 3 (P0): Content Security Policy is enabled with appropriate directives', async () => {
  const app = express();

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://unpkg.com"],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"]
      }
    },
    crossOriginEmbedderPolicy: false
  }));

  app.get('/', (req, res) => res.send('<!DOCTYPE html><html><body>JobRadar</body></html>'));

  const server = await new Promise(resolve => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/`);
    assert.equal(res.status, 200);

    const cspHeader = res.headers.get('content-security-policy');
    assert.ok(cspHeader, 'Content-Security-Policy header must be present');
    assert.ok(cspHeader.includes("default-src 'self'"), 'CSP must include default-src self');
    assert.ok(cspHeader.includes('https://cdn.tailwindcss.com'), 'CSP must allow Tailwind CDN');
    assert.ok(cspHeader.includes('https://unpkg.com'), 'CSP must allow Lucide unpkg');
    assert.ok(cspHeader.includes('https://fonts.googleapis.com'), 'CSP must allow Google Fonts style');
    assert.ok(cspHeader.includes('https://fonts.gstatic.com'), 'CSP must allow Google Fonts fonts');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
