const axios = require('axios');
const cheerio = require('cheerio');

// In-memory cache for GitHub lists (cached for 1 hour)
let cacheData = {
  internships: null,
  newGrad: null,
  timestamp: 0
};
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

async function fetchSimplifyData() {
  const now = Date.now();
  if (cacheData.internships && cacheData.newGrad && (now - cacheData.timestamp < CACHE_TTL)) {
    return cacheData;
  }

  const urls = {
    internships: 'https://raw.githubusercontent.com/SimplifyJobs/Summer2025-Internships/dev/README.md',
    newGrad: 'https://raw.githubusercontent.com/SimplifyJobs/New-Grad-Positions/dev/README.md'
  };

  try {
    const [resIntern, resGrad] = await Promise.all([
      axios.get(urls.internships, { timeout: 15000 }).catch(() => ({ data: '' })),
      axios.get(urls.newGrad, { timeout: 15000 }).catch(() => ({ data: '' }))
    ]);

    const internships = parseTable(resIntern.data, 'Internship');
    const newGrad = parseTable(resGrad.data, 'Entry Level / Junior');

    cacheData = {
      internships,
      newGrad,
      timestamp: now
    };
  } catch (err) {
    console.error('Error fetching SimplifyJobs data:', err.message);
  }

  return cacheData;
}

function parseTable(markdown, defaultLevel) {
  if (!markdown) return [];
  const $ = cheerio.load(markdown);
  const jobs = [];

  $('tbody tr').each((i, el) => {
    const row = $(el);
    const cols = row.find('td');
    if (cols.length >= 4) {
      // Clean company name (remove emoji and Simplify tracking)
      const company = cols.eq(0).text().trim().replace(/^[^\w]+/, '');
      const rawTitle = cols.eq(1).text().trim().replace(/[🎓🔒]/g, '').trim();
      const location = cols.eq(2).text().trim();
      const applyLink = cols.eq(3).find('a').first().attr('href') || '';
      const age = cols.eq(4).text().trim();

      if (rawTitle && applyLink) {
        const lowerTitle = rawTitle.toLowerCase();
        let detectedLevel = defaultLevel;
        if (lowerTitle.includes('intern') || lowerTitle.includes('co-op') || lowerTitle.includes('trainee')) {
          detectedLevel = 'Internship';
        } else if (lowerTitle.includes('junior') || lowerTitle.includes('new grad') || lowerTitle.includes('entry') || lowerTitle.includes('associate')) {
          detectedLevel = 'Entry Level / Junior';
        }

        jobs.push({
          id: `simplify-${Buffer.from(company + rawTitle).toString('hex').slice(0, 10)}`,
          title: rawTitle,
          company: company || 'Top Tech Company',
          location: location || 'Remote / Hybrid',
          url: applyLink,
          datePosted: age ? `${age} ago` : 'Recently',
          logo: '',
          source: 'GitHub Tech Index',
          experienceLevel: detectedLevel,
          remote: location.toLowerCase().includes('remote'),
          tags: ['curated', 'direct-ats', detectedLevel.toLowerCase()]
        });
      }
    }
  });

  return jobs;
}

/**
 * Searches the SimplifyJobs GitHub Tech Database
 */
async function searchSimplify({ keywords = '', experienceLevel = 'all', location = '', limit = 30 }) {
  const data = await fetchSimplifyData();

  let pool = [];
  if (experienceLevel === 'internship') {
    pool = data.internships || [];
  } else if (experienceLevel === 'entry') {
    pool = data.newGrad || [];
  } else {
    pool = (data.internships || []).concat(data.newGrad || []);
  }

  const kwLower = keywords.toLowerCase().trim();
  const locLower = (location || '').toLowerCase().trim();
  const filtered = [];

  for (const job of pool) {
    if (filtered.length >= limit) break;

    const titleLower = job.title.toLowerCase();
    const compLower = job.company.toLowerCase();
    const jobLocLower = job.location.toLowerCase();

    // Location check
    if (locLower && locLower !== 'worldwide' && !locLower.includes('all')) {
      if (locLower === 'remote' && !job.remote && !jobLocLower.includes('remote')) {
        continue;
      } else if (locLower !== 'remote' && !jobLocLower.includes(locLower)) {
        continue;
      }
    }

    // Keyword match
    if (kwLower) {
      const match = titleLower.includes(kwLower) || compLower.includes(kwLower);
      if (!match) continue;
    }

    filtered.push(job);
  }

  return filtered;
}

module.exports = { searchSimplify };
