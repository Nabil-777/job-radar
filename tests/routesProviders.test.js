const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../server');

describe('Integration: /api/providers routes', () => {
  let testProviderId = '';

  it('GET /api/providers - returns list of custom providers', async () => {
    const res = await request(app).get('/api/providers');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.providers));
  });

  it('POST /api/providers - adds a new custom RSS provider', async () => {
    const res = await request(app)
      .post('/api/providers')
      .send({
        name: 'Custom Tech Feeds',
        url: 'https://example.com/rss/jobs.xml',
        type: 'rss',
        category: 'tech'
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.provider.id);
    assert.equal(res.body.provider.name, 'Custom Tech Feeds');
    testProviderId = res.body.provider.id;
  });

  it('POST /api/providers - rejects invalid URL with 400', async () => {
    const res = await request(app)
      .post('/api/providers')
      .send({
        name: 'Bad Provider',
        url: 'not-a-valid-url'
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  it('PATCH /api/providers/:id/toggle - toggles provider enabled state', async () => {
    const res = await request(app)
      .patch(`/api/providers/${testProviderId}/toggle`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.provider.enabled, 0);
  });

  it('PATCH /api/providers/:id/toggle - returns 404 for invalid id', async () => {
    const res = await request(app)
      .patch('/api/providers/prov_fake_99999/toggle');

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });

  it('GET /api/providers/health - returns observability summary of provider health', async () => {
    const res = await request(app).get('/api/providers/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.health);
    assert.ok(typeof res.body.health.healthyCount === 'number');
  });

  it('DELETE /api/providers/:id - removes custom provider', async () => {
    const res = await request(app).delete(`/api/providers/${testProviderId}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  it('DELETE /api/providers/:id - returns 404 for non-existent provider', async () => {
    const res = await request(app).delete('/api/providers/prov_fake_99999');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });
});
