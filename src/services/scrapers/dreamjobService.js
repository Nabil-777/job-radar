const { BaseScraper } = require('./baseScraper');
const scraper = new BaseScraper('Dreamjob.ma');

async function searchDreamjob({ keywords = '', experienceLevel = 'all', limit = 15 } = {}) {
  try {
    let kw = keywords.trim();
    if (experienceLevel === 'internship') kw = kw ? `stage ${kw}` : 'stage informatique';
    else if (!kw) kw = 'informatique';

    const $ = await scraper.fetchHtml(`https://www.dreamjob.ma/?s=${encodeURIComponent(kw)}`);
    const jobs = [];
    const kwLower = keywords.toLowerCase().trim();

    $('article, .post, .entry-title').each((i, el) => {
      if (jobs.length >= limit) return false;
      const a = $(el).is('a') ? $(el) : $(el).find('a').first();
      const title = a.text().replace(/\s+/g, ' ').trim();
      const link = a.attr('href');
      if (!title || !link || !link.startsWith('http') || title.length < 12) return;
      if (kwLower && kwLower !== 'software engineer' && !title.toLowerCase().includes(kwLower)) return;

      const words = title.split(' ');
      const company = (words.length > 0 && words[0].length > 2) ? words[0] : 'Recrutement Maroc';

      const job = scraper.normalize({
        id: `dreamjob-${Buffer.from(link).toString('hex').slice(0, 10)}`,
        title,
        company,
        location: 'Maroc',
        url: link,
        datePosted: $(el).find('time, .date').text().trim(),
        remote: false,
        tags: ['dreamjob', 'maroc'],
        descriptionSnippet: $(el).find('p, .entry-content').text().trim() || title
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

module.exports = { searchDreamjob };
