const axios = require('axios');
const cheerio = require('cheerio');

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
      if (words.length > 0) company = words[0];

      jobs.push({
        id: `dreamjob-${Buffer.from(link).toString('hex').slice(0, 10)}`,
        title,
        company,
        location: 'Morocco (National)',
        url: link,
        datePosted: 'Recently',
        logo: '',
        source: 'Dreamjob.ma',
        experienceLevel: detectedLevel,
        remote: false,
        tags: ['Dreamjob', 'Maroc', detectedLevel.toLowerCase()]
      });
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
    console.error('Dreamjob error:', err.message);
    return [];
  }
}

module.exports = { searchDreamjob };
