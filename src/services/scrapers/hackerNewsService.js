const { BaseScraper } = require('./baseScraper');
const scraper = new BaseScraper('HackerNews (YC)');

async function searchHackerNews({ keywords = '', experienceLevel = 'all', limit = 15 } = {}) {
  try {
    const user = await scraper.fetchJson('https://hacker-news.firebaseio.com/v0/user/whoishiring.json');
    if (!user?.submitted?.length) return [];
    const thread = await scraper.fetchJson(`https://hacker-news.firebaseio.com/v0/item/${user.submitted[0]}.json`);
    const comments = await Promise.all(
      (thread?.kids || []).slice(0, 25).map(id => scraper.fetchJson(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).catch(() => null))
    );

    const jobs = [];
    const kwLower = keywords.toLowerCase().trim();
    for (const c of comments) {
      if (!c?.text || jobs.length >= limit) continue;
      const rawText = c.text.replace(/<[^>]*>?/gm, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&');
      const parts = (rawText.split('\n')[0] || rawText.slice(0, 80)).split('|').map(p => p.trim());
      if (kwLower && !rawText.toLowerCase().includes(kwLower)) continue;

      const job = scraper.normalize({
        id: `hn-${c.id}`,
        title: parts[1] || 'Software / AI Engineer',
        company: parts[0] || 'Tech Startup (YC)',
        location: parts[2] || 'Remote / Hybrid',
        url: `https://news.ycombinator.com/item?id=${c.id}`,
        datePosted: c.time ? new Date(c.time * 1000).toISOString() : new Date().toISOString(),
        remote: (parts[2] || '').toLowerCase().includes('remote') || rawText.toLowerCase().includes('remote'),
        tags: ['y-combinator', 'who-is-hiring', 'tech'],
        descriptionSnippet: rawText.slice(0, 260)
      });

      if (experienceLevel === 'internship' && job.experienceLevel !== 'Internship') continue;
      if (experienceLevel === 'entry' && !['Entry Level / Junior', 'Internship'].includes(job.experienceLevel)) continue;
      if (experienceLevel === 'senior' && job.experienceLevel !== 'Senior') continue;
      jobs.push(job);
    }
    return jobs;
  } catch (err) {
    return [];
  }
}

module.exports = { searchHackerNews };
