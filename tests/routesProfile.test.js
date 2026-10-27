const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../server');

describe('Integration: /api/profile routes', () => {
  it('GET /api/profile - returns current candidate profile', async () => {
    const res = await request(app).get('/api/profile');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.profile);
    assert.ok('skills' in res.body.profile);
  });

  it('POST /api/profile - updates user profile information', async () => {
    const res = await request(app)
      .post('/api/profile')
      .send({
        fullName: 'Nabil Developer',
        title: 'Senior Fullstack Engineer',
        location: 'Casablanca, Morocco',
        skills: ['Node.js', 'React', 'TypeScript', 'Docker', 'PostgreSQL'],
        educationSummary: 'Master Degree in Computer Science'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const getRes = await request(app).get('/api/profile');
    assert.equal(getRes.status, 200);
    assert.equal(getRes.body.profile.fullName, 'Nabil Developer');
    assert.equal(getRes.body.profile.title, 'Senior Fullstack Engineer');
    assert.ok(getRes.body.profile.skills.includes('TypeScript'));
  });

  it('POST /api/profile/upload-cv - returns 400 when no file is uploaded', async () => {
    const res = await request(app)
      .post('/api/profile/upload-cv');

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  it('POST /api/profile/upload-cv - rejects invalid or empty buffer', async () => {
    const res = await request(app)
      .post('/api/profile/upload-cv')
      .attach('cv', Buffer.from('fake pdf data'), 'cv.pdf');

    // Should return 422 for scanned/corrupted or 500 error handled gracefully
    assert.ok([422, 500].includes(res.status));
    assert.equal(res.body.success, false);
  });
});
