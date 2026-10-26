const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Scrapes Emploi.ma (IT / Informatique section in Morocco)
 */
async function searchEmploiMa({ keywords = '', experienceLevel = 'all', limit = 25 }) {
  try {
    let kw = keywords.trim();
    let url = 'https://www.emploi.ma/recherche-jobs-maroc?f%5B0%5D=im_field_offre_metiers%3A31';

    if (kw) {
      url += `&keywords=${encodeURIComponent(kw)}`;
    }

    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8'
      },
      timeout: 10000
    });

    const $ = cheerio.load(res.data);
    const jobs = [];
    const kwLower = kw.toLowerCase();

    $('.card-job-detail').each((i, el) => {
      if (jobs.length >= limit) return false;

      const titleLink = $(el).find('h3 a');
      const title = titleLink.text().trim();
      const href = titleLink.attr('href');
      if (!title || !href) return;

      const fullUrl = href.startsWith('http') ? href : `https://www.emploi.ma${href}`;
      const company = $(el).find('.card-job-company, .company-title, a[href*="/recruteur/"]').first().text().trim() || 'Entreprise IT au Maroc';
      const desc = $(el).find('.card-job-description').text().trim();

      const lowerTitle = title.toLowerCase();
      const lowerComp = company.toLowerCase();

      // Keyword filtering
      const isBroadSearch = !kwLower || kwLower === 'software engineer' || kwLower === 'informatique' || kwLower === 'it' || kwLower === 'stage' || kwLower === 'dev';
      if (!isBroadSearch) {
        const tokens = kwLower.split(/\s+/).filter(t => t.length > 2 && t !== 'stage' && t !== 'informatique');
        if (tokens.length > 0) {
          const matchesAny = tokens.some(t => lowerTitle.includes(t) || lowerComp.includes(t) || desc.toLowerCase().includes(t));
          if (!matchesAny) return;
        }
      }

      let detectedLevel = 'Entry / Mid';
      const isIntern = lowerTitle.includes('stage') || lowerTitle.includes('stagiaire') || lowerTitle.includes('pfe') || lowerTitle.includes('intern') || lowerTitle.includes('alternan');
      const isJunior = lowerTitle.includes('junior') || lowerTitle.includes('débutant') || lowerTitle.includes('debutant') || lowerTitle.includes('assistant');
      const isSenior = lowerTitle.includes('senior') || lowerTitle.includes('lead') || lowerTitle.includes('expert') || lowerTitle.includes('directeur') || lowerTitle.includes('chef');

      if (isIntern) detectedLevel = 'Internship';
      else if (isJunior) detectedLevel = 'Entry Level / Junior';
      else if (isSenior) detectedLevel = 'Senior';

      if (experienceLevel === 'internship' && !isIntern) return;
      if (experienceLevel === 'entry' && !isJunior && !isIntern) return;

      jobs.push({
        id: `emploi-${Buffer.from(fullUrl).toString('hex').slice(0, 10)}`,
        title,
        company,
        location: 'Morocco (Casablanca, Rabat, Tanger...)',
        url: fullUrl,
        datePosted: 'Recently',
        logo: '',
        source: 'Emploi.ma',
        experienceLevel: detectedLevel,
        remote: lowerTitle.includes('remote') || lowerTitle.includes('télétravail'),
        descriptionSnippet: desc.slice(0, 160),
        tags: ['Emploi.ma', 'Morocco', detectedLevel.toLowerCase()]
      });
    });

    return jobs;
  } catch (err) {
    console.error('Emploi.ma error:', err.message);
    return [];
  }
}

module.exports = { searchEmploiMa };
