const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Scrapes Talent.com Morocco (ma.talent.com) - aggregates jobs & stages across Morocco
 */
async function searchTalentMorocco({ keywords = '', experienceLevel = 'all', limit = 20 }) {
  try {
    let kw = keywords.trim();
    if (experienceLevel === 'internship') {
      kw = kw ? `stage ${kw}` : 'stage informatique';
    } else if (!kw) {
      kw = 'informatique';
    }

    const url = `https://ma.talent.com/jobs?k=${encodeURIComponent(kw)}&l=Morocco`;
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

    $('a[aria-label*="Voir plus for"], [class*="JobCard_readMoreLink"]').each((i, el) => {
      if (jobs.length >= limit) return false;
      const aria = $(el).attr('aria-label') || '';
      const href = $(el).attr('href');
      if (!href) return;

      const fullUrl = href.startsWith('http') ? href : `https://ma.talent.com${href}`;

      let title = '';
      let company = 'Entreprise au Maroc';
      const match = aria.match(/Voir plus for (.+) at (.+)/i);
      if (match) {
        title = match[1].trim();
        company = match[2].trim();
      } else {
        title = $(el).closest('[class*="JobCard"]').find('h2, [class*="title"]').text().trim();
      }

      if (!title || title === 'Voir plus') return;

      const lowerTitle = title.toLowerCase();
      const lowerComp = company.toLowerCase();

      // Intelligent keyword matching: broad terms allow all returned IT results
      const isBroadSearch = !kwLower || kwLower === 'software engineer' || kwLower === 'informatique' || kwLower === 'it' || kwLower === 'stage' || kwLower === 'dev';
      if (!isBroadSearch) {
        const tokens = kwLower.split(/\s+/).filter(t => t.length > 2 && t !== 'stage' && t !== 'informatique');
        if (tokens.length > 0) {
          const matchesAny = tokens.some(t => lowerTitle.includes(t) || lowerComp.includes(t));
          if (!matchesAny) return;
        }
      }

      let detectedLevel = 'Entry / Mid';
      const isIntern = lowerTitle.includes('stage') || lowerTitle.includes('stagiaire') || lowerTitle.includes('pfe') || lowerTitle.includes('intern') || lowerTitle.includes('alternan');
      const isJunior = lowerTitle.includes('junior') || lowerTitle.includes('débutant') || lowerTitle.includes('debutant') || lowerTitle.includes('assistant');
      const isSenior = lowerTitle.includes('senior') || lowerTitle.includes('lead') || lowerTitle.includes('expert') || lowerTitle.includes('chef') || lowerTitle.includes('directeur');

      if (isIntern) detectedLevel = 'Internship';
      else if (isJunior) detectedLevel = 'Entry Level / Junior';
      else if (isSenior) detectedLevel = 'Senior';

      if (experienceLevel === 'internship' && !isIntern) return;
      if (experienceLevel === 'entry' && !isJunior && !isIntern) return;

      jobs.push({
        id: `talent-${Buffer.from(fullUrl).toString('hex').slice(0, 10)}`,
        title,
        company,
        location: 'Morocco (Casablanca, Rabat, Tanger...)',
        url: fullUrl,
        datePosted: 'Recently',
        logo: '',
        source: 'Talent.com (Maroc)',
        experienceLevel: detectedLevel,
        remote: lowerTitle.includes('remote') || lowerTitle.includes('télétravail'),
        tags: ['Talent.com', 'Morocco', detectedLevel.toLowerCase()]
      });
    });

    return jobs;
  } catch (err) {
    console.error('Talent.com Morocco error:', err.message);
    return [];
  }
}

module.exports = { searchTalentMorocco };
