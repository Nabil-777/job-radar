const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const PROVIDERS_FILE = path.join(__dirname, '..', 'data', 'custom_providers.json');

// In-memory cache for custom provider results: key -> { data, timestamp }
const feedCache = new Map();
const FEED_TTL = 5 * 60 * 1000; // 5 minutes

function ensureFile() {
  if (!fs.existsSync(PROVIDERS_FILE)) {
    fs.writeFileSync(PROVIDERS_FILE, '[]', 'utf8');
  }
}

function getCustomProviders() {
  ensureFile();
  try {
    const raw = fs.readFileSync(PROVIDERS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading custom_providers.json:', err.message);
    return [];
  }
}

function saveCustomProviders(providers) {
  ensureFile();
  fs.writeFileSync(PROVIDERS_FILE, JSON.stringify(providers, null, 2), 'utf8');
}

function addCustomProvider(providerData) {
  const list = getCustomProviders();
  const id = `custom-${Date.now()}`;
  const newProvider = {
    id,
    name: providerData.name || 'Custom Feed',
    type: providerData.type || 'rss', // 'rss', 'json', 'scraper'
    url: providerData.url,
    category: providerData.category || 'all',
    active: providerData.active !== undefined ? providerData.active : true,
    addedAt: new Date().toISOString()
  };

  list.push(newProvider);
  saveCustomProviders(list);
  feedCache.clear();
  return newProvider;
}

function removeCustomProvider(id) {
  let list = getCustomProviders();
  list = list.filter(p => p.id !== id);
  saveCustomProviders(list);
  feedCache.clear();
  return true;
}

function toggleCustomProvider(id) {
  const list = getCustomProviders();
  const target = list.find(p => p.id === id);
  if (target) {
    target.active = !target.active;
    saveCustomProviders(list);
    feedCache.clear();
    return target;
  }
  return null;
}

/**
 * Executes a single custom provider and returns normalized job items
 */
async function fetchProviderJobs(provider, { keywords = '', experienceLevel = 'all', limit = 20 }) {
  const cacheKey = `${provider.id}-${keywords}-${experienceLevel}`;
  const cached = feedCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < FEED_TTL)) {
    return cached.data;
  }

  const jobs = [];
  const kwLower = keywords.toLowerCase().trim();

  try {
    if (provider.type === 'rss') {
      const res = await axios.get(provider.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(res.data, { xmlMode: true });
      $('item').each((i, el) => {
        if (jobs.length >= limit) return false;

        const rawTitle = $(el).find('title').text().trim();
        const rawLink = $(el).find('link').text().trim() || $(el).find('guid').text().trim();
        const pubDate = $(el).find('pubDate').text().trim();
        const desc = $(el).find('description').text().replace(/<[^>]+>/g, ' ').trim();

        if (!rawTitle || !rawLink) return;

        // Split "Company: Title" or "[Company] Title" format common in RSS feeds
        let company = provider.name;
        let title = rawTitle;
        if (rawTitle.includes(':')) {
          const parts = rawTitle.split(':');
          company = parts[0].trim();
          title = parts.slice(1).join(':').trim();
        } else if (rawTitle.startsWith('[') && rawTitle.includes(']')) {
          const closeIdx = rawTitle.indexOf(']');
          company = rawTitle.slice(1, closeIdx).trim();
          title = rawTitle.slice(closeIdx + 1).trim();
        }

        const lowerTitle = title.toLowerCase();
        const lowerComp = company.toLowerCase();

        // Keyword filter
        if (kwLower && kwLower !== 'software engineer') {
          const tokens = kwLower.split(/\s+/).filter(t => t.length > 2);
          if (tokens.length > 0 && !tokens.some(t => lowerTitle.includes(t) || lowerComp.includes(t) || desc.toLowerCase().includes(t))) {
            return;
          }
        }

        // Detect experience level
        let detectedLevel = 'Entry / Mid';
        const isIntern = lowerTitle.includes('intern') || lowerTitle.includes('stage') || lowerTitle.includes('pfe') || lowerTitle.includes('co-op') || lowerTitle.includes('trainee');
        const isJunior = lowerTitle.includes('junior') || lowerTitle.includes('entry') || lowerTitle.includes('débutant') || lowerTitle.includes('associate');
        const isSenior = lowerTitle.includes('senior') || lowerTitle.includes('lead') || lowerTitle.includes('principal') || lowerTitle.includes('staff');

        if (isIntern) detectedLevel = 'Internship';
        else if (isJunior) detectedLevel = 'Entry Level / Junior';
        else if (isSenior) detectedLevel = 'Senior';

        if (experienceLevel === 'internship' && !isIntern) return;
        if (experienceLevel === 'entry' && !isJunior && !isIntern) return;

        jobs.push({
          id: `custom-${Buffer.from(rawLink).toString('hex').slice(0, 10)}`,
          title,
          company,
          location: 'Remote / Global',
          url: rawLink,
          datePosted: pubDate ? new Date(pubDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recently',
          logo: '',
          source: provider.name,
          experienceLevel: detectedLevel,
          remote: true,
          descriptionSnippet: desc.slice(0, 160),
          tags: ['Custom Provider', 'RSS', detectedLevel.toLowerCase()]
        });
      });
    } else if (provider.type === 'json') {
      const res = await axios.get(provider.url, { timeout: 10000 });
      const items = Array.isArray(res.data) ? res.data : (res.data.jobs || res.data.data || []);

      items.slice(0, limit).forEach(item => {
        const title = item.title || item.position || item.name || '';
        const link = item.url || item.link || item.apply_url || '';
        const company = item.company || item.company_name || provider.name;
        if (!title || !link) return;

        jobs.push({
          id: `custom-json-${Buffer.from(link).toString('hex').slice(0, 10)}`,
          title,
          company,
          location: item.location || 'Remote',
          url: link,
          datePosted: 'Recently',
          logo: item.logo || '',
          source: provider.name,
          experienceLevel: 'Entry / Mid',
          remote: true,
          tags: ['Custom Provider', 'JSON API']
        });
      });
    }

    feedCache.set(cacheKey, { data: jobs, timestamp: Date.now() });
    return jobs;
  } catch (err) {
    console.error(`Error querying custom provider "${provider.name}":`, err.message);
    return [];
  }
}

/**
 * Searches across all active custom providers concurrently
 */
async function searchCustomProviders({ keywords = '', experienceLevel = 'all', limit = 20 }) {
  const providers = getCustomProviders().filter(p => p.active);
  if (providers.length === 0) return [];

  const tasks = providers.map(p =>
    fetchProviderJobs(p, { keywords, experienceLevel, limit: Math.ceil(limit / providers.length) + 5 })
      .catch(err => {
        console.error(`Provider error [${p.name}]:`, err.message);
        return [];
      })
  );

  const results = await Promise.all(tasks);
  return results.flat();
}

module.exports = {
  getCustomProviders,
  saveCustomProviders,
  addCustomProvider,
  removeCustomProvider,
  toggleCustomProvider,
  searchCustomProviders
};
