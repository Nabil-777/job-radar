const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Scrapes Relocate.me for international tech jobs with visa sponsorship
 */
async function searchRelocate({ keywords = '', experienceLevel = 'all', limit = 20 }) {
  try {
    let url = 'https://relocate.me/search';
    if (keywords) {
      url += `?query=${encodeURIComponent(keywords)}`;
    }

    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 8000
    });

    const $ = cheerio.load(res.data);
    const jobs = [];
    const kwLower = keywords.toLowerCase().trim();

    $('.jobs-list__job').each((i, el) => {
      if (jobs.length >= limit) return false;
      const card = $(el);

      const titleEl = card.find('.job__title a');
      const title = titleEl.text().replace(/\s+/g, ' ').trim();
      let link = titleEl.attr('href');
      if (link && !link.startsWith('http')) link = 'https://relocate.me' + link;

      const company = card.find('.job__company').text().replace(/\s+/g, ' ').trim() || 'Tech Company';
      const location = card.find('.job__country').text().trim() || card.find('.job__city').text().trim() || 'Europe (Visa Sponsored)';

      if (!title || !link) return;

      const lowerTitle = title.toLowerCase();
      if (kwLower && !lowerTitle.includes(kwLower) && !company.toLowerCase().includes(kwLower)) {
        return;
      }

      let detectedLevel = 'Entry / Mid';
      const isIntern = lowerTitle.includes('intern') || lowerTitle.includes('trainee');
      const isJunior = lowerTitle.includes('junior') || lowerTitle.includes('entry');
      const isSenior = lowerTitle.includes('senior') || lowerTitle.includes('lead') || lowerTitle.includes('manager');

      if (isIntern) detectedLevel = 'Internship';
      else if (isJunior) detectedLevel = 'Entry Level / Junior';
      else if (isSenior) detectedLevel = 'Senior';

      if (experienceLevel === 'internship' && !isIntern) return;
      if (experienceLevel === 'entry' && !isJunior && !isIntern) return;

      jobs.push({
        id: `relocate-${Buffer.from(link).toString('hex').slice(0, 10)}`,
        title,
        company,
        location: `${location} (Visa Sponsored ✈️)`,
        url: link,
        datePosted: 'Recently',
        logo: '',
        source: 'Relocate.me',
        experienceLevel: detectedLevel,
        remote: location.toLowerCase().includes('remote'),
        tags: ['visa-sponsorship', 'relocation', 'europe']
      });
    });

    return jobs;
  } catch (err) {
    console.error('Relocate.me error:', err.message);
    return [];
  }
}

module.exports = { searchRelocate };
