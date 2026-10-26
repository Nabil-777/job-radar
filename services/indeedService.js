const { scrapeJobs } = require('ts-jobspy');

/**
 * Searches Indeed via ts-jobspy engine
 * @param {Object} options
 * @param {string} options.keywords
 * @param {string} options.location
 * @param {string} options.experienceLevel - 'internship', 'entry', 'senior', 'all'
 * @param {string} options.workType - 'all', 'remote', 'onsite'
 * @param {number} options.limit
 */
async function searchIndeed({ keywords = 'software engineer', location = '', experienceLevel = 'all', workType = 'all', limit = 15 }) {
  try {
    let jobType = undefined;
    if (experienceLevel === 'internship') jobType = 'internship';
    else if (experienceLevel === 'entry') jobType = 'entry_level';

    const isRemote = workType === 'remote' || (location && location.toLowerCase().includes('remote'));

    // Construct search term
    let searchTerm = keywords;
    if (experienceLevel === 'internship' && !searchTerm.toLowerCase().includes('intern')) {
      searchTerm += ' intern';
    } else if (experienceLevel === 'entry' && !searchTerm.toLowerCase().includes('junior')) {
      searchTerm += ' junior';
    }

    const res = await scrapeJobs({
      sites: ['indeed'],
      searchTerm,
      location: isRemote ? 'Remote' : (location === 'Worldwide' ? '' : location),
      isRemote: isRemote ? true : undefined,
      jobType,
      resultsWanted: Math.min(limit, 20),
      timeoutMs: 12000
    });

    const rawList = res?.jobs || [];
    const jobs = [];

    for (const item of rawList) {
      if (!item.title || !item.jobUrl) continue;

      const lowerTitle = item.title.toLowerCase();
      const isSenior = lowerTitle.includes('senior') || lowerTitle.includes('lead') || lowerTitle.includes('principal') || lowerTitle.includes('director') || lowerTitle.includes('manager');

      if ((experienceLevel === 'internship' || experienceLevel === 'entry') && isSenior) {
        continue;
      }

      let detectedLevel = experienceLevel;
      if (lowerTitle.includes('intern') || lowerTitle.includes('trainee') || lowerTitle.includes('stage')) {
        detectedLevel = 'Internship';
      } else if (lowerTitle.includes('junior') || lowerTitle.includes('entry') || lowerTitle.includes('graduat')) {
        detectedLevel = 'Entry Level / Junior';
      } else if (isSenior) {
        detectedLevel = 'Senior';
      } else if (experienceLevel === 'all') {
        detectedLevel = 'Full-Time / Mid';
      }

      jobs.push({
        id: item.id || `in-${Buffer.from(item.title + item.company).toString('hex').slice(0, 10)}`,
        title: item.title,
        company: item.company || 'Unknown Company',
        location: item.location || (isRemote ? 'Remote' : 'Location Not Specified'),
        url: item.jobUrlDirect || item.jobUrl, // Direct apply link (Greenhouse/Lever) if available, else Indeed post
        datePosted: item.datePosted || 'Recently',
        logo: '',
        source: 'Indeed',
        experienceLevel: detectedLevel,
        remote: isRemote || (item.location && item.location.toLowerCase().includes('remote')),
        salary: item.salary?.min ? `$${item.salary.min.toLocaleString()} - $${item.salary.max?.toLocaleString()} ${item.salary.currency || ''}` : '',
        tags: [item.site || 'indeed', detectedLevel.toLowerCase()]
      });
    }

    return jobs;
  } catch (err) {
    console.error('Indeed search error:', err.message);
    return [];
  }
}

module.exports = { searchIndeed };
