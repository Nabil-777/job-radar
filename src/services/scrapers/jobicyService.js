const axios = require('axios');

/**
 * Searches Jobicy API for remote tech jobs
 */
async function searchJobicy({ keywords = '', experienceLevel = 'all', limit = 25 }) {
  try {
    const res = await axios.get('https://jobicy.com/api/v2/remote-jobs?count=50', { timeout: 8000 });
    const rawJobs = res.data?.jobs || [];
    const jobs = [];
    const kwLower = keywords.toLowerCase().trim();

    for (const item of rawJobs) {
      if (jobs.length >= limit) break;
      if (!item.jobTitle) continue;

      const title = item.jobTitle;
      const lowerTitle = title.toLowerCase();
      const ind = Array.isArray(item.jobIndustries) ? item.jobIndustries.join(' ') : (item.jobIndustries || '');
      const geo = Array.isArray(item.jobGeo) ? item.jobGeo.join(' ') : (item.jobGeo || '');
      const tags = `${ind} ${geo}`.toLowerCase();
      const lowerDesc = (item.jobExcerpt || '').toLowerCase();

      if (kwLower) {
        const matches = lowerTitle.includes(kwLower) ||
                        tags.includes(kwLower) ||
                        (item.companyName && item.companyName.toLowerCase().includes(kwLower));
        if (!matches) continue;
      }

      let detectedLevel = 'Entry / Mid';
      const isIntern = lowerTitle.includes('intern') || (item.jobLevel || '').toLowerCase().includes('intern') || lowerDesc.includes('internship');
      const isJunior = lowerTitle.includes('junior') || lowerTitle.includes('entry') || (item.jobLevel || '').toLowerCase().includes('entry');
      const isSenior = lowerTitle.includes('senior') || lowerTitle.includes('lead') || (item.jobLevel || '').toLowerCase().includes('senior');

      if (isIntern) detectedLevel = 'Internship';
      else if (isJunior) detectedLevel = 'Entry Level / Junior';
      else if (isSenior) detectedLevel = 'Senior';

      if (experienceLevel === 'internship' && !isIntern) continue;
      if (experienceLevel === 'entry' && !isJunior && !isIntern) continue;
      if (experienceLevel === 'senior' && !isSenior) continue;

      jobs.push({
        id: `jobicy-${item.id}`,
        title: item.jobTitle,
        company: item.companyName || 'Unknown',
        location: item.jobGeo || 'Remote (Worldwide)',
        url: item.url,
        datePosted: item.pubDate ? item.pubDate.split(' ')[0] : 'Recently',
        logo: item.companyLogo || '',
        source: 'Jobicy',
        experienceLevel: detectedLevel,
        remote: true,
        tags: [item.jobType || 'Remote', detectedLevel.toLowerCase()],
        salary: item.annualSalaryMin ? `$${item.annualSalaryMin.toLocaleString()} - $${item.annualSalaryMax?.toLocaleString()} ${item.salaryCurrency || ''}` : '',
        descriptionSnippet: item.jobExcerpt ? item.jobExcerpt.replace(/<[^>]*>?/gm, '').slice(0, 180) + '...' : ''
      });
    }

    return jobs;
  } catch (err) {
    console.error('Jobicy API error:', err.message);
    return [];
  }
}

module.exports = { searchJobicy };
