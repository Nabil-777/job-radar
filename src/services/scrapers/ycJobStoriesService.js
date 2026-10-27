const { BaseScraper } = require('./baseScraper');
const scraper = new BaseScraper('Y Combinator (YC)');

async function searchYCJobs({ keywords = '', experienceLevel = 'all', limit = 15 } = {}) {
  try {
    const ids = await scraper.fetchJson('https://hacker-news.firebaseio.com/v0/jobstories.json');
    const items = await Promise.all(
      (ids || []).slice(0, 20).map(id => scraper.fetchJson(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).catch(() => null))
    );

    const jobs = [];
    const kwLower = keywords.toLowerCase().trim();
    for (const item of items) {
      if (!item?.title || jobs.length >= limit) continue;
      const title = item.title;
      if (kwLower && !title.toLowerCase().includes(kwLower)) continue;

      const job = scraper.normalize({
        id: `yc-${item.id}`,
        title,
        company: 'Y Combinator Startup',
        location: title.toLowerCase().includes('remote') ? 'Remote (Worldwide)' : 'US / Remote',
        url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
        date: item.time ? item.time * 1000 : null,
        remote: title.toLowerCase().includes('remote'),
        tags: ['y-combinator', 'startup']
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

module.exports = { searchYCJobs };
