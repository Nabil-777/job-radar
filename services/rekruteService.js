const cheerio = require('cheerio');
const { httpClient } = require('../src/utils/httpClient');
const { normalizeDate } = require('../src/utils/dateNormalizer');
const { generateFingerprint } = require('../src/utils/fingerprint');

/**
 * Scrapes Rekrute.com for IT jobs and internships in Morocco
 */
async function searchRekrute({ keywords = 'informatique', experienceLevel = 'all', limit = 15 }) {
  try {
    let kw = (keywords || '').trim();
    if (experienceLevel === 'internship') {
      kw = kw ? `stage ${kw}` : 'stage';
    } else if (!kw) {
      kw = 'informatique';
    }

    const url = `https://www.rekrute.com/offres.html?s=1&p=1&o=1&keyword=${encodeURIComponent(kw)}`;
    const res = await httpClient.get(url);

    const $ = cheerio.load(res.data);
    const jobs = [];

    $('.post-id').each((i, el) => {
      if (jobs.length >= limit) return false;
      const card = $(el);

      const titleEl = card.find('.titreJob');
      const title = titleEl.text().trim();
      let link = titleEl.attr('href');
      if (link && !link.startsWith('http')) {
        link = 'https://www.rekrute.com' + link;
      }

      const company = card.find('.info ul li a').first().text().trim() ||
                      card.find('img').attr('alt') ||
                      card.find('.info ul li').first().text().trim() || 'Entreprise Confidentielle (Maroc)';

      const locationText = card.find('.info ul li:contains("Région")').text().replace('Région :', '').trim() ||
                           card.find('.info ul li:contains("Ville")').text().replace('Ville :', '').trim() || 'Casablanca / Maroc';

      const dateRaw = card.find('.date').text().trim();
      const datePosted = normalizeDate(dateRaw);

      const logo = card.find('img').attr('src') || '';

      if (title && link) {
        const lowerTitle = title.toLowerCase();
        let detectedLevel = 'Entry / Mid';
        const isIntern = lowerTitle.includes('stage') || lowerTitle.includes('pfe') || lowerTitle.includes('stagiaire');
        const isJunior = lowerTitle.includes('débutant') || lowerTitle.includes('junior') || lowerTitle.includes('bac+');
        const isSenior = lowerTitle.includes('senior') || lowerTitle.includes('confirmé') || lowerTitle.includes('expert') || lowerTitle.includes('chef');

        if (isIntern) detectedLevel = 'Internship';
        else if (isJunior) detectedLevel = 'Entry Level / Junior';
        else if (isSenior) detectedLevel = 'Senior';

        if (experienceLevel === 'internship' && !isIntern) return;
        if (experienceLevel === 'entry' && !isJunior && !isIntern) return;

        const jobItem = {
          id: `rekrute-${Buffer.from(link).toString('hex').slice(0, 10)}`,
          title,
          company,
          location: locationText,
          url: link,
          datePosted,
          logo: logo.startsWith('http') ? logo : (logo ? `https://www.rekrute.com${logo}` : ''),
          source: 'Rekrute',
          experienceLevel: detectedLevel,
          contractType: isIntern ? 'Stage / PFE' : (lowerTitle.includes('cdd') ? 'CDD' : 'CDI'),
          remote: locationText.toLowerCase().includes('remote') || locationText.toLowerCase().includes('télétravail'),
          tags: ['Rekrute', 'Maroc', detectedLevel.toLowerCase()]
        };

        jobItem.fingerprint = generateFingerprint(jobItem);
        jobs.push(jobItem);
      }
    });

    return jobs;
  } catch (err) {
    console.error('[Rekrute] Scraper error:', err.message);
    return [];
  }
}

module.exports = { searchRekrute };
