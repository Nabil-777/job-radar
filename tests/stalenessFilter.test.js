const test = require('node:test');
const assert = require('node:assert/strict');
const { shouldIngest } = require('../src/utils/parsePostedDate');

function expect(actual) {
  return {
    toBe(expected) {
      assert.equal(actual, expected);
    }
  };
}

test('drops jobs older than MAX_AGE_DAYS', () => {
  const old = { postedAt: new Date(Date.now() - 200 * 86400e3) };
  expect(shouldIngest(old)).toBe(false);
});

test('drops jobs with null postedAt', () => {
  expect(shouldIngest({ postedAt: null })).toBe(false);
});

test('accepts jobs within default 90 days', () => {
  const fresh = { postedAt: new Date(Date.now() - 5 * 86400e3) };
  expect(shouldIngest(fresh)).toBe(true);

  const edge = { postedAt: new Date(Date.now() - 85 * 86400e3) };
  expect(shouldIngest(edge)).toBe(true);
});

test('handles ISO date strings as postedAt', () => {
  const recentIso = new Date(Date.now() - 3 * 86400e3).toISOString();
  expect(shouldIngest({ postedAt: recentIso })).toBe(true);

  const ancientIso = new Date(Date.now() - 150 * 86400e3).toISOString();
  expect(shouldIngest({ postedAt: ancientIso })).toBe(false);
});
