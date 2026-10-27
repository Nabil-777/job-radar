const test = require('node:test');
const assert = require('node:assert/strict');
const { generateTailoredCV } = require('../src/services/aiService');

test('generateTailoredCV produces structured ATS CV matching target role and company', async () => {
  const job = {
    title: 'Senior React & Node Engineer',
    company: 'Fintech Casablanca',
    location: 'Casablanca, Morocco',
    experienceLevel: 'mid',
    tags: ['React', 'Node.js', 'PostgreSQL', 'Docker']
  };

  const profile = {
    full_name: 'Nabil Developer',
    title: 'Full-Stack Software Engineer',
    email: 'nabil@example.com',
    phone: '+212 612-345678',
    location: 'Rabat, Morocco',
    linkedin_url: 'https://linkedin.com/in/nabil',
    github_url: 'https://github.com/nabil',
    skills_json: JSON.stringify(['React', 'Node.js', 'PostgreSQL', 'Docker', 'Python', 'AWS']),
    education_summary: 'Master in Software Engineering'
  };

  const cv = await generateTailoredCV({ job, profile, language: 'English' });

  assert.equal(cv.success, true);
  assert.equal(cv.candidateName, 'Nabil Developer');
  assert.match(cv.targetedTitle, /Senior React & Node Engineer/i);
  assert.equal(cv.contact.email, 'nabil@example.com');
  assert.ok(cv.summary.includes('Fintech Casablanca') || cv.summary.includes('React'));
  assert.ok(Array.isArray(cv.skillsByCategory.coreStack));
  assert.ok(cv.skillsByCategory.coreStack.length > 0);
  assert.ok(cv.experience.length >= 2);
  assert.ok(cv.projects.length >= 1);
  assert.ok(cv.education.length >= 1);
  assert.ok(cv.markdown.includes('# Nabil Developer'));
  assert.ok(cv.markdown.includes('## Professional Summary'));
  assert.ok(cv.markdown.includes('## Core Competencies'));
  assert.ok(cv.markdown.includes('## Professional Experience'));
});

test('generateTailoredCV generates clean French CV for Morocco opportunities', async () => {
  const job = {
    title: 'Stagiaire Développeur Python / IA',
    company: 'Tech Innov Rabat',
    location: 'Rabat',
    experienceLevel: 'internship'
  };

  const profile = {
    full_name: 'Amine Ingénieur',
    title: 'Élève Ingénieur Informatique',
    email: 'amine@example.com',
    location: 'Casablanca, Maroc',
    skills_json: JSON.stringify(['Python', 'FastAPI', 'PyTorch', 'Git'])
  };

  const cv = await generateTailoredCV({ job, profile, language: 'French' });

  assert.equal(cv.success, true);
  assert.equal(cv.candidateName, 'Amine Ingénieur');
  assert.match(cv.summary, /Ingénieur|Développeur/i);
  assert.ok(cv.summary.includes('Tech Innov Rabat') || cv.summary.includes('Python'));
  assert.ok(cv.markdown.includes('# Amine Ingénieur'));
  assert.ok(cv.markdown.includes('## Professional Summary'));
});
