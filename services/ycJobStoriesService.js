const axios = require('axios');

/**
 * Fetches official Y Combinator startup job stories from Hacker News API
 */
async function searchYCJobs({ keywords = '', experienceLevel = 'all', limit = 15 }) {
  try {
    const res = await axios.get('https://hacker-news.firebaseio.com/v0/jobstories.json', { timeout: 6000 });
    const ids = res.data || [];
    const topIds = ids.slice(0, 25);

    const promises = topIds.map(id =>
      axios.get(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, { timeout: 5000 })
           .then(r => r.data)
           .catch(() => null)
    );

    const items = await Promise.all(promises);
    const jobs = [];
    const kwLower = keywords.toLowerCase().trim();

    for (const item of items) {
      if (!item || !item.title) continue;
      if (jobs.length >= limit) break;

      const title = item.title;
      const lowerTitle = title.toLowerCase();

      if (kwLower && !lowerTitle.includes(kwLower)) {
        continue;
      }

      let detectedLevel = 'Entry / Mid';
      const isIntern = lowerTitle.includes('intern');
      const isJunior = lowerTitle.includes('junior') || lowerTitle.includes('entry');
      const isSenior = lowerTitle.includes('senior') || lowerTitle.includes('lead');

      if (isIntern) detectedLevel = 'Internship';
      else if (isJunior) detectedLevel = 'Entry Level / Junior';
      else if (isSenior) detectedLevel = 'Senior';

      if (experienceLevel === 'internship' && !isIntern) continue;
      if (experienceLevel === 'entry' && !isJunior && !isIntern) continue;

      const dateStr = item.time ? new Date(item.time * 1000).toISOString().split('T')[0] : 'Recently';

      jobs.push({
        id: `yc-${item.id}`,
        title,
        company: 'Y Combinator Startup',
        location: lowerTitle.includes('remote') ? 'Remote (Worldwide)' : 'US / Remote',
        url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
        datePosted: dateStr,
        logo: '',
        source: 'Y Combinator (YC)',
        experienceLevel: detectedLevel,
        remote: lowerTitle.includes('remote'),
        tags: ['y-combinator', 'startup', detectedLevel.toLowerCase()]
      });
    }

    return jobs;
  } catch (err) {
    console.error('YC Job Stories error:', err.message);
    return [];
  }
}

module.exports = { searchYCJobs };
