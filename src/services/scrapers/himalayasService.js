const axios = require('axios');

/**
 * Searches Himalayas API for global remote tech jobs
 */
async function searchHimalayas({ keywords = '', experienceLevel = 'all', limit = 25 }) {
  try {
    const res = await axios.get('https://himalayas.app/jobs/api?limit=50', { timeout: 8000 });
    const rawJobs = res.data?.jobs || [];
    const jobs = [];
    const kwLower = keywords.toLowerCase().trim();

    for (const item of rawJobs) {
      if (jobs.length >= limit) break;
      if (!item.title) continue;

      const title = item.title;
      const lowerTitle = title.toLowerCase();
      const tags = (item.categories || []).concat(item.skills || []).map(t => t.toLowerCase());
      const lowerDesc = (item.excerpt || '').toLowerCase();

      if (kwLower) {
        const matches = lowerTitle.includes(kwLower) ||
                        tags.some(t => t.includes(kwLower)) ||
                        (item.companyName && item.companyName.toLowerCase().includes(kwLower));
        if (!matches) continue;
      }

      const seniorityStr = Array.isArray(item.seniority) ? item.seniority.join(' ').toLowerCase() : (item.seniority || '').toString().toLowerCase();

      let detectedLevel = 'Entry / Mid';
      const isIntern = lowerTitle.includes('intern') || tags.includes('internship') || seniorityStr.includes('intern');
      const isJunior = lowerTitle.includes('junior') || lowerTitle.includes('entry') || seniorityStr.includes('entry') || seniorityStr.includes('junior');
      const isSenior = lowerTitle.includes('senior') || lowerTitle.includes('lead') || seniorityStr.includes('senior');

      if (isIntern) detectedLevel = 'Internship';
      else if (isJunior) detectedLevel = 'Entry Level / Junior';
      else if (isSenior) detectedLevel = 'Senior';

      if (experienceLevel === 'internship' && !isIntern) continue;
      if (experienceLevel === 'entry' && !isJunior && !isIntern) continue;
      if (experienceLevel === 'senior' && !isSenior) continue;

      const salaryStr = item.minSalary && item.maxSalary
        ? `$${item.minSalary.toLocaleString()} - $${item.maxSalary.toLocaleString()} ${item.currency || 'USD'}`
        : '';

      jobs.push({
        id: `himalayas-${item.id || item.slug || Math.random().toString(36).substring(7)}`,
        title: item.title,
        company: item.companyName || 'Unknown',
        location: item.locationRestrictions?.length > 0 ? item.locationRestrictions.join(', ') : 'Remote (Worldwide)',
        url: item.applicationUrl || `https://himalayas.app/jobs/${item.slug}`,
        datePosted: item.publishedAt ? item.publishedAt.split('T')[0] : 'Recently',
        logo: item.companyLogo || '',
        source: 'Himalayas',
        experienceLevel: detectedLevel,
        remote: true,
        tags: (item.skills || []).slice(0, 5),
        salary: salaryStr,
        descriptionSnippet: item.excerpt || ''
      });
    }

    return jobs;
  } catch (err) {
    console.error('Himalayas API error:', err.message);
    return [];
  }
}

module.exports = { searchHimalayas };
