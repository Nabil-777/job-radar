const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Scrapes WeTech.ma (100% IT, Informatique, Dev & Cloud au Maroc)
 */
async function searchWeTech({ keywords = '', experienceLevel = 'all', limit = 15 }) {
  try {
    const url = 'https://www.wetech.ma/offres-emploi/';
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8'
      },
      timeout: 8000
    });

    const $ = cheerio.load(res.data);
    const jobs = [];
    const kwLower = keywords.toLowerCase().trim();

    $('a[href*="/offre-emploi/"]').each((i, el) => {
      if (jobs.length >= limit) return false;
      const link = $(el).attr('href');
      const title = $(el).text().replace(/\s+/g, ' ').trim();

      if (title && title.length > 3 && !title.toLowerCase().includes('voir plus') && !title.toLowerCase().includes('postuler')) {
        const fullUrl = link.startsWith('http') ? link : `https://www.wetech.ma${link}`;
        const lowerTitle = title.toLowerCase();

        // Only filter if user specified custom keywords
        if (kwLower && kwLower !== 'software engineer' && !lowerTitle.includes(kwLower)) {
          return;
        }

        let detectedLevel = 'Entry / Mid';
        const isIntern = lowerTitle.includes('stage') || lowerTitle.includes('pfe') || lowerTitle.includes('intern');
        const isJunior = lowerTitle.includes('junior') || lowerTitle.includes('débutant');
        const isSenior = lowerTitle.includes('lead') || lowerTitle.includes('senior') || lowerTitle.includes('expert');

        if (isIntern) detectedLevel = 'Internship';
        else if (isJunior) detectedLevel = 'Entry Level / Junior';
        else if (isSenior) detectedLevel = 'Senior';

        if (experienceLevel === 'internship' && !isIntern) return;
        if (experienceLevel === 'entry' && !isJunior && !isIntern) return;

        // Try extracting company from url slug e.g. /offre-emploi/giantlink-mlops-engineer-979
        let company = 'Entreprise Tech Maroc';
        const slugMatch = link.match(/\/offre-emploi\/([a-z0-9]+)-/i);
        if (slugMatch) {
          company = slugMatch[1].charAt(0).toUpperCase() + slugMatch[1].slice(1);
        }

        jobs.push({
          id: `wetech-${Buffer.from(fullUrl).toString('hex').slice(0, 10)}`,
          title,
          company,
          location: 'Morocco (Casablanca / Rabat / Remote)',
          url: fullUrl,
          datePosted: 'Recently',
          logo: '',
          source: 'WeTech.ma (100% IT)',
          experienceLevel: detectedLevel,
          remote: lowerTitle.includes('remote') || lowerTitle.includes('télétravail'),
          tags: ['IT Maroc', 'WeTech', detectedLevel.toLowerCase()]
        });
      }
    });

    // Deduplicate
    const unique = [];
    const seen = new Set();
    for (const j of jobs) {
      if (!seen.has(j.url)) {
        seen.add(j.url);
        unique.push(j);
      }
    }

    return unique;
  } catch (err) {
    console.error('WeTech error:', err.message);
    return [];
  }
}

module.exports = { searchWeTech };
