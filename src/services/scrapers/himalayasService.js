const { BaseScraper } = require('./baseScraper');
const scraper = new BaseScraper('Himalayas');

async function searchHimalayas({ keywords = '', experienceLevel = 'all', limit = 25 } = {}) {
  try {
    const data = await scraper.fetchJson('https://himalayas.app/jobs/api?limit=50');
    const items = data?.jobs || [];
    const jobs = [];
    const kwLower = keywords.toLowerCase().trim();

    for (const item of items) {
      if (jobs.length >= limit) break;
      if (!item.title) continue;

      const title = item.title;
      const tags = (item.categories || []).concat(item.skills || []).map(t => t.toLowerCase());
      if (kwLower && !title.toLowerCase().includes(kwLower) && !tags.some(t => t.includes(kwLower))) continue;

      const salary = item.minSalary && item.maxSalary
        ? `$${item.minSalary.toLocaleString()} - $${item.maxSalary.toLocaleString()} ${item.currency || 'USD'}`
        : '';

      const job = scraper.normalize({
        id: `himalayas-${item.id || item.slug || Math.random().toString(36).substring(7)}`,
        title,
        company: item.companyName || 'Tech Startup',
        location: item.locationRestrictions?.length > 0 ? item.locationRestrictions.join(', ') : 'Remote (Worldwide)',
        url: item.applicationUrl || `https://himalayas.app/jobs/${item.slug}`,
        datePosted: item.publishedAt,
        logo: item.companyLogo || '',
        remote: true,
        tags: (item.skills || []).slice(0, 5),
        salary,
        descriptionSnippet: item.excerpt || ''
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

module.exports = { searchHimalayas };
