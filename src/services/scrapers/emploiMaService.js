const { BaseScraper } = require('./baseScraper');
const scraper = new BaseScraper('Emploi.ma');

async function searchEmploiMa({ keywords = '', experienceLevel = 'all', limit = 25 } = {}) {
  try {
    const kw = keywords.trim();
    const url = `https://www.emploi.ma/recherche-jobs-maroc?f%5B0%5D=im_field_offre_metiers%3A31${kw ? `&keywords=${encodeURIComponent(kw)}` : ''}`;
    const $ = await scraper.fetchHtml(url);
    const jobs = [];
    const kwLower = kw.toLowerCase();

    $('.card-job-detail').each((i, el) => {
      if (jobs.length >= limit) return false;
      const titleLink = $(el).find('h3 a');
      const title = titleLink.text().trim();
      const href = titleLink.attr('href');
      if (!title || !href) return;

      const company = $(el).find('.card-job-company, .company-title, a[href*="/recruteur/"]').first().text().trim() || 'Entreprise IT au Maroc';
      const desc = $(el).find('.card-job-description').text().trim();
      if (kwLower && !title.toLowerCase().includes(kwLower) && !company.toLowerCase().includes(kwLower) && !desc.toLowerCase().includes(kwLower)) return;

      const job = scraper.normalize({
        id: `emploi-ma-${Buffer.from(href).toString('hex').slice(0, 10)}`,
        title,
        company,
        location: 'Maroc',
        url: href.startsWith('http') ? href : `https://www.emploi.ma${href}`,
        datePosted: $(el).find('.card-job-date, time').text().trim(),
        remote: false,
        tags: ['emploi.ma', 'maroc', 'it'],
        descriptionSnippet: desc
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

module.exports = { searchEmploiMa };
