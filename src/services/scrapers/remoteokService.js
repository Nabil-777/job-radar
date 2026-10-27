const { BaseScraper } = require('./baseScraper');
const scraper = new BaseScraper('RemoteOK');

async function searchRemoteOK({ keywords = '', experienceLevel = 'all', limit = 25 } = {}) {
  try {
    const data = await scraper.fetchJson('https://remoteok.com/api');
    const items = Array.isArray(data) ? data.slice(1) : [];
    const jobs = [];
    const kwLower = keywords.toLowerCase().trim();

    for (const item of items) {
      if (jobs.length >= limit) break;
      if (!item.position) continue;

      const title = item.position;
      const tags = (item.tags || []).map(t => t.toLowerCase());
      if (kwLower && !title.toLowerCase().includes(kwLower) && !tags.some(t => t.includes(kwLower))) continue;

      const job = scraper.normalize({
        id: `remoteok-${item.id}`,
        title,
        company: item.company || 'Tech Company',
        location: item.location || 'Remote',
        url: item.url || `https://remoteok.com/l/${item.id}`,
        datePosted: item.date,
        logo: item.company_logo || item.logo || '',
        remote: true,
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

module.exports = { searchRemoteOK };
