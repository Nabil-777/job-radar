const { BaseScraper } = require('./baseScraper');
const scraper = new BaseScraper('GitHub Tech Index');
let cache = { data: null, time: 0 };

async function searchSimplify({ keywords = '', experienceLevel = 'all', limit = 30 } = {}) {
  try {
    if (!cache.data || Date.now() - cache.time > 3600000) {
      const urls = [
        'https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/README.md',
        'https://raw.githubusercontent.com/SimplifyJobs/New-Grad-Positions/dev/README.md'
      ];
      const res = await Promise.all(urls.map(u => scraper.fetchWithRetry(u).catch(() => ({ data: '' }))));
      const jobs = [];
      res.forEach((r, idx) => {
        const $ = scraper.parseHtml(r.data);
        $('tbody tr').each((i, el) => {
          const cols = $(el).find('td');
          const title = cols.eq(1).text().trim().replace(/[🎓🔒]/g, '');
          const link = cols.eq(3).find('a').first().attr('href');
          if (!title || !link) return;
          jobs.push(scraper.normalize({
            title,
            company: cols.eq(0).text().trim().replace(/^[^\w]+/, ''),
            location: cols.eq(2).text().trim(),
            url: link,
            datePosted: cols.eq(4).text().trim(),
            remote: cols.eq(2).text().toLowerCase().includes('remote'),
            tags: ['simplify', idx === 0 ? 'internship' : 'entry']
          }));
        });
      });
      cache = { data: jobs, time: Date.now() };
    }

    const kwLower = keywords.toLowerCase().trim();
    return (cache.data || []).filter(j => {
      if (experienceLevel === 'internship' && j.experienceLevel !== 'Internship') return false;
      if (experienceLevel === 'entry' && !['Entry Level / Junior', 'Internship'].includes(j.experienceLevel)) return false;
      return !kwLower || j.title.toLowerCase().includes(kwLower) || j.company.toLowerCase().includes(kwLower);
    }).slice(0, limit);
  } catch (err) {
    return [];
  }
}

module.exports = { searchSimplify };
