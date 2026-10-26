const axios = require('axios');
const cheerio = require('cheerio');

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
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8'
      },
      timeout: 8000
    });

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
                      card.find('.info ul li').first().text().trim() || 'Entreprise Confidentielle';

      const locationText = card.find('.info ul li:contains("Région")').text().replace('Région :', '').trim() ||
                           card.find('.info ul li:contains("Ville")').text().replace('Ville :', '').trim() || 'Morocco';

      const dateRaw = card.find('.date').text().trim();
      let datePosted = 'Recently';
      const dateMatch = dateRaw.match(/(\d{2}\/\d{2}\/\d{4})/);
      if (dateMatch) datePosted = dateMatch[1];

      const logo = card.find('img').attr('src') || '';

      if (title && link) {
        const lowerTitle = title.toLowerCase();
        let detectedLevel = 'Entry / Mid';
        const isIntern = lowerTitle.includes('stage') || lowerTitle.includes('pfe') || lowerTitle.includes('stagiaire');
        const isJunior = lowerTitle.includes('débutant') || lowerTitle.includes('junior') || lowerTitle.includes('bac+');

        if (isIntern) detectedLevel = 'Internship';
        else if (isJunior) detectedLevel = 'Entry Level / Junior';

        if (experienceLevel === 'internship' && !isIntern) return;
        if (experienceLevel === 'entry' && !isJunior && !isIntern) return;

        jobs.push({
          id: `rk-${Buffer.from(link).toString('hex').slice(0, 10)}`,
          title,
          company,
          location: `${locationText}, Morocco`,
          url: link,
          datePosted,
          logo: logo.startsWith('http') ? logo : (logo ? `https://www.rekrute.com${logo}` : ''),
          source: 'Rekrute',
          experienceLevel: detectedLevel,
          remote: locationText.toLowerCase().includes('télétravail') || locationText.toLowerCase().includes('remote'),
          tags: ['Morocco', 'Rekrute', detectedLevel.toLowerCase()]
        });
      }
    });

    return jobs;
  } catch (err) {
    console.error('Rekrute search error:', err.message);
    return [];
  }
}

module.exports = { searchRekrute };
