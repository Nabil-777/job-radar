const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Searches WeWorkRemotely RSS feeds for programming and DevOps jobs
 */
async function searchWeWorkRemotely({ keywords = '', experienceLevel = 'all', limit = 20 }) {
  const feeds = [
    'https://weworkremotely.com/categories/remote-programming-jobs.rss',
    'https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss'
  ];

  const jobs = [];
  const kwLower = keywords.toLowerCase().trim();

  for (const feedUrl of feeds) {
    if (jobs.length >= limit) break;
    try {
      const res = await axios.get(feedUrl, { timeout: 7000 });
      const $ = cheerio.load(res.data, { xmlMode: true });

      $('item').each((i, el) => {
        if (jobs.length >= limit) return false;
        const item = $(el);

        const rawTitle = item.find('title').text().trim(); // typically "Company: Title"
        let company = 'Unknown Company';
        let title = rawTitle;

        if (rawTitle.includes(':')) {
          const parts = rawTitle.split(':');
          company = parts[0].trim();
          title = parts.slice(1).join(':').trim();
        }

        const link = item.find('link').text().trim();
        const pubDate = item.find('pubDate').text().trim();
        const description = item.find('description').text().trim();
        const lowerTitle = title.toLowerCase();
        const lowerDesc = description.toLowerCase();

        if (kwLower) {
          const matches = lowerTitle.includes(kwLower) ||
                          company.toLowerCase().includes(kwLower) ||
                          lowerDesc.includes(kwLower);
          if (!matches) return;
        }

        let detectedLevel = 'Entry / Mid';
        const isIntern = lowerTitle.includes('intern') || lowerDesc.includes('internship');
        const isJunior = lowerTitle.includes('junior') || lowerTitle.includes('entry') || lowerDesc.includes('entry level');
        const isSenior = lowerTitle.includes('senior') || lowerTitle.includes('lead') || lowerTitle.includes('principal');

        if (isIntern) detectedLevel = 'Internship';
        else if (isJunior) detectedLevel = 'Entry Level / Junior';
        else if (isSenior) detectedLevel = 'Senior';

        if (experienceLevel === 'internship' && !isIntern) return;
        if (experienceLevel === 'entry' && !isJunior && !isIntern) return;
        if (experienceLevel === 'senior' && !isSenior) return;

        let datePosted = 'Recently';
        if (pubDate) {
          try {
            datePosted = new Date(pubDate).toISOString().split('T')[0];
          } catch(e) {}
        }

        jobs.push({
          id: `wwr-${Buffer.from(link).toString('hex').slice(0, 10)}`,
          title,
          company,
          location: 'Remote (Worldwide)',
          url: link,
          datePosted,
          logo: '',
          source: 'WeWorkRemotely',
          experienceLevel: detectedLevel,
          remote: true,
          tags: ['remote', 'wwr', detectedLevel.toLowerCase()],
          descriptionSnippet: description.replace(/<[^>]*>?/gm, '').slice(0, 180) + '...'
        });
      });
    } catch (err) {
      console.error('WeWorkRemotely fetch error:', err.message);
    }
  }

  return jobs;
}

module.exports = { searchWeWorkRemotely };
