const cheerio = require('cheerio');
const { httpClient } = require('../src/utils/httpClient');
const { normalizeDate } = require('../src/utils/dateNormalizer');
const { generateFingerprint } = require('../src/utils/fingerprint');

/**
 * Scrapes Dreamjob.ma (Moroccan IT jobs, Enterprise stages, Concours OCP, ONCF, etc.)
 */
async function searchDreamjob({ keywords = '', experienceLevel = 'all', limit = 15 }) {
  try {
    let kw = keywords.trim();
    if (experienceLevel === 'internship') {
      kw = kw ? `stage ${kw}` : 'stage informatique';
    } else if (!kw) {
      kw = 'informatique';
    }

    const url = `https://www.dreamjob.ma/?s=${encodeURIComponent(kw)}`;
    const res = await httpClient.get(url);

    const $ = cheerio.load(res.data);
    const jobs = [];
    const kwLower = keywords.toLowerCase().trim();

    $('article, .post, .entry-title').each((i, el) => {
      if (jobs.length >= limit) return false;
      const a = $(el).is('a') ? $(el) : $(el).find('a').first();
      const title = a.text().replace(/\s+/g, ' ').trim();
      const link = a.attr('href');

      if (!title || !link || !link.startsWith('http') || title.length < 12) return;

      const lowerTitle = title.toLowerCase();

      if (kwLower && kwLower !== 'software engineer' && !lowerTitle.includes(kwLower)) {
        return;
      }

      let detectedLevel = 'Entry / Mid';
      const isIntern = lowerTitle.includes('stage') || lowerTitle.includes('pfe') || lowerTitle.includes('stagiaire');
      const isJunior = lowerTitle.includes('junior') || lowerTitle.includes('débutant') || lowerTitle.includes('technicien');
      const isSenior = lowerTitle.includes('senior') || lowerTitle.includes('cadre') || lowerTitle.includes('chef') || lowerTitle.includes('docteur');

      if (isIntern) detectedLevel = 'Internship';
      else if (isJunior) detectedLevel = 'Entry Level / Junior';
      else if (isSenior) detectedLevel = 'Senior';

      if (experienceLevel === 'internship' && !isIntern) return;
      if (experienceLevel === 'entry' && !isJunior && !isIntern) return;

      // Extract company name if in title e.g. "SEWS ouvre des stages..." or "Concours LPEE"
      let company = 'Recrutement Maroc (Secteur Privé / Public)';
      const words = title.split(' ');
      if (words.length > 0 && words[0].length > 2) company = words[0];

      const dateText = $(el).find('time, .date, .entry-date').text().trim();

      const jobItem = {
        id: `dreamjob-${Buffer.from(link).toString('hex').slice(0, 10)}`,
        title,
        company,
        location: 'Morocco (National)',
        url: link,
        datePosted: normalizeDate(dateText),
        logo: '',
        source: 'Dreamjob.ma',
        experienceLevel: detectedLevel,
        contractType: isIntern ? 'Stage / PFE' : 'Concours / CDI',
        remote: false,
        tags: ['Dreamjob', 'Maroc', isIntern ? 'stage' : 'concours']
      };

      jobItem.fingerprint = generateFingerprint(jobItem);
      jobs.push(jobItem);
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
    console.error('[Dreamjob] Scraper error:', err.message);
    return [];
  }
}

module.exports = { searchDreamjob };
