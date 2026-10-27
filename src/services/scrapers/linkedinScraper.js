const { BaseScraper } = require('./baseScraper');
const scraper = new BaseScraper('LinkedIn');
const EXP_MAP = { internship: '1', entry: '2', associate: '3', mid: '4', senior: '5', director: '6' };
const WT_MAP = { onsite: '1', remote: '2', hybrid: '3' };

async function searchLinkedIn({ keywords = 'software engineer', location = 'Worldwide', experienceLevel = 'all', workType = 'all', limit = 25 } = {}) {
  const jobs = [];
  const f_E = EXP_MAP[experienceLevel?.toLowerCase()] || '';
  const f_WT = WT_MAP[workType?.toLowerCase()] || '';
  const maxPages = Math.ceil(limit / 10);

  for (let page = 0; page < maxPages && jobs.length < limit; page++) {
    const start = page * 10;
    const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(keywords)}&location=${encodeURIComponent(location)}&start=${start}${f_E ? `&f_E=${f_E}` : ''}${f_WT ? `&f_WT=${f_WT}` : ''}`;
    try {
      const $ = await scraper.fetchHtml(url, { headers: { Referer: 'https://www.linkedin.com/jobs/search' } });
      const items = $('li');
      if (items.length === 0) break;

      items.each((_, el) => {
        if (jobs.length >= limit) return false;
        const card = $(el);
        const title = card.find('.base-search-card__title').text().trim();
        const company = card.find('.base-search-card__subtitle a').text().trim() || card.find('.base-search-card__subtitle').text().trim() || 'Tech Company';
        let link = card.find('.base-card__full-link').attr('href') || card.find('a').attr('href');
        if (!title || !link) return;
        if (link.includes('?')) link = link.split('?')[0];

        const job = scraper.normalize({
          title, company,
          location: card.find('.job-search-card__location').text().trim() || location,
          url: link,
          datePosted: card.find('time').attr('datetime') || card.find('time').text().trim(),
          logo: card.find('img').attr('data-delayed-url') || card.find('img').attr('src') || '',
          remote: location.toLowerCase().includes('remote') || workType === 'remote',
          tags: ['linkedin']
        });

        if (experienceLevel === 'internship' && job.experienceLevel !== 'Internship') return;
        if (experienceLevel === 'entry' && !['Entry Level / Junior', 'Internship'].includes(job.experienceLevel)) return;
        if (experienceLevel === 'senior' && job.experienceLevel !== 'Senior') return;
        jobs.push(job);
      });
    } catch (err) { break; }
  }
  return jobs;
}

module.exports = { searchLinkedIn };
