const axios = require('axios');

/**
 * Searches RemoteOK API for remote jobs
 */
async function searchRemoteOK({ keywords = '', experienceLevel = 'all', limit = 25 }) {
  try {
    const res = await axios.get('https://remoteok.com/api', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 8000
    });

    const data = Array.isArray(res.data) ? res.data.slice(1) : []; // first element is metadata
    const jobs = [];

    const kwLower = keywords.toLowerCase().trim();

    for (const item of data) {
      if (jobs.length >= limit) break;
      if (!item.position) continue;

      const title = item.position;
      const lowerTitle = title.toLowerCase();
      const tags = (item.tags || []).map(t => t.toLowerCase());
      const lowerDesc = (item.description || '').toLowerCase();

      // Check keywords match if specified
      if (kwLower) {
        const matches = lowerTitle.includes(kwLower) ||
                        tags.some(t => t.includes(kwLower)) ||
                        (item.company && item.company.toLowerCase().includes(kwLower));
        if (!matches) continue;
      }

      // Check level
      let detectedLevel = 'Entry / Mid';
      const isIntern = lowerTitle.includes('intern') || tags.includes('intern') || tags.includes('internship');
      const isJunior = lowerTitle.includes('junior') || lowerTitle.includes('entry') || tags.includes('junior');
      const isSenior = lowerTitle.includes('senior') || lowerTitle.includes('lead') || tags.includes('senior');

      if (isIntern) detectedLevel = 'Internship';
      else if (isJunior) detectedLevel = 'Entry Level / Junior';
      else if (isSenior) detectedLevel = 'Senior';

      if (experienceLevel === 'internship' && !isIntern) continue;
      if (experienceLevel === 'entry' && !isJunior && !isIntern) continue;
      if (experienceLevel === 'senior' && !isSenior) continue;

      jobs.push({
        id: `remoteok-${item.id}`,
        title: item.position,
        company: item.company || 'Unknown',
        location: item.location || 'Remote',
        url: item.url || `https://remoteok.com/l/${item.id}`,
        datePosted: item.date ? item.date.split('T')[0] : 'Recently',
        logo: item.company_logo || item.logo || '',
        source: 'RemoteOK',
        experienceLevel: detectedLevel,
        remote: true,
        tags: item.tags || [],
        salary: item.salary || '',
        descriptionSnippet: (item.description || '').replace(/<[^>]*>?/gm, '').slice(0, 200) + '...'
      });
    }

    return jobs;
  } catch (err) {
    console.error('RemoteOK API error:', err.message);
    return [];
  }
}

module.exports = { searchRemoteOK };
