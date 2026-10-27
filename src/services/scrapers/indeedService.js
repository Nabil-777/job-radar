const { scrapeJobs } = require('ts-jobspy');
const { BaseScraper } = require('./baseScraper');
const scraper = new BaseScraper('Indeed');

async function searchIndeed({ keywords = 'software engineer', location = '', experienceLevel = 'all', workType = 'all', limit = 15 } = {}) {
  try {
    const isRemote = workType === 'remote' || (location && location.toLowerCase().includes('remote'));
    const jobType = experienceLevel === 'internship' ? 'internship' : (experienceLevel === 'entry' ? 'entry_level' : undefined);
    const searchTerm = keywords + (experienceLevel === 'internship' && !keywords.includes('intern') ? ' intern' : '');

    const res = await scrapeJobs({
      sites: ['indeed'],
      searchTerm,
      location: isRemote ? 'Remote' : (location === 'Worldwide' ? '' : location),
      isRemote: isRemote ? true : undefined,
      jobType,
      resultsWanted: Math.min(limit, 20),
      timeoutMs: 10000
    });

    return (res?.jobs || []).filter(j => j.title && j.jobUrl).slice(0, limit).map(item => scraper.normalize({
      id: item.id || `in-${Buffer.from(item.title + (item.company || '')).toString('hex').slice(0, 10)}`,
      title: item.title,
      company: item.company || 'Unknown Company',
      location: item.location || (isRemote ? 'Remote' : 'Location Not Specified'),
      url: item.jobUrlDirect || item.jobUrl,
      datePosted: item.datePosted || 'Recently',
      remote: isRemote || Boolean(item.location && item.location.toLowerCase().includes('remote')),
      salary: item.salary?.min ? `$${item.salary.min.toLocaleString()} - $${item.salary.max?.toLocaleString()} ${item.salary.currency || ''}` : '',
      tags: [item.site || 'indeed'],
      descriptionSnippet: item.description || ''
    }));
  } catch (err) {
    return [];
  }
}

module.exports = { searchIndeed };
