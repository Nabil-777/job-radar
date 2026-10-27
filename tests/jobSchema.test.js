const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { BaseScraper, createJob, detectExperienceLevel } = require('../src/services/scrapers/baseScraper');
const { StandardJobSchema } = require('../src/schemas/job.schema');

describe('Task 8: BaseScraper & Standard Job Schema', () => {
  it('creates normalized job matching StandardJobSchema', () => {
    const raw = {
      title: 'Fullstack Engineer',
      company: 'Acme Corp',
      location: 'Casablanca, Morocco',
      url: 'https://example.com/job/1',
      datePosted: '2026-10-27',
      tags: ['nodejs', 'react'],
      description: 'Looking for a talented fullstack developer.'
    };

    const job = createJob(raw);
    const parsed = StandardJobSchema.safeParse(job);

    assert.equal(parsed.success, true, `Validation error: ${JSON.stringify(parsed.error?.issues)}`);
    assert.equal(job.company, 'Acme Corp');
    assert.equal(job.title, 'Fullstack Engineer');
    assert.equal(job.remote, false);
    assert.equal(job.isRemote, false);
    assert.ok(job.fingerprint.length > 0);
    assert.ok(job.id.length > 0);
  });

  it('correctly detects experience levels', () => {
    assert.equal(detectExperienceLevel('Stage PFE Cloud & DevOps', []), 'Internship');
    assert.equal(detectExperienceLevel('Junior Python Developer', []), 'Entry Level / Junior');
    assert.equal(detectExperienceLevel('Senior Staff Architect', []), 'Senior');
    assert.equal(detectExperienceLevel('Fullstack Software Engineer', []), 'Entry / Mid');
  });

  it('BaseScraper instances normalize job outputs matching StandardJobSchema', () => {
    const scraper = new BaseScraper('TestPlatform');
    const job = scraper.normalize({
      title: 'Junior React Dev',
      company: 'Tech Co',
      location: 'Remote',
      url: 'https://example.com/job/2'
    });

    const parsed = StandardJobSchema.safeParse(job);
    assert.equal(parsed.success, true);
    assert.equal(job.source, 'TestPlatform');
    assert.equal(job.remote, true);
    assert.equal(job.isRemote, true);
    assert.equal(job.experienceLevel, 'Entry Level / Junior');
  });

  it('verifies all 19 scraper modules are under 50 lines and use BaseScraper', () => {
    const scrapersDir = path.join(__dirname, '../src/services/scrapers');
    const files = fs.readdirSync(scrapersDir).filter(f => f.endsWith('.js') && f !== 'baseScraper.js');

    assert.ok(files.length >= 12, `Expected at least 12 scrapers, found ${files.length}`);

    for (const file of files) {
      const filePath = path.join(scrapersDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const lineCount = content.split('\n').length;

      assert.ok(
        lineCount <= 50,
        `Scraper ${file} has ${lineCount} lines (expected <= 50 lines)`
      );

      assert.ok(
        content.includes('BaseScraper') || content.includes('createJob'),
        `Scraper ${file} must use BaseScraper or createJob`
      );

      // Verify no duplicated user-agent strings
      assert.ok(
        !content.includes('Mozilla/5.0'),
        `Scraper ${file} contains hardcoded User-Agent string; should rely on BaseScraper`
      );
    }
  });
});
