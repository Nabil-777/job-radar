const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { generateAIPitch } = require('../src/services/aiService');
const { getCustomProviders, addCustomProvider, removeCustomProvider, toggleCustomProvider } = require('../src/services/customProvidersService');
const { broadcastJobAlert } = require('../src/services/notificationService');

describe('Task 10: AI Services & Custom Providers Unit Tests', () => {
  it('generateAIPitch creates French cover letter when French is requested', async () => {
    const pitch = await generateAIPitch({
      job: { title: 'Ingénieur DevOps', company: 'Maroc Cloud', location: 'Casablanca' },
      profile: { full_name: 'Amine Ben', title: 'Élève Ingénieur', location: 'Rabat', skills_json: '["Docker","Kubernetes"]' },
      language: 'French'
    });

    assert.equal(pitch.success, true);
    assert.ok(pitch.coverLetter.includes('Madame, Monsieur'));
    assert.ok(pitch.coverLetter.includes('Maroc Cloud'));
    assert.ok(pitch.linkedinNote);
    assert.ok(pitch.coldEmail);
    assert.ok(Array.isArray(pitch.cvTips));
  });

  it('generateAIPitch creates English cover letter with custom notes', async () => {
    const pitch = await generateAIPitch({
      job: { title: 'Backend Developer', company: 'Global Tech', location: 'Remote' },
      profile: { full_name: 'Sara Kadiri', title: 'Backend Engineer', location: 'Morocco', skills_json: '["Go","PostgreSQL"]' },
      language: 'English',
      customNotes: 'Focused on high throughput microservices'
    });

    assert.equal(pitch.success, true);
    assert.ok(pitch.coverLetter.includes('Global Tech'));
    assert.ok(pitch.coverLetter.includes('Sara Kadiri'));
    assert.ok(pitch.coverLetter.includes('Focused on high throughput microservices'));
  });

  it('customProvidersService CRUD operations', () => {
    const testProv = {
      name: 'Unit Test RSS Provider',
      url: 'https://news.ycombinator.com/jobsrss',
      type: 'rss',
      category: 'tech'
    };

    const added = addCustomProvider(testProv);
    assert.ok(added.id);
    assert.equal(added.name, testProv.name);

    const all = getCustomProviders();
    assert.ok(all.some(p => p.id === added.id));

    const toggled = toggleCustomProvider(added.id);
    assert.ok(toggled);
    assert.equal(toggled.enabled, 0);

    const deleted = removeCustomProvider(added.id);
    assert.equal(deleted, true);

    const afterDelete = getCustomProviders();
    assert.ok(!afterDelete.some(p => p.id === added.id));
  });

  it('notificationService broadcastJobAlert handles notifications gracefully', () => {
    assert.doesNotThrow(() => {
      broadcastJobAlert({
        title: 'Stage PFE IA',
        company: 'Oracle Labs',
        matchScore: 92
      });
    });
  });
});
