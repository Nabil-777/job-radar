const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../server');

describe('Integration: /api/applications routes', () => {
  let createdAppId = '';

  it('GET /api/applications - returns list of applications', async () => {
    const res = await request(app).get('/api/applications');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.applications));
  });

  it('POST /api/applications - successfully creates new application', async () => {
    const newApp = {
      title: 'Fullstack Node Developer',
      company: 'AppTest Tech Corp',
      location: 'Casablanca, Morocco',
      url: 'https://example.com/apply/123',
      source: 'Direct Portal',
      status: 'Applied',
      notes: 'Sent tailored resume and cover letter'
    };

    const res = await request(app)
      .post('/api/applications')
      .send(newApp);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.application.id);
    assert.equal(res.body.application.company, 'AppTest Tech Corp');
    assert.equal(res.body.application.status, 'Applied');
    createdAppId = res.body.application.id;
  });

  it('POST /api/applications - rejects invalid application without company (400)', async () => {
    const res = await request(app)
      .post('/api/applications')
      .send({
        title: 'Developer without company'
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  it('PATCH /api/applications/:id - updates application status and notes', async () => {
    const res = await request(app)
      .patch(`/api/applications/${createdAppId}`)
      .send({
        status: 'Interview',
        notes: 'Technical screen scheduled for Thursday'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.application.status, 'Interview');
    assert.equal(res.body.application.notes, 'Technical screen scheduled for Thursday');
  });

  it('PATCH /api/applications/:id - returns 404 for non-existent application', async () => {
    const res = await request(app)
      .patch('/api/applications/non_existent_id_999999')
      .send({ status: 'Rejected' });

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });

  it('GET /api/applications/export/csv - exports applications as CSV format', async () => {
    const res = await request(app).get('/api/applications/export/csv');
    assert.equal(res.status, 200);
    assert.ok(res.headers['content-type'].includes('text/csv'));
    assert.ok(res.text.includes('Company,Job Title,Location'));
    assert.ok(res.text.includes('AppTest Tech Corp'));
  });

  it('DELETE /api/applications/:id - deletes application', async () => {
    const res = await request(app).delete(`/api/applications/${createdAppId}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  it('DELETE /api/applications/:id - returns 404 when deleting non-existent application', async () => {
    const res = await request(app).delete('/api/applications/non_existent_id_999999');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });
});
