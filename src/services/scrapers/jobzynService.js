const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Scrapes Jobzyn.com (The "Welcome to the Jungle" of Morocco - Startups, Scale-ups & Tech)
 */
async function searchJobzyn({ keywords = '', experienceLevel = 'all', limit = 20 }) {
  try {
    let url = 'https://www.jobzyn.com/fr/jobs/maroc?pageSize=40';
    if (keywords) {
      url += `&searchQuery=${encodeURIComponent(keywords)}`;
    }

    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8'
      },
      timeout: 9000
    });

    const $ = cheerio.load(res.data);
    const jobs = [];
    const kwLower = keywords.toLowerCase().trim();

    $('a[href*="/companies/"][href*="/jobs/"]').each((i, el) => {
      if (jobs.length >= limit) return false;
      const card = $(el);
      const link = card.attr('href');
      if (!link) return;

      const fullUrl = link.startsWith('http') ? link : `https://www.jobzyn.com${link}`;
      const company = card.find('p').first().text().trim() || 'Moroccan Tech / Startup';
      const title = card.find('h2').first().text().trim();
      const location = card.find('span.font-semibold:contains("Casablanca"), span.font-semibold:contains("Rabat"), span.font-semibold:contains("Tanger"), span.font-semibold:contains("Maroc")').first().text().trim() || 'Morocco';
      const contract = card.find('span.font-semibold:contains("CDI"), span.font-semibold:contains("Stage"), span.font-semibold:contains("Freelance")').first().text().trim() || 'CDI / Stage';
      const mode = card.find('span.font-semibold:contains("Sur site"), span.font-semibold:contains("Hybride"), span.font-semibold:contains("Télétravail"), span.font-semibold:contains("Remote")').first().text().trim() || '';

      if (!title) return;

      const lowerTitle = title.toLowerCase();
      const lowerComp = company.toLowerCase();

      if (kwLower && !lowerTitle.includes(kwLower) && !lowerComp.includes(kwLower)) {
        return;
      }

      let detectedLevel = 'Entry / Mid';
      const isIntern = lowerTitle.includes('stage') || lowerTitle.includes('pfe') || lowerTitle.includes('intern') || contract.toLowerCase().includes('stage');
      const isJunior = lowerTitle.includes('junior') || lowerTitle.includes('débutant') || lowerTitle.includes('entry');
      const isSenior = lowerTitle.includes('senior') || lowerTitle.includes('lead') || lowerTitle.includes('chef') || lowerTitle.includes('directeur');

      if (isIntern) detectedLevel = 'Internship';
      else if (isJunior) detectedLevel = 'Entry Level / Junior';
      else if (isSenior) detectedLevel = 'Senior';

      if (experienceLevel === 'internship' && !isIntern) return;
      if (experienceLevel === 'entry' && !isJunior && !isIntern) return;

      jobs.push({
        id: `jobzyn-${Buffer.from(fullUrl).toString('hex').slice(0, 10)}`,
        title,
        company,
        location: `${location}, Morocco ${mode ? `(${mode})` : ''}`,
        url: fullUrl,
        datePosted: 'Recently',
        logo: '',
        source: 'Jobzyn.com (Maroc)',
        experienceLevel: detectedLevel,
        remote: mode.toLowerCase().includes('télétravail') || mode.toLowerCase().includes('remote'),
        tags: [contract, mode, 'Maroc Tech'].filter(Boolean)
      });
    });

    return jobs;
  } catch (err) {
    console.error('Jobzyn search error:', err.message);
    return [];
  }
}

module.exports = { searchJobzyn };
