const cheerio = require('cheerio');
const { db } = require('../db/database');
const { httpClient } = require('../utils/httpClient');
const { generateFingerprint } = require('../utils/fingerprint');

// In-memory cache for custom provider results: key -> { data, timestamp }
const feedCache = new Map();
const FEED_TTL = 5 * 60 * 1000; // 5 minutes

function getCustomProviders() {
  try {
    const rows = db.prepare('SELECT * FROM custom_providers ORDER BY created_at DESC').all();
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      url: r.url,
      type: r.type,
      category: r.category,
      active: r.enabled === 1,
      enabled: r.enabled === 1
    }));
  } catch (err) {
    console.error('[CustomProviders] SQLite read error:', err.message);
    return [];
  }
}

function addCustomProvider(providerData) {
  const id = `custom-${Date.now()}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO custom_providers (id, name, url, type, category, enabled, created_at)
    VALUES (?, ?, ?, ?, ?, 1, ?)
  `).run(
    id,
    providerData.name || 'Custom Feed',
    providerData.url,
    providerData.type || 'rss',
    providerData.category || 'all',
    now
  );

  feedCache.clear();
  return { id, name: providerData.name, url: providerData.url, type: providerData.type, active: true };
}

function removeCustomProvider(id) {
  db.prepare('DELETE FROM custom_providers WHERE id = ?').run(id);
  feedCache.clear();
  return true;
}

function toggleCustomProvider(id) {
  const target = db.prepare('SELECT * FROM custom_providers WHERE id = ?').get(id);
  if (target) {
    const nextVal = target.enabled === 1 ? 0 : 1;
    db.prepare('UPDATE custom_providers SET enabled = ? WHERE id = ?').run(nextVal, id);
    feedCache.clear();
    return { ...target, enabled: nextVal, active: nextVal === 1 };
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
      const res = await httpClient.get(provider.url, { timeout: 8000 });
      const $ = cheerio.load(res.data, { xmlMode: true });

      $('item').each((i, el) => {
        if (jobs.length >= limit) return false;

        const rawTitle = $(el).find('title').text().trim();
        const rawLink = $(el).find('link').text().trim() || $(el).find('guid').text().trim();
        const pubDate = $(el).find('pubDate').text().trim();
        const desc = $(el).find('description').text().replace(/<[^>]+>/g, ' ').trim();

        if (!rawTitle || !rawLink) return;

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

        let detectedLevel = 'Entry / Mid';
        const isIntern = lowerTitle.includes('intern') || lowerTitle.includes('stage') || lowerTitle.includes('pfe') || lowerTitle.includes('co-op') || lowerTitle.includes('trainee');
        const isJunior = lowerTitle.includes('junior') || lowerTitle.includes('entry') || lowerTitle.includes('débutant') || lowerTitle.includes('associate');
        const isSenior = lowerTitle.includes('senior') || lowerTitle.includes('lead') || lowerTitle.includes('principal') || lowerTitle.includes('staff');

        if (isIntern) detectedLevel = 'Internship';
        else if (isJunior) detectedLevel = 'Entry Level / Junior';
        else if (isSenior) detectedLevel = 'Senior';

        if (experienceLevel === 'internship' && !isIntern) return;
        if (experienceLevel === 'entry' && !isJunior && !isIntern) return;

        const jobItem = {
          id: `custom-${Buffer.from(rawLink).toString('hex').slice(0, 10)}`,
          title,
          company,
          location: 'Remote / Global',
          url: rawLink,
          datePosted: pubDate ? new Date(pubDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recently',
          logo: '',
          source: provider.name,
          experienceLevel: detectedLevel,
          contractType: detectedLevel === 'Internship' ? 'Stage / PFE' : 'CDI',
          remote: true,
          descriptionSnippet: desc.slice(0, 160),
          tags: ['Custom Feed', 'RSS', detectedLevel.toLowerCase()]
        };

        jobItem.fingerprint = generateFingerprint(jobItem);
        jobs.push(jobItem);
      });
    } else if (provider.type === 'json') {
      const res = await httpClient.get(provider.url, { timeout: 8000 });
      const items = Array.isArray(res.data) ? res.data : (res.data.jobs || res.data.data || []);

      items.slice(0, limit).forEach(item => {
        const title = item.title || item.position || item.name || '';
        const link = item.url || item.link || item.apply_url || '';
        const company = item.company || item.company_name || provider.name;
        if (!title || !link) return;

        const jobItem = {
          id: `custom-json-${Buffer.from(link).toString('hex').slice(0, 10)}`,
          title,
          company,
          location: item.location || 'Remote',
          url: link,
          datePosted: 'Recently',
          logo: item.logo || '',
          source: provider.name,
          experienceLevel: 'Entry / Mid',
          contractType: 'CDI',
          remote: true,
          tags: ['Custom Provider', 'JSON API']
        };

        jobItem.fingerprint = generateFingerprint(jobItem);
        jobs.push(jobItem);
      });
    }

    feedCache.set(cacheKey, { data: jobs, timestamp: Date.now() });
    return jobs;
  } catch (err) {
    console.warn(`[Custom Provider] Skipped feed "${provider.name}" (${err.message})`);
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
      .catch(() => [])
  );

  const results = await Promise.all(tasks);
  return results.flat();
}

module.exports = {
  getCustomProviders,
  addCustomProvider,
  removeCustomProvider,
  toggleCustomProvider,
  searchCustomProviders
};
