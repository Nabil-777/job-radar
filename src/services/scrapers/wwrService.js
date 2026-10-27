const { BaseScraper } = require('./baseScraper');
const scraper = new BaseScraper('WeWorkRemotely');
const FEEDS = [
  'https://weworkremotely.com/categories/remote-programming-jobs.rss',
  'https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss'
];

async function searchWeWorkRemotely({ keywords = '', experienceLevel = 'all', limit = 20 } = {}) {
  const jobs = [];
  const kwLower = keywords.toLowerCase().trim();

  for (const feedUrl of FEEDS) {
    if (jobs.length >= limit) break;
    try {
      const res = await scraper.fetchWithRetry(feedUrl, { responseType: 'text' });
      const $ = scraper.parseHtml(res.data);

      $('item').each((_, el) => {
        if (jobs.length >= limit) return false;
        const item = $(el);
        const rawTitle = item.find('title').text().trim();
        const parts = rawTitle.includes(':') ? rawTitle.split(':') : [null, rawTitle];
        const company = parts[0] ? parts[0].trim() : 'Remote Tech';
        const title = (parts[1] || rawTitle).trim();
        const link = item.find('link').text().trim();
        const desc = item.find('description').text().trim();
        if (kwLower && !`${title} ${company} ${desc}`.toLowerCase().includes(kwLower)) return;

        const job = scraper.normalize({
          title, company, location: 'Remote (Worldwide)',
          url: link, datePosted: item.find('pubDate').text().trim(),
          remote: true, tags: ['remote', 'wwr'], descriptionSnippet: desc
        });

        if (experienceLevel === 'internship' && job.experienceLevel !== 'Internship') return;
        if (experienceLevel === 'entry' && !['Entry Level / Junior', 'Internship'].includes(job.experienceLevel)) return;
        if (experienceLevel === 'senior' && job.experienceLevel !== 'Senior') return;
        jobs.push(job);
      });
    } catch (err) {}
  }
  return jobs;
}

module.exports = { searchWeWorkRemotely };
