const cheerio = require('cheerio');
const { httpClient } = require('../../utils/httpClient');
const { normalizeDate } = require('../../utils/dateNormalizer');
const { generateFingerprint } = require('../../utils/fingerprint');

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

    const res = await httpClient.get(url);
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
      const dateText = $(el).find('.card-job-date, time, .posted-date').text().trim();

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

      const jobItem = {
        id: `emploi-${Buffer.from(fullUrl).toString('hex').slice(0, 10)}`,
        title,
        company,
        location: 'Morocco (Casablanca, Rabat, Tanger...)',
        url: fullUrl,
        datePosted: normalizeDate(dateText),
        logo: '',
        source: 'Emploi.ma',
        experienceLevel: detectedLevel,
        contractType: isIntern ? 'Stage / PFE' : (lowerTitle.includes('anapec') ? 'Anapec' : 'CDI'),
        remote: lowerTitle.includes('remote') || lowerTitle.includes('télétravail'),
        descriptionSnippet: desc.slice(0, 180),
        tags: ['Emploi.ma', 'Morocco', detectedLevel.toLowerCase()]
      };

      jobItem.fingerprint = generateFingerprint(jobItem);
      jobs.push(jobItem);
    });

    return jobs;
  } catch (err) {
    console.error('[Emploi.ma] Scraper error:', err.message);
    return [];
  }
}

module.exports = { searchEmploiMa };
