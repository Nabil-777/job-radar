const { BaseScraper } = require('./baseScraper');
const scraper = new BaseScraper('Talent.com (Maroc)');

async function searchTalentMorocco({ keywords = '', experienceLevel = 'all', limit = 20 } = {}) {
  try {
    const kw = experienceLevel === 'internship' ? (keywords ? `stage ${keywords}` : 'stage informatique') : (keywords || 'informatique');
    const $ = await scraper.fetchHtml(`https://ma.talent.com/jobs?k=${encodeURIComponent(kw)}&l=Morocco`);
    const jobs = [];
    const kwLower = keywords.toLowerCase().trim();

    $('a[aria-label*="Voir plus for"], [class*="JobCard_readMoreLink"]').each((i, el) => {
      if (jobs.length >= limit) return false;
      const aria = $(el).attr('aria-label') || '';
      const href = $(el).attr('href');
      if (!href) return;

      let title = '', company = 'Entreprise au Maroc';
      const match = aria.match(/Voir plus for (.+) at (.+)/i);
      if (match) {
        title = match[1].trim(); company = match[2].trim();
      } else {
        title = $(el).closest('[class*="JobCard"]').find('h2, [class*="title"]').text().trim();
      }
      if (!title || title === 'Voir plus') return;
      if (kwLower && !title.toLowerCase().includes(kwLower) && !company.toLowerCase().includes(kwLower)) return;

      const job = scraper.normalize({
        id: `talent-ma-${Buffer.from(href).toString('hex').slice(0, 10)}`,
        title, company, location: 'Maroc',
        url: href.startsWith('http') ? href : `https://ma.talent.com${href}`,
        remote: false,
        tags: ['talent.com', 'maroc']
      });

      if (experienceLevel === 'internship' && job.experienceLevel !== 'Internship') return;
      if (experienceLevel === 'entry' && !['Entry Level / Junior', 'Internship'].includes(job.experienceLevel)) return;
      if (experienceLevel === 'senior' && job.experienceLevel !== 'Senior') return;
      jobs.push(job);
    });
    return jobs;
  } catch (err) { return []; }
}

module.exports = { searchTalentMorocco };
