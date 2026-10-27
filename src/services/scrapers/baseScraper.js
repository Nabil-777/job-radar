const axios = require('axios');
const cheerio = require('cheerio');
const { parsePostedDate, formatPostedDateLabel, isFreshPosting } = require('../../utils/parsePostedDate');
const { generateFingerprint } = require('../../utils/fingerprint');

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.4; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
];

let uaIdx = 0;
function getRandomUserAgent() {
  uaIdx = (uaIdx + 1) % USER_AGENTS.length;
  return USER_AGENTS[uaIdx];
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Detect experience level from title and tags uniformly across providers
 */
function detectExperienceLevel(title = '', tags = []) {
  const lowerTitle = String(title).toLowerCase();
  const lowerTags = (Array.isArray(tags) ? tags : []).map(t => String(t).toLowerCase());

  const isIntern = lowerTitle.includes('stage') ||
                   lowerTitle.includes('pfe') ||
                   lowerTitle.includes('stagiaire') ||
                   lowerTitle.includes('intern') ||
                   lowerTags.includes('internship') ||
                   lowerTags.includes('trainee');

  const isJunior = lowerTitle.includes('junior') ||
                   lowerTitle.includes('entry') ||
                   lowerTitle.includes('débutant') ||
                   lowerTitle.includes('bac+') ||
                   lowerTags.includes('junior');

  const isSenior = lowerTitle.includes('senior') ||
                   lowerTitle.includes('lead') ||
                   lowerTitle.includes('principal') ||
                   lowerTitle.includes('confirmé') ||
                   lowerTitle.includes('expert') ||
                   lowerTags.includes('senior');

  if (isIntern) return 'Internship';
  if (isJunior) return 'Entry Level / Junior';
  if (isSenior) return 'Senior';
  return 'Entry / Mid';
}

/**
 * Standard Job Normalizer guaranteeing identical schema and strict date parsing across all providers
 */
function createJob(raw = {}) {
  const title = String(raw.title || '').trim();
  const company = String(raw.company || 'Unknown Company').trim();
  const location = String(raw.location || 'Remote / Worldwide').trim();
  const url = String(raw.url || '').trim();
  const source = String(raw.source || 'Scraper').trim();

  // Strict Date Resolution: never fall back to now silently
  const rawDate = raw.date !== undefined ? raw.date : (raw.datePosted !== undefined ? raw.datePosted : (raw.publishedAt || raw.published_at || raw.created_at || raw.postedAt || null));
  const parsedDate = parsePostedDate(rawDate);
  const postedAt = parsedDate ? parsedDate.toISOString() : null;
  const dateStatus = parsedDate ? 'parsed' : 'unknown';
  const isFresh = isFreshPosting(parsedDate);
  const postedAtLabel = formatPostedDateLabel(parsedDate);

  const isRemote = Boolean(raw.remote || raw.isRemote || location.toLowerCase().includes('remote'));
  const tags = Array.isArray(raw.tags)
    ? raw.tags.map(t => String(t).trim()).filter(Boolean)
    : [];

  const rawDesc = String(raw.descriptionSnippet || raw.description || '');
  const descriptionSnippet = rawDesc
    .replace(/<[^>]*>?/gm, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);

  const fp = raw.fingerprint || generateFingerprint({ company, title, location });
  const prefix = source.toLowerCase().replace(/[^a-z0-9]/g, '');
  const id = raw.id || `${prefix}-${fp.slice(0, 10)}`;

  return {
    id,
    title,
    company,
    location,
    url,
    postedAt,
    datePosted: postedAt || '',
    publishedAt: postedAt || '',
    dateRaw: rawDate != null ? String(rawDate) : null,
    dateStatus,
    isFresh,
    postedAtLabel,
    logo: raw.logo || '',
    source,
    experienceLevel: raw.experienceLevel || detectExperienceLevel(title, tags),
    remote: isRemote,
    isRemote,
    tags,
    descriptionSnippet,
    salary: raw.salary || '',
    fingerprint: fp
  };
}

/**
 * Base Scraper providing resilient HTTP fetch with UA rotation, timeout, exponential backoff, and HTML parsing
 */
class BaseScraper {
  constructor(name, options = {}) {
    this.name = name;
    this.timeout = options.timeout || 10000;
  }

  async fetchWithRetry(url, config = {}, maxRetries = 2, baseDelayMs = 250) {
    let lastError = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const headers = {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json,*/*;q=0.8',
          'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
          ...(config.headers || {})
        };

        const res = await axios({
          url,
          timeout: this.timeout,
          ...config,
          headers
        });

        return res;
      } catch (err) {
        lastError = err;
        if (attempt < maxRetries) {
          const delay = baseDelayMs * Math.pow(2, attempt);
          await sleep(delay);
        }
      }
    }
    throw lastError;
  }

  async fetchHtml(url, config = {}) {
    const res = await this.fetchWithRetry(url, { ...config, responseType: 'text' });
    return this.parseHtml(res.data);
  }

  async fetchJson(url, config = {}) {
    const res = await this.fetchWithRetry(url, { ...config, responseType: 'json' });
    return res.data;
  }

  parseHtml(html) {
    return cheerio.load(html || '');
  }

  normalize(raw) {
    return createJob({ ...raw, source: raw.source || this.name });
  }
}

module.exports = {
  BaseScraper,
  createJob,
  detectExperienceLevel,
  getRandomUserAgent
};
