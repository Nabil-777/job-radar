const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../server');

describe('Integration: /api/ai routes', () => {
  it('POST /api/ai/pitch - generates tailored cover letter pitch for target job', async () => {
    const res = await request(app)
      .post('/api/ai/pitch')
      .send({
        jobTitle: 'Senior Cloud Engineer',
        company: 'CloudAtlas Maroc',
        location: 'Casablanca',
        language: 'English',
        customNotes: 'Passionate about Kubernetes and AWS architecture'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.coverLetter);
    assert.ok(res.body.coverLetter.includes('CloudAtlas Maroc'));
  });

  it('POST /api/ai/tailored-cv - generates ATS-optimized resume for job', async () => {
    const res = await request(app)
      .post('/api/ai/tailored-cv')
      .send({
        job: {
          title: 'Fullstack JavaScript Developer',
          company: 'Acme Software',
          location: 'Rabat, Morocco',
          description: 'Looking for a React and Node.js developer'
        },
        template: 'jake-ats',
        language: 'English'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.tailoredResumeJson);
    assert.ok(res.body.renderedHtml);
    assert.ok(res.body.atsAnalysis);
  });

  it('POST /api/ai/cover-letter - backwards compatibility endpoint generates letter', async () => {
    const res = await request(app)
      .post('/api/ai/cover-letter')
      .send({
        jobTitle: 'DevOps Intern',
        company: 'Tech Maroc',
        location: 'Rabat'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.coverLetter);
  });

  it('POST /api/ai/cover-letter - rejects missing jobTitle or company with 400', async () => {
    const res = await request(app)
      .post('/api/ai/cover-letter')
      .send({
        jobTitle: 'DevOps Intern'
        // company missing
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });
});
