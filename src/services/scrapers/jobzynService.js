const { BaseScraper } = require('./baseScraper');
const scraper = new BaseScraper('Jobzyn (Startups Maroc)');

async function searchJobzyn({ keywords = '', experienceLevel = 'all', limit = 20 } = {}) {
  try {
    const url = `https://www.jobzyn.com/fr/jobs/maroc?pageSize=40${keywords ? `&searchQuery=${encodeURIComponent(keywords)}` : ''}`;
    const $ = await scraper.fetchHtml(url);
    const jobs = [];
    const kwLower = keywords.toLowerCase().trim();

    $('a[href*="/companies/"][href*="/jobs/"]').each((i, el) => {
      if (jobs.length >= limit) return false;
      const card = $(el);
      const link = card.attr('href');
      const title = card.find('h2').first().text().trim();
      if (!link || !title) return;

      const company = card.find('p').first().text().trim() || 'Moroccan Startup';
      if (kwLower && !title.toLowerCase().includes(kwLower) && !company.toLowerCase().includes(kwLower)) return;

      const loc = card.find('span.font-semibold:contains("Casablanca"), span.font-semibold:contains("Rabat"), span.font-semibold:contains("Maroc")').first().text().trim() || 'Morocco';
      const isRemote = card.text().toLowerCase().includes('remote') || card.text().toLowerCase().includes('télétravail');

      const job = scraper.normalize({
        id: `jobzyn-${Buffer.from(link).toString('hex').slice(0, 10)}`,
        title,
        company,
        location: loc,
        url: link.startsWith('http') ? link : `https://www.jobzyn.com${link}`,
        remote: isRemote,
        tags: ['jobzyn', 'startup', 'maroc']
      });

      if (experienceLevel === 'internship' && job.experienceLevel !== 'Internship') return;
      if (experienceLevel === 'entry' && !['Entry Level / Junior', 'Internship'].includes(job.experienceLevel)) return;
      if (experienceLevel === 'senior' && job.experienceLevel !== 'Senior') return;

      jobs.push(job);
    });
    return jobs;
  } catch (err) {
    return [];
  }
}

module.exports = { searchJobzyn };
