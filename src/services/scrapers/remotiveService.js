const { BaseScraper } = require('./baseScraper');
const scraper = new BaseScraper('Remotive');

async function searchRemotive({ keywords = '', category = '', experienceLevel = 'all', limit = 30 } = {}) {
  try {
    const params = new URLSearchParams();
    if (keywords) params.append('search', keywords);
    if (category) params.append('category', category);
    const qs = params.toString();
    const data = await scraper.fetchJson(`https://remotive.com/api/remote-jobs${qs ? '?' + qs : ''}`);
    const rawJobs = data?.jobs || [];
    const jobs = [];

    for (const j of rawJobs) {
      if (jobs.length >= limit) break;
      if (!j.title) continue;

      const job = scraper.normalize({
        id: `remotive-${j.id}`,
        title: j.title,
        company: j.company_name || 'Tech Company',
        location: j.candidate_required_location || 'Remote (Worldwide)',
        url: j.url,
        datePosted: j.publication_date,
        logo: j.company_logo || '',
        remote: true,
        tags: j.tags || [],
        salary: j.salary || '',
        descriptionSnippet: j.description || ''
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

module.exports = { searchRemotive };
