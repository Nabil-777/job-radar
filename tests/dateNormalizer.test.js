const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeDate } = require('../src/utils/dateNormalizer');

test('normalizeDate returns current or near-current ISO string for null/empty', () => {
  const result = normalizeDate(null);
  assert.ok(result.includes('T'), 'Should be ISO format');
});

test('normalizeDate handles French relative words (Aujourd\'hui, Hier)', () => {
  const today = normalizeDate("Aujourd'hui");
  const hier = normalizeDate("Hier");

  assert.ok(today.includes('T'));
  assert.ok(hier.includes('T'));
  assert.ok(new Date(today).getTime() >= new Date(hier).getTime());
});

test('normalizeDate parses "3 days ago" and "il y a 2 heures"', () => {
  const pastDays = normalizeDate("3 days ago");
  const pastHours = normalizeDate("il y a 2 heures");

  assert.ok(pastDays.includes('T'));
  assert.ok(pastHours.includes('T'));
  assert.ok(new Date(pastHours).getTime() > new Date(pastDays).getTime());
});

test('normalizeDate preserves valid ISO dates', () => {
  const iso = '2026-10-25T14:30:00.000Z';
  assert.equal(normalizeDate(iso), iso);
});
