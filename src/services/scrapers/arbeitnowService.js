const { BaseScraper } = require('./baseScraper');
const scraper = new BaseScraper('Arbeitnow');

async function searchArbeitnow({ keywords = '', experienceLevel = 'all', limit = 25 } = {}) {
  try {
    const data = await scraper.fetchJson('https://www.arbeitnow.com/api/job-board-api');
    const items = data?.data || [];
    const kwLower = keywords.toLowerCase().trim();
    const jobs = [];

    for (const item of items) {
      if (jobs.length >= limit) break;
      if (!item.title) continue;

      const title = item.title;
      const tags = (item.tags || []).map(t => t.toLowerCase());
      if (kwLower && !title.toLowerCase().includes(kwLower) && !tags.some(t => t.includes(kwLower))) continue;

      const job = scraper.normalize({
        id: `arbeitnow-${item.slug || Math.random().toString(36).substring(7)}`,
        title,
        company: item.company_name || 'Tech Company',
        location: item.location || (item.remote ? 'Remote' : 'Europe'),
        url: item.url,
        date: item.created_at ? item.created_at * 1000 : null,
        remote: item.remote || false,
        tags: item.tags || [],
        descriptionSnippet: item.description || ''
      });

      if (experienceLevel === 'internship' && job.experienceLevel !== 'Internship') continue;
      if (experienceLevel === 'entry' && !['Entry Level / Junior', 'Internship'].includes(job.experienceLevel)) continue;
      if (experienceLevel === 'senior' && job.experienceLevel !== 'Senior') continue;

      jobs.push(job);
    }
    return jobs;
  } catch (err) {
    return [];
  }
}

module.exports = { searchArbeitnow };
