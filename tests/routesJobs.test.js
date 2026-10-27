const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../server');

describe('Integration: /api/jobs & system routes', () => {
  it('GET /api/jobs - returns job results and search stats', async () => {
    const res = await request(app).get('/api/jobs?limit=5');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.jobs));
    assert.ok(res.body.stats);
  });

  it('GET /api/jobs/search - searches jobs by keywords and location', async () => {
    const res = await request(app).get('/api/jobs/search?keywords=developer&location=Morocco&limit=5');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.jobs));
  });

  it('POST /api/jobs/refresh - triggers platform refresh sweep', async () => {
    const res = await request(app)
      .post('/api/jobs/refresh')
      .send({ domain: 'dev', keywords: 'react' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  it('GET /api/health - returns server status and health timestamp', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'healthy');
    assert.equal(res.body.database, 'connected');
  });

  it('GET /api/health/scrapers - returns circuit breaker matrix', async () => {
    const res = await request(app).get('/api/health/scrapers');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.matrix);
  });

  it('GET /api/presets - returns domain presets map', async () => {
    const res = await request(app).get('/api/presets');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.presets);
  });
});
