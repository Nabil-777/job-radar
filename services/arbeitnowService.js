const axios = require('axios');

/**
 * Searches Arbeitnow API for jobs (Tech, Remote, Europe, Global, with visa/intern/junior options)
 */
async function searchArbeitnow({ keywords = '', experienceLevel = 'all', limit = 25 }) {
  try {
    const res = await axios.get('https://www.arbeitnow.com/api/job-board-api', {
      headers: { 'User-Agent': 'JobRadar/1.0' },
      timeout: 8000
    });

    const data = res.data?.data || [];
    const jobs = [];
    const kwLower = keywords.toLowerCase().trim();

    for (const item of data) {
      if (jobs.length >= limit) break;
      if (!item.title) continue;

      const title = item.title;
      const lowerTitle = title.toLowerCase();
      const tags = (item.tags || []).map(t => t.toLowerCase());
      const lowerDesc = (item.description || '').toLowerCase();

      if (kwLower) {
        const matches = lowerTitle.includes(kwLower) ||
                        tags.some(t => t.includes(kwLower)) ||
                        (item.company_name && item.company_name.toLowerCase().includes(kwLower));
        if (!matches) continue;
      }

      let detectedLevel = 'Entry / Mid';
      const isIntern = lowerTitle.includes('intern') || tags.includes('internship') || tags.includes('trainee');
      const isJunior = lowerTitle.includes('junior') || lowerTitle.includes('entry') || tags.includes('junior');
      const isSenior = lowerTitle.includes('senior') || lowerTitle.includes('lead') || tags.includes('senior');

      if (isIntern) detectedLevel = 'Internship';
      else if (isJunior) detectedLevel = 'Entry Level / Junior';
      else if (isSenior) detectedLevel = 'Senior';

      if (experienceLevel === 'internship' && !isIntern) continue;
      if (experienceLevel === 'entry' && !isJunior && !isIntern) continue;
      if (experienceLevel === 'senior' && !isSenior) continue;

      const dateStr = item.created_at ? new Date(item.created_at * 1000).toISOString().split('T')[0] : 'Recently';

      jobs.push({
        id: `arbeitnow-${item.slug || Math.random().toString(36).substring(7)}`,
        title: item.title,
        company: item.company_name || 'Unknown',
        location: item.location || (item.remote ? 'Remote' : 'Europe'),
        url: item.url,
        datePosted: dateStr,
        logo: '',
        source: 'Arbeitnow',
        experienceLevel: detectedLevel,
        remote: item.remote || false,
        tags: item.tags || [],
        descriptionSnippet: (item.description || '').replace(/<[^>]*>?/gm, '').slice(0, 200) + '...'
      });
    }

    return jobs;
  } catch (err) {
    console.error('Arbeitnow API error:', err.message);
    return [];
  }
}

module.exports = { searchArbeitnow };
