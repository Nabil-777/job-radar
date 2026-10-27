const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateMatchScore, extractSkillsFromText } = require('../src/services/matchingEngine');

test('extractSkillsFromText identifies common programming languages and technologies', () => {
  const text = 'Looking for a Junior Software Engineer with React, Python, Docker, and PostgreSQL experience.';
  const skills = extractSkillsFromText(text);

  assert.ok(skills.includes('react'));
  assert.ok(skills.includes('python'));
  assert.ok(skills.includes('docker'));
  assert.ok(skills.includes('postgresql'));
  assert.ok(!skills.includes('ruby'));
});

test('calculateMatchScore returns baseline 50% when no profile is provided', () => {
  const result = calculateMatchScore({ title: 'Full Stack Dev' }, null);
  assert.equal(result.matchScore, 50);
});

test('calculateMatchScore yields high score for well-aligned candidate skills', () => {
  const profile = {
    skills_json: '["Python", "FastAPI", "Docker", "PostgreSQL", "React"]',
    location: 'Morocco'
  };

  const job = {
    title: 'Python / React Developer Intern',
    description: 'Build backend APIs with Python and FastAPI, frontend with React, dockerized.',
    experienceLevel: 'internship',
    location: 'Casablanca, Morocco',
    tags: ['python', 'react', 'docker']
  };

  const match = calculateMatchScore(job, profile);
  assert.ok(match.matchScore >= 75, `Expected score >= 75, got ${match.matchScore}`);
  assert.ok(match.matchedSkills.length >= 2, 'Expected at least 2 matched skills');
});

test('calculateMatchScore lowers score when key required skills are missing', () => {
  const profile = {
    skills_json: '["Ruby", "Rails"]',
    location: 'France'
  };

  const job = {
    title: 'Cybersecurity Analyst - SOC & SIEM',
    description: 'Requires Wireshark, Splunk, SIEM, and ISO 27001 knowledge.',
    experienceLevel: 'senior',
    location: 'Morocco',
    tags: ['cybersecurity', 'soc', 'siem', 'wireshark']
  };

  const match = calculateMatchScore(job, profile);
  assert.ok(match.matchScore < 50, `Expected low match score, got ${match.matchScore}`);
  assert.ok(match.missingSkills.includes('cybersecurity') || match.missingSkills.includes('wireshark'));
});
