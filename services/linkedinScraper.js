const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Scrapes LinkedIn guest job listings (no authentication required)
 * @param {Object} options
 * @param {string} options.keywords - e.g. "software engineer", "cybersecurity", "ai engineer"
 * @param {string} options.location - e.g. "Morocco", "Worldwide", "Remote"
 * @param {string} options.experienceLevel - "internship", "entry", "associate", "mid", "senior", or "all"
 * @param {string} options.workType - "all", "remote", "onsite", "hybrid"
 * @param {number} options.limit - maximum jobs to retrieve
 */
async function searchLinkedIn({ keywords = 'software engineer', location = 'Worldwide', experienceLevel = 'all', workType = 'all', limit = 25 }) {
  const jobs = [];

  // Map experience level to LinkedIn f_E parameter
  const expMap = {
    'internship': '1',
    'entry': '2',
    'associate': '3',
    'mid': '4',
    'senior': '5',
    'director': '6'
  };

  // Map work type to LinkedIn f_WT parameter
  const wtMap = {
    'onsite': '1',
    'remote': '2',
    'hybrid': '3'
  };

  const f_E = expMap[experienceLevel.toLowerCase()] || '';
  const f_WT = wtMap[workType.toLowerCase()] || '';

  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
  ];

  const headers = {
    'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)],
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8,ar;q=0.7',
    'Referer': 'https://www.linkedin.com/jobs/search'
  };

  const maxPages = Math.ceil(limit / 10);

  for (let page = 0; page < maxPages && jobs.length < limit; page++) {
    const start = page * 10;
    let url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(keywords)}&location=${encodeURIComponent(location)}&start=${start}`;
    if (f_E) url += `&f_E=${f_E}`;
    if (f_WT) url += `&f_WT=${f_WT}`;

    try {
      const response = await axios.get(url, { headers, timeout: 8000 });
      if (!response.data || typeof response.data !== 'string') break;

      const $ = cheerio.load(response.data);
      const items = $('li');
      if (items.length === 0) break;

      items.each((i, el) => {
        if (jobs.length >= limit) return false;
        const card = $(el);

        const title = card.find('.base-search-card__title').text().trim();
        const company = card.find('.base-search-card__subtitle a').text().trim() ||
                        card.find('.base-search-card__subtitle').text().trim() || 'Unknown Company';
        const jobLocation = card.find('.job-search-card__location').text().trim() || location;
        let link = card.find('.base-card__full-link').attr('href') || card.find('a').attr('href');
        const datePosted = card.find('time').attr('datetime') || card.find('time').text().trim() || 'Recently';
        const logo = card.find('img').attr('data-delayed-url') || card.find('img').attr('src') || '';

        if (title && link) {
          // Clean link
          if (link.includes('?')) {
            link = link.split('?')[0]; // clean tracking params
          }

          // Extract ID
          const idMatch = link.match(/-(\d+)(?:\?|$)/) || [null, Buffer.from(title + company).toString('hex').slice(0, 10)];
          const id = 'li-' + idMatch[1];

          // Strict experience level filtering
          const lowerTitle = title.toLowerCase();
          const isSeniorRole = lowerTitle.includes('senior') || lowerTitle.includes('lead') || lowerTitle.includes('principal') || lowerTitle.includes('staff') || lowerTitle.includes('director') || lowerTitle.includes('manager') || lowerTitle.includes('architect') || lowerTitle.includes('head of');
          const isInternRole = lowerTitle.includes('intern') || lowerTitle.includes('stage') || lowerTitle.includes('pfe') || lowerTitle.includes('trainee') || lowerTitle.includes('alternan') || lowerTitle.includes('student');
          const isJuniorRole = lowerTitle.includes('entry') || lowerTitle.includes('junior') || lowerTitle.includes('graduat') || lowerTitle.includes('associate') || lowerTitle.includes('debutant');

          if (experienceLevel === 'internship' && isSeniorRole) {
            return; // skip senior roles misclassified by search
          }
          if (experienceLevel === 'entry' && isSeniorRole) {
            return; // skip senior roles
          }

          // Determine experience level label
          let detectedLevel = experienceLevel;
          if (isInternRole) {
            detectedLevel = 'Internship';
          } else if (isJuniorRole) {
            detectedLevel = 'Entry Level / Junior';
          } else if (isSeniorRole) {
            detectedLevel = 'Senior';
          } else if (experienceLevel === 'all') {
            detectedLevel = 'Full-Time / Mid';
          }

          jobs.push({
            id,
            title,
            company,
            location: jobLocation,
            url: link,
            datePosted,
            logo,
            source: 'LinkedIn',
            experienceLevel: detectedLevel,
            remote: jobLocation.toLowerCase().includes('remote') || workType === 'remote',
            tags: extractKeywords(title)
          });
        }
      });

      // Small delay between pagination calls to be respectful
      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      console.error(`LinkedIn scraper page ${page} error:`, err.message);
      break;
    }
  }

  return jobs;
}

function extractKeywords(title) {
  const common = ['ai', 'cybersecurity', 'security', 'python', 'javascript', 'react', 'node', 'java', 'c++', 'cloud', 'devops', 'data', 'docker', 'machine learning', 'frontend', 'backend', 'fullstack', 'golang', 'rust', 'stage', 'pfe', 'intern'];
  const t = title.toLowerCase();
  return common.filter(k => t.includes(k));
}

module.exports = { searchLinkedIn };
