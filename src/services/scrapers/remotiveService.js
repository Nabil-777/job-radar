const axios = require('axios');

/**
 * Searches Remotive API for remote developer, AI, cybersecurity, and tech jobs
 */
async function searchRemotive({ keywords = '', category = '', experienceLevel = 'all', limit = 30 }) {
  try {
    let url = 'https://remotive.com/api/remote-jobs';
    const params = [];
    if (keywords) params.push(`search=${encodeURIComponent(keywords)}`);
    if (category) params.push(`category=${encodeURIComponent(category)}`);
    if (params.length > 0) url += `?${params.join('&')}`;

    const res = await axios.get(url, { timeout: 8000 });
    const rawJobs = res.data?.jobs || [];

    const jobs = [];
    for (const j of rawJobs) {
      if (jobs.length >= limit) break;

      const title = j.title || '';
      const lowerTitle = title.toLowerCase();
      const lowerDesc = (j.description || '').toLowerCase();

      // Experience level filtering
      let detectedLevel = 'Entry / Mid';
      const isIntern = lowerTitle.includes('intern') || lowerTitle.includes('trainee') || lowerDesc.includes('internship');
      const isJunior = lowerTitle.includes('junior') || lowerTitle.includes('entry') || lowerTitle.includes('graduat') || lowerDesc.includes('0-2 years') || lowerDesc.includes('entry level');
      const isSenior = lowerTitle.includes('senior') || lowerTitle.includes('lead') || lowerTitle.includes('principal') || lowerTitle.includes('staff');

      if (isIntern) detectedLevel = 'Internship';
      else if (isJunior) detectedLevel = 'Entry Level / Junior';
      else if (isSenior) detectedLevel = 'Senior';

      if (experienceLevel === 'internship' && !isIntern) continue;
      if (experienceLevel === 'entry' && !isJunior && !isIntern) continue;
      if (experienceLevel === 'senior' && !isSenior) continue;

      jobs.push({
        id: `remotive-${j.id}`,
        title: j.title,
        company: j.company_name,
        location: j.candidate_required_location || 'Remote (Worldwide)',
        url: j.url,
        datePosted: j.publication_date ? j.publication_date.split('T')[0] : 'Recently',
        logo: j.company_logo || '',
        source: 'Remotive',
        experienceLevel: detectedLevel,
        remote: true,
        tags: j.tags || [],
        salary: j.salary || '',
        descriptionSnippet: (j.description || '').replace(/<[^>]*>?/gm, '').slice(0, 200) + '...'
      });
    }

    return jobs;
  } catch (err) {
    console.error('Remotive API error:', err.message);
    return [];
  }
}

module.exports = { searchRemotive };
