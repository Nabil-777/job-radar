const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../server');
const { parsePostedDate, shouldIngest, formatPostedDateLabel, isFreshPosting } = require('../src/utils/parsePostedDate');

describe('Integration: Job Date Accuracy & Filtering', () => {
  it('GET /api/jobs returns jobs with parsed date fields (postedAt, postedAtLabel, dateStatus, isFresh)', async () => {
    const res = await request(app).get('/api/jobs?limit=5');
    assert.equal(res.status, 200);
    assert.ok(res.body.success);
    assert.ok(Array.isArray(res.body.jobs));

    if (res.body.jobs.length > 0) {
      const job = res.body.jobs[0];
      assert.ok('postedAt' in job, 'Must have postedAt property');
      assert.ok('postedAtLabel' in job, 'Must have postedAtLabel property');
      assert.ok('dateStatus' in job, 'Must have dateStatus property');
      assert.ok('isFresh' in job, 'Must have isFresh property');
      assert.ok(['parsed', 'inferred', 'unknown'].includes(job.dateStatus));
    }
  });

  it('GET /api/jobs?maxAgeDays=7 filters opportunities to last 7 days', async () => {
    const res = await request(app).get('/api/jobs?maxAgeDays=7&limit=10');
    assert.equal(res.status, 200);
    assert.ok(res.body.success);

    const now = Date.now();
    const cutoff = now - 7 * 86400e3;

    for (const job of res.body.jobs) {
      if (job.postedAt) {
        const time = new Date(job.postedAt).getTime();
        assert.ok(time >= cutoff, `Job ${job.id} postedAt ${job.postedAt} must be >= cutoff`);
      }
    }
  });

  it('GET /api/jobs?postedAfter=2026-10-01 filters jobs on or after specified date', async () => {
    const afterDate = '2026-10-01T00:00:00.000Z';
    const res = await request(app).get(`/api/jobs?postedAfter=${encodeURIComponent(afterDate)}&limit=10`);
    assert.equal(res.status, 200);
    assert.ok(res.body.success);

    const afterTime = new Date(afterDate).getTime();
    for (const job of res.body.jobs) {
      if (job.postedAt) {
        assert.ok(new Date(job.postedAt).getTime() >= afterTime);
      }
    }
  });

  it('GET /api/jobs?dateStatus=unknown filters jobs with unresolved dates', async () => {
    const res = await request(app).get('/api/jobs?dateStatus=unknown&limit=10');
    assert.equal(res.status, 200);
    assert.ok(res.body.success);

    for (const job of res.body.jobs) {
      assert.equal(job.dateStatus, 'unknown');
    }
  });

  it('shouldIngest drops 4-year-old job from Rekrute/scrapers', () => {
    const ancientDate = parsePostedDate('20/10/2022');
    assert.ok(ancientDate instanceof Date);
    assert.equal(ancientDate.getFullYear(), 2022);

    const staleJob = {
      title: 'Stage PFE 2022',
      company: 'Old Bank',
      postedAt: ancientDate
    };

    assert.equal(shouldIngest(staleJob), false, 'Must drop 4-year-old job at ingestion');
  });
});
