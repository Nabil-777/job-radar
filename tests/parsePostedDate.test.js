const test = require('node:test');
const assert = require('node:assert/strict');
const { parsePostedDate, formatPostedDateLabel, isFreshPosting } = require('../src/utils/parsePostedDate');

function expect(actual) {
  return {
    toBeNull() {
      assert.equal(actual, null);
    },
    not: {
      toBeNull() {
        assert.notEqual(actual, null);
      }
    },
    toBe(expected) {
      assert.equal(actual, expected);
    }
  };
}

test('returns null for garbage', () => {
  expect(parsePostedDate('')).toBeNull();
  expect(parsePostedDate('not a date')).toBeNull();
  expect(parsePostedDate(undefined)).toBeNull();
  expect(parsePostedDate(null)).toBeNull();
  expect(parsePostedDate('NaN')).toBeNull();
});

test('parses relative EN and FR', () => {
  const now = Date.parse('2026-10-27T00:00:00Z');
  expect(parsePostedDate('3 days ago', now).toISOString()).toBe('2026-10-24T00:00:00.000Z');
  expect(parsePostedDate('il y a 2 jours', now).toISOString()).toBe('2026-10-25T00:00:00.000Z');
  expect(parsePostedDate('2 hours ago', now).toISOString()).toBe('2026-10-26T22:00:00.000Z');
  expect(parsePostedDate('il y a 3 heures', now).toISOString()).toBe('2026-10-26T21:00:00.000Z');
  expect(parsePostedDate('today', now).toISOString()).toBe('2026-10-27T00:00:00.000Z');
  expect(parsePostedDate("aujourd'hui", now).toISOString()).toBe('2026-10-27T00:00:00.000Z');
  expect(parsePostedDate('yesterday', now).toISOString()).toBe('2026-10-26T00:00:00.000Z');
  expect(parsePostedDate('hier', now).toISOString()).toBe('2026-10-26T00:00:00.000Z');
});

test('rejects 4-year-old as valid only if truly parsed', () => {
  const d = parsePostedDate('Oct 20, 2022');
  expect(d).not.toBeNull();
  // but staleness filter would reject it downstream
  assert.equal(d.getFullYear(), 2022);
});

test('rejects future dates', () => {
  expect(parsePostedDate('2099-01-01')).toBeNull();
});

test('parses unix timestamps in seconds and milliseconds', () => {
  const tsSec = 1730000000;
  const parsedSec = parsePostedDate(tsSec);
  assert.ok(parsedSec instanceof Date);
  assert.equal(parsedSec.getTime(), tsSec * 1000);

  const tsMs = 1730000000000;
  const parsedMs = parsePostedDate(tsMs);
  assert.ok(parsedMs instanceof Date);
  assert.equal(parsedMs.getTime(), tsMs);
});

test('parses European date formats (DD/MM/YYYY)', () => {
  const parsed = parsePostedDate('20/10/2022');
  assert.ok(parsed instanceof Date);
  assert.equal(parsed.getUTCFullYear(), 2022);
  assert.equal(parsed.getUTCMonth(), 9); // October = 9
  assert.equal(parsed.getUTCDate(), 20);
});

test('formatPostedDateLabel provides human friendly labels', () => {
  const now = Date.parse('2026-10-27T12:00:00Z');
  assert.equal(formatPostedDateLabel(new Date(now - 3600e3), now), '1h ago');
  assert.equal(formatPostedDateLabel(new Date(now - 2 * 86400e3), now), '2 days ago');
  assert.equal(formatPostedDateLabel(new Date(now - 86400e3), now), 'Yesterday');
  assert.equal(formatPostedDateLabel(null), 'Date unknown');
});

test('isFreshPosting detects postings under 7 days', () => {
  const now = Date.parse('2026-10-27T12:00:00Z');
  assert.equal(isFreshPosting(new Date(now - 2 * 86400e3), now), true);
  assert.equal(isFreshPosting(new Date(now - 10 * 86400e3), now), false);
  assert.equal(isFreshPosting(null, now), false);
});
