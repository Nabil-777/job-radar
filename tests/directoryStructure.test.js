const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('TASK 6 (P1): Directory consolidation - services exists only in src/ and not at root', () => {
  const rootDir = path.resolve(__dirname, '..');
  const rootServices = path.join(rootDir, 'services');
  const srcServices = path.join(rootDir, 'src', 'services');
  const scrapersDir = path.join(srcServices, 'scrapers');

  assert.equal(fs.existsSync(rootServices), false, 'Legacy root services/ directory must be deleted');
  assert.equal(fs.existsSync(srcServices), true, 'Canonical src/services/ must exist');
  assert.equal(fs.existsSync(scrapersDir), true, 'src/services/scrapers/ must exist');
  assert.equal(fs.existsSync(path.join(srcServices, 'aggregator.js')), true, 'aggregator.js must exist in src/services/');

  const { searchJobs, DOMAIN_PRESETS } = require('../src/services/aggregator');
  assert.equal(typeof searchJobs, 'function');
  assert.equal(typeof DOMAIN_PRESETS, 'object');
  assert.ok(DOMAIN_PRESETS !== null);
});
