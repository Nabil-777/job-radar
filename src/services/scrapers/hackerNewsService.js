const axios = require('axios');

/**
 * Fetches hiring postings from the latest Y Combinator / Hacker News "Who is hiring?" thread
 */
async function searchHackerNews({ keywords = '', experienceLevel = 'all', limit = 15 }) {
  try {
    const userRes = await axios.get('https://hacker-news.firebaseio.com/v0/user/whoishiring.json', { timeout: 6000 });
    const user = userRes.data;
    if (!user || !user.submitted || user.submitted.length === 0) return [];

    const threadId = user.submitted[0];
    const threadRes = await axios.get(`https://hacker-news.firebaseio.com/v0/item/${threadId}.json`, { timeout: 6000 });
    const kids = threadRes.data?.kids || [];

    const jobs = [];
    const kwLower = keywords.toLowerCase().trim();

    // Fetch first 30 top comments
    const topKids = kids.slice(0, 35);
    const commentPromises = topKids.map(id =>
      axios.get(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, { timeout: 5000 })
           .then(r => r.data)
           .catch(() => null)
    );

    const comments = await Promise.all(commentPromises);

    for (const c of comments) {
      if (!c || !c.text) continue;
      if (jobs.length >= limit) break;

      const rawText = c.text.replace(/<[^>]*>?/gm, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&');
      const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
      const firstLine = lines[0] || rawText.slice(0, 80);

      // Extract Company and Title from header like "Stripe | Software Engineer | San Francisco | REMOTE"
      const parts = firstLine.split('|').map(p => p.trim());
      const company = parts[0] || 'Tech Startup (YC)';
      const title = parts[1] || 'Software / AI Engineer';
      const loc = parts[2] || 'Remote / Hybrid';

      const fullLower = rawText.toLowerCase();

      if (kwLower) {
        const matches = fullLower.includes(kwLower);
        if (!matches) continue;
      }

      let detectedLevel = 'Entry / Mid';
      const isIntern = fullLower.includes('intern') || fullLower.includes('internship');
      const isJunior = fullLower.includes('junior') || fullLower.includes('entry');
      const isSenior = fullLower.includes('senior') || fullLower.includes('lead');

      if (isIntern) detectedLevel = 'Internship';
      else if (isJunior) detectedLevel = 'Entry Level / Junior';
      else if (isSenior) detectedLevel = 'Senior';

      if (experienceLevel === 'internship' && !isIntern) continue;
      if (experienceLevel === 'entry' && !isJunior && !isIntern) continue;

      const dateStr = c.time ? new Date(c.time * 1000).toISOString().split('T')[0] : 'Recently';
      const hnUrl = `https://news.ycombinator.com/item?id=${c.id}`;

      jobs.push({
        id: `hn-${c.id}`,
        title: `${title} (${company})`,
        company,
        location: loc,
        url: hnUrl,
        datePosted: dateStr,
        logo: '',
        source: 'HackerNews (YC)',
        experienceLevel: detectedLevel,
        remote: fullLower.includes('remote'),
        tags: ['startup', 'y-combinator', detectedLevel.toLowerCase()],
        descriptionSnippet: rawText.slice(0, 180) + '...'
      });
    }

    return jobs;
  } catch (err) {
    console.error('HackerNews hiring error:', err.message);
    return [];
  }
}

module.exports = { searchHackerNews };
