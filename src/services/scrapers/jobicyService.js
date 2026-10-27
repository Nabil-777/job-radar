const { BaseScraper } = require('./baseScraper');
const scraper = new BaseScraper('Jobicy');

async function searchJobicy({ keywords = '', experienceLevel = 'all', limit = 25 } = {}) {
  try {
    const data = await scraper.fetchJson('https://jobicy.com/api/v2/remote-jobs?count=50');
    const items = data?.jobs || [];
    const jobs = [];
    const kwLower = keywords.toLowerCase().trim();

    for (const item of items) {
      if (jobs.length >= limit) break;
      if (!item.jobTitle) continue;
      const title = item.jobTitle;
      const tags = `${Array.isArray(item.jobIndustries) ? item.jobIndustries.join(' ') : (item.jobIndustries || '')} ${Array.isArray(item.jobGeo) ? item.jobGeo.join(' ') : (item.jobGeo || '')}`.toLowerCase();
      if (kwLower && !title.toLowerCase().includes(kwLower) && !tags.includes(kwLower)) continue;

      const salary = item.annualSalaryMin ? `$${item.annualSalaryMin.toLocaleString()} - $${item.annualSalaryMax?.toLocaleString()} ${item.salaryCurrency || ''}` : '';
      const job = scraper.normalize({
        id: `jobicy-${item.id}`,
        title,
        company: item.companyName || 'Tech Company',
        location: item.jobGeo || 'Remote (Worldwide)',
        url: item.url,
        datePosted: item.pubDate,
        logo: item.companyLogo || '',
        remote: true,
        tags: [item.jobType || 'Remote'],
        salary,
        descriptionSnippet: item.jobExcerpt || ''
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

module.exports = { searchJobicy };
