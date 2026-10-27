const { BaseScraper } = require('./baseScraper');
const scraper = new BaseScraper('Relocate.me (Visa)');

async function searchRelocate({ keywords = '', experienceLevel = 'all', limit = 20 } = {}) {
  try {
    const url = `https://relocate.me/search${keywords ? `?query=${encodeURIComponent(keywords)}` : ''}`;
    const $ = await scraper.fetchHtml(url);
    const jobs = [];
    const kwLower = keywords.toLowerCase().trim();

    $('.jobs-list__job').each((i, el) => {
      if (jobs.length >= limit) return false;
      const card = $(el);
      const titleEl = card.find('.job__title a');
      const title = titleEl.text().replace(/\s+/g, ' ').trim();
      let link = titleEl.attr('href');
      if (!title || !link) return;
      if (!link.startsWith('http')) link = 'https://relocate.me' + link;

      const company = card.find('.job__company').text().replace(/\s+/g, ' ').trim() || 'Tech Company';
      if (kwLower && !title.toLowerCase().includes(kwLower) && !company.toLowerCase().includes(kwLower)) return;

      const location = card.find('.job__country').text().trim() || 'Europe (Visa Sponsored)';

      const job = scraper.normalize({
        id: `relocate-${Buffer.from(link).toString('hex').slice(0, 10)}`,
        title,
        company,
        location,
        url: link,
        remote: false,
        tags: ['visa-sponsorship', 'relocation', 'europe']
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

module.exports = { searchRelocate };
