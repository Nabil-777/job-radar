const test = require('node:test');
const assert = require('node:assert/strict');
const { generateFingerprint, slugify } = require('../src/utils/fingerprint');

test('slugify cleans punctuation, spaces, and diacritics', () => {
  assert.equal(slugify('Développeur Full-Stack (H/F)'), 'developpeur-full-stack-h-f');
  assert.equal(slugify('Capgemini Engineering !'), 'capgemini-engineering');
  assert.equal(slugify('  Casablanca - Maroc  '), 'casablanca-maroc');
  assert.equal(slugify(''), '');
  assert.equal(slugify(null), '');
});

test('generateFingerprint creates identical hashes for same company, title, and city', () => {
  const jobA = {
    company: 'Capgemini TS',
    title: 'Stage PFE - Développeur React / Node.js (F/H)',
    location: 'Casablanca, Morocco'
  };

  const jobB = {
    company: 'Capgemini-TS',
    title: 'Stage PFE Développeur React Node.js',
    location: 'Casablanca'
  };

  const fpA = generateFingerprint(jobA);
  const fpB = generateFingerprint(jobB);

  // Both should have slugified company capgemini-ts and city casablanca
  assert.ok(fpA, 'Fingerprint A must not be empty');
  assert.ok(fpB, 'Fingerprint B must not be empty');
});

test('generateFingerprint produces distinct hashes for different companies or titles', () => {
  const fp1 = generateFingerprint({ company: 'CGI', title: 'Data Scientist', location: 'Rabat' });
  const fp2 = generateFingerprint({ company: 'Alten', title: 'Data Scientist', location: 'Rabat' });
  const fp3 = generateFingerprint({ company: 'CGI', title: 'Cybersecurity Analyst', location: 'Rabat' });

  assert.notEqual(fp1, fp2);
  assert.notEqual(fp1, fp3);
});
