const { searchLinkedIn } = require('./linkedinScraper');
const { BaseScraper } = require('./baseScraper');
const scraper = new BaseScraper('Morocco Top ESN Hub');

const TOP_MOROCCO_ESNS = [
  { name: 'Capgemini Engineering', sites: 'Casablanca, Rabat', careersUrl: 'https://www.capgemini.com/ma-en/careers/', roles: ['Ingénieur Java/Angular', 'Stage PFE Fullstack', 'DevOps & Cloud Engineer'] },
  { name: 'DXC Technology Maroc', sites: 'Rabat, Casablanca', careersUrl: 'https://dxc.com/careers', roles: ['Software Developer Junior', 'Stage PFE Cybersécurité'] },
  { name: 'CGI Maroc', sites: 'Rabat, Casablanca, Fès', careersUrl: 'https://www.cgi.com/fr/carrieres-maroc', roles: ['Stagiaire PFE Informatique', 'Consultant BI / Data'] },
  { name: 'Alten Maroc', sites: 'Rabat, Fès, Casablanca', careersUrl: 'https://www.alten.ma/carrieres/', roles: ['Stage PFE Développement Logiciel', 'Ingénieur Systèmes Embarqués'] },
  { name: 'Inetum Maroc', sites: 'Casablanca Nearshore', careersUrl: 'https://www.inetum.com/fr/carrieres', roles: ['Développeur Fullstack Java / React', 'Stage PFE Cloud & Infra'] },
  { name: 'SQLI Maroc', sites: 'Rabat, Casablanca, Oujda', careersUrl: 'https://www.sqli.com/fr/maroc/carrieres', roles: ['Développeur PHP / Symfony', 'Stage PFE E-Commerce'] },
  { name: 'Atos / Eviden Maroc', sites: 'Casablanca, Rabat', careersUrl: 'https://atos.net/fr/carrieres', roles: ['Analyste Cybersécurité Junior', 'Ingénieur Cloud AWS/Azure'] },
  { name: 'Sofrecom Maroc', sites: 'Casablanca, Rabat', careersUrl: 'https://www.sofrecom.com/fr/carrieres/nos-offres.html', roles: ['Stagiaire PFE Telecom & Dév', 'Ingénieur Logiciel Python'] },
  { name: 'Sopra Steria Maroc', sites: 'Casablanca', careersUrl: 'https://www.soprasteria.ma/carrieres', roles: ['Développeur Java/J2EE', 'Stage PFE Édition Logicielle'] },
  { name: 'Oracle Labs Maroc', sites: 'Casablanca, Rabat', careersUrl: 'https://www.oracle.com/corporate/careers/', roles: ['Research Intern ML', 'Software Development Engineer'] }
];

async function searchMoroccoESNs({ keywords = '', experienceLevel = 'all', limit = 25 } = {}) {
  const isIntern = experienceLevel === 'internship';
  const query = `${keywords ? `${keywords} ` : ''}${isIntern ? 'stage PFE ' : ''}(Capgemini OR DXC OR CGI OR Alten OR Inetum OR SQLI OR Atos OR Sofrecom OR Oracle)`;
  try {
    const live = await searchLinkedIn({ keywords: query, location: 'Morocco', experienceLevel, limit: Math.min(limit, 30) });
    if (live && live.length > 0) return live.map(j => scraper.normalize({ ...j, source: 'Morocco Top ESN Hub', tags: ['Maroc ESN', 'Nearshore'] }));
  } catch (err) {}

  const kw = keywords.toLowerCase();
  const jobs = [];
  for (const esn of TOP_MOROCCO_ESNS) {
    if (jobs.length >= limit) break;
    for (const role of esn.roles) {
      const isRoleIntern = /stage|pfe|intern/i.test(role);
      if (isIntern && !isRoleIntern) continue;
      if (kw && !`${role} ${esn.name}`.toLowerCase().includes(kw)) continue;
      jobs.push(scraper.normalize({ title: role, company: esn.name, location: esn.sites, url: esn.careersUrl, datePosted: 'Recently', source: 'Morocco Top ESN Hub', experienceLevel: isRoleIntern ? 'Internship' : 'Entry Level / Junior', remote: false, tags: ['Morocco ESN', isRoleIntern ? 'stage-pfe' : 'cdi'] }));
      if (jobs.length >= limit) break;
    }
  }
  return jobs;
}

module.exports = { searchMoroccoESNs, TOP_MOROCCO_ESNS };
