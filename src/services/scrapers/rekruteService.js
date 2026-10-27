const { BaseScraper } = require('./baseScraper');
const scraper = new BaseScraper('Rekrute');

async function searchRekrute({ keywords = 'informatique', experienceLevel = 'all', limit = 15 } = {}) {
  try {
    let kw = (keywords || '').trim();
    if (experienceLevel === 'internship') kw = kw ? `stage ${kw}` : 'stage';
    else if (!kw) kw = 'informatique';

    const $ = await scraper.fetchHtml(`https://www.rekrute.com/offres.html?s=1&p=1&o=1&keyword=${encodeURIComponent(kw)}`);
    const jobs = [];

    $('.post-id').each((i, el) => {
      if (jobs.length >= limit) return false;
      const card = $(el);
      const titleEl = card.find('.titreJob');
      const title = titleEl.text().trim();
      let link = titleEl.attr('href');
      if (!title || !link) return;
      if (!link.startsWith('http')) link = 'https://www.rekrute.com' + link;

      const company = card.find('.info ul li a').first().text().trim() || 'Entreprise Confidentielle (Maroc)';
      const location = card.find('.info ul li:contains("Région")').text().replace('Région :', '').trim() ||
                       card.find('.info ul li:contains("Ville")').text().replace('Ville :', '').trim() || 'Casablanca / Maroc';

      const job = scraper.normalize({
        id: `rekrute-${card.attr('id') || Math.random().toString(36).slice(2, 8)}`,
        title, company, location, url: link,
        datePosted: card.find('.date').text().trim(),
        logo: card.find('img').attr('src') || '',
        remote: false,
        tags: ['rekrute', 'morocco', 'it'],
        descriptionSnippet: card.find('.text-info').text().trim()
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

module.exports = { searchRekrute };
