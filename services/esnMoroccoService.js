const { searchLinkedIn } = require('./linkedinScraper');

// The Major Multinational ESNs & Tech Recruiter Hubs in Morocco
const TOP_MOROCCO_ESNS = [
  { name: 'Capgemini Engineering / TS Maroc', sites: 'Casablanca (Nearshore), Rabat', careersUrl: 'https://www.capgemini.com/ma-en/careers/' },
  { name: 'DXC Technology Maroc', sites: 'Technopolis Rabat, Casablanca', careersUrl: 'https://dxc.com/careers' },
  { name: 'CGI Maroc', sites: 'Rabat, Casablanca, Fès', careersUrl: 'https://www.cgi.com/fr/carrieres-maroc' },
  { name: 'Alten Maroc', sites: 'Rabat, Fès, Tétouan, Casablanca', careersUrl: 'https://www.alten.ma/carrieres/' },
  { name: 'Inetum Maroc', sites: 'Casablanca Nearshore', careersUrl: 'https://www.inetum.com/fr/carrieres' },
  { name: 'SQLI Maroc', sites: 'Rabat, Casablanca, Oujda', careersUrl: 'https://www.sqli.com/fr/maroc/carrieres' },
  { name: 'Atos / Eviden Maroc', sites: 'Casablanca, Rabat', careersUrl: 'https://atos.net/fr/carrieres' },
  { name: 'Sofrecom Maroc (Orange IT)', sites: 'Casablanca Nearshore, Rabat', careersUrl: 'https://www.sofrecom.com/fr/carrieres/nos-offres.html' },
  { name: 'Sopra Steria Maroc', sites: 'Casablanca', careersUrl: 'https://www.soprasteria.ma/carrieres' },
  { name: 'Oracle Labs Maroc (R&D)', sites: 'Casablanca, Rabat Technopolis', careersUrl: 'https://www.oracle.com/corporate/careers/' }
];

/**
 * Searches live openings from the top multinational ESNs and IT giants in Morocco
 */
async function searchMoroccoESNs({ keywords = '', experienceLevel = 'all', limit = 25 }) {
  try {
    // ESN search query
    let query = 'Capgemini OR DXC OR CGI OR Alten OR Inetum OR SQLI OR Atos OR Sofrecom OR Oracle';
    if (keywords) {
      query = `${keywords} (${query})`;
    }

    if (experienceLevel === 'internship') {
      query = `stage PFE (${query})`;
    }

    const jobs = await searchLinkedIn({
      keywords: query,
      location: 'Morocco',
      experienceLevel,
      limit: Math.min(limit, 30)
    });

    return jobs.map(j => ({
      ...j,
      source: 'Morocco Top ESN Hub',
      tags: ['Maroc ESN', 'Nearshore', j.experienceLevel.toLowerCase()]
    }));
  } catch (err) {
    console.error('Morocco ESN Hub error:', err.message);
    return [];
  }
}

module.exports = {
  searchMoroccoESNs,
  TOP_MOROCCO_ESNS
};
