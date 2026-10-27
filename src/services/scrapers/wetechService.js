const { BaseScraper } = require('./baseScraper');
const scraper = new BaseScraper('WeTech Maroc');

async function searchWeTech({ keywords = '', experienceLevel = 'all', limit = 15 } = {}) {
  try {
    const $ = await scraper.fetchHtml('https://www.wetech.ma/offres-emploi/');
    const jobs = [];
    const kwLower = keywords.toLowerCase().trim();

    $('a[href*="/offre-emploi/"]').each((i, el) => {
      if (jobs.length >= limit) return false;
      const link = $(el).attr('href');
      const title = $(el).text().replace(/\s+/g, ' ').trim();
      if (!title || title.length < 4 || title.toLowerCase().includes('voir plus')) return;
      if (kwLower && kwLower !== 'software engineer' && !title.toLowerCase().includes(kwLower)) return;

      const slugMatch = (link || '').match(/\/offre-emploi\/([a-z0-9]+)-/i);
      const company = (slugMatch && slugMatch[1].length > 2)
        ? slugMatch[1].charAt(0).toUpperCase() + slugMatch[1].slice(1)
        : 'Entreprise Tech Maroc';

      const job = scraper.normalize({
        id: `wetech-${Buffer.from(link).toString('hex').slice(0, 10)}`,
        title,
        company,
        location: 'Maroc',
        url: link.startsWith('http') ? link : `https://www.wetech.ma${link}`,
        remote: false,
        tags: ['wetech', 'maroc', 'tech']
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

module.exports = { searchWeTech };
