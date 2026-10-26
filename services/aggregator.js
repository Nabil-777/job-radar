const { searchLinkedIn } = require('./linkedinScraper');
const { searchIndeed } = require('./indeedService');
const { searchRekrute } = require('./rekruteService');
const { searchJobzyn } = require('./jobzynService');
const { searchWeTech } = require('./wetechService');
const { searchMoroccoESNs, TOP_MOROCCO_ESNS } = require('./esnMoroccoService');
const { searchTalentMorocco } = require('./talentMoroccoService');
const { searchDreamjob } = require('./dreamjobService');
const { searchSimplify } = require('./simplifyService');
const { searchRelocate } = require('./relocateService');
const { searchYCJobs } = require('./ycJobStoriesService');
const { searchHimalayas } = require('./himalayasService');
const { searchJobicy } = require('./jobicyService');
const { searchWeWorkRemotely } = require('./wwrService');
const { searchRemotive } = require('./remotiveService');
const { searchRemoteOK } = require('./remoteokService');
const { searchArbeitnow } = require('./arbeitnowService');
const { searchHackerNews } = require('./hackerNewsService');
const { searchEmploiMa } = require('./emploiMaService');
const { searchCustomProviders } = require('./customProvidersService');

// Domain presets with rich keywords for precision matching
const DOMAIN_PRESETS = {
  'ai': {
    name: 'AI & Machine Learning',
    keywords: 'AI engineer OR machine learning OR data science OR LLM OR deep learning',
    categoryRemotive: 'data',
    tags: ['ai', 'machine-learning', 'python', 'nlp', 'deep-learning', 'data-science']
  },
  'cybersecurity': {
    name: 'Cybersecurity & InfoSec',
    keywords: 'cybersecurity OR security engineer OR SOC analyst OR penetration tester OR infosec',
    categoryRemotive: 'devops-sysadmin',
    tags: ['cybersecurity', 'security', 'infosec', 'penetration-testing', 'soc', 'network-security']
  },
  'dev': {
    name: 'Software & Web Development',
    keywords: 'software engineer OR fullstack developer OR frontend OR backend OR web developer',
    categoryRemotive: 'software-dev',
    tags: ['javascript', 'python', 'react', 'node', 'fullstack', 'backend', 'frontend', 'java']
  },
  'cloud': {
    name: 'Cloud & DevOps / SRE',
    keywords: 'devops OR cloud engineer OR SRE OR AWS OR kubernetes OR terraform',
    categoryRemotive: 'devops-sysadmin',
    tags: ['devops', 'cloud', 'aws', 'docker', 'kubernetes', 'sre', 'ci-cd']
  },
  'data': {
    name: 'Data Engineering & Analytics',
    keywords: 'data engineer OR data analyst OR business intelligence OR SQL OR ETL',
    categoryRemotive: 'data',
    tags: ['data', 'sql', 'python', 'data-engineering', 'etl', 'analytics']
  },
  'mobile': {
    name: 'Mobile Development (iOS / Android / Flutter)',
    keywords: 'mobile developer OR react native OR flutter OR ios OR android',
    categoryRemotive: 'software-dev',
    tags: ['mobile', 'react-native', 'flutter', 'ios', 'android', 'swift', 'kotlin']
  }
};

// In-memory cache: key -> { data, timestamp }
const cache = new Map();
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes cache

/**
 * Aggregates jobs across ALL 18 configured sources
 */
async function searchJobs(options = {}) {
  const {
    domain = 'all',
    keywords = '',
    experienceLevel = 'all', // 'internship', 'entry', 'mid', 'senior', 'all'
    location = 'Worldwide',
    source = 'all',
    workType = 'all',
    limit = 100
  } = options;

  const cacheKey = JSON.stringify({ domain, keywords, experienceLevel, location, source, workType, limit });
  const cached = cache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return { ...cached.data, fromCache: true };
  }

  // Construct search query
  let finalKeywords = keywords.trim();
  let remotiveCategory = '';

  if (domain && DOMAIN_PRESETS[domain]) {
    const preset = DOMAIN_PRESETS[domain];
    if (!finalKeywords) {
      finalKeywords = preset.keywords;
    } else {
      finalKeywords = `${finalKeywords} ${domain}`;
    }
    remotiveCategory = preset.categoryRemotive;
  }

  // Specific query for location
  const isMorocco = location.toLowerCase().includes('morocco');
  const isRemoteOnly = workType === 'remote' || location.toLowerCase().includes('remote');

  // Clean primary keyword
  let cleanKw = keywords.trim();
  if (!cleanKw && domain !== 'all') {
    if (domain === 'ai') cleanKw = 'AI Machine Learning';
    else if (domain === 'cybersecurity') cleanKw = 'Cybersecurity';
    else if (domain === 'dev') cleanKw = 'Software Engineer Developer';
    else if (domain === 'cloud') cleanKw = 'DevOps Cloud Engineer';
    else if (domain === 'data') cleanKw = 'Data Analyst Engineer';
    else if (domain === 'mobile') cleanKw = 'Mobile Developer';
  } else if (!cleanKw) {
    cleanKw = 'software engineer';
  }

  const tasks = [];

  // 1. LinkedIn (Live Guest Scraper)
  if (source === 'all' || source === 'linkedin') {
    let liQuery = cleanKw;
    if (experienceLevel === 'internship' && isMorocco) {
      liQuery = `stage ${domain !== 'all' ? domain : 'informatique'}`;
    } else if (experienceLevel === 'internship' && !liQuery.toLowerCase().includes('intern')) {
      liQuery = `${liQuery} intern`;
    } else if (experienceLevel === 'entry' && !liQuery.toLowerCase().includes('junior')) {
      liQuery = `${liQuery} junior`;
    }

    tasks.push(
      searchLinkedIn({
        keywords: liQuery,
        location,
        experienceLevel,
        workType,
        limit: Math.min(limit, 25)
      }).catch(err => {
        console.error('LinkedIn error:', err.message);
        return [];
      })
    );
  }

  // 2. Indeed (Live via ts-jobspy crawler)
  if (source === 'all' || source === 'indeed') {
    tasks.push(
      searchIndeed({
        keywords: cleanKw,
        location: isMorocco ? 'Morocco' : (isRemoteOnly ? 'Remote' : location),
        experienceLevel,
        workType,
        limit: Math.min(limit, 15)
      }).catch(err => {
        console.error('Indeed error:', err.message);
        return [];
      })
    );
  }

  // 3. Talent.com Morocco (ma.talent.com)
  if ((source === 'all' || source === 'talent-morocco') && (isMorocco || location === 'Worldwide')) {
    tasks.push(
      searchTalentMorocco({
        keywords: cleanKw,
        experienceLevel,
        limit: Math.min(limit, 20)
      }).catch(err => {
        console.error('Talent.com Morocco error:', err.message);
        return [];
      })
    );
  }

  // 4. Jobzyn.com (Maroc Tech & Startups)
  if ((source === 'all' || source === 'jobzyn') && (isMorocco || location === 'Worldwide')) {
    tasks.push(
      searchJobzyn({
        keywords: cleanKw,
        experienceLevel,
        limit: Math.min(limit, 20)
      }).catch(err => {
        console.error('Jobzyn error:', err.message);
        return [];
      })
    );
  }

  // 5. WeTech.ma (100% IT Maroc)
  if ((source === 'all' || source === 'wetech') && (isMorocco || location === 'Worldwide')) {
    tasks.push(
      searchWeTech({
        keywords: cleanKw,
        experienceLevel,
        limit: Math.min(limit, 15)
      }).catch(err => {
        console.error('WeTech error:', err.message);
        return [];
      })
    );
  }

  // 6. Morocco Top ESN Hub (Capgemini, DXC, CGI, Alten, Inetum, SQLI, Atos, Sofrecom, Oracle Labs)
  if ((source === 'all' || source === 'esn-morocco') && (isMorocco || location === 'Worldwide')) {
    tasks.push(
      searchMoroccoESNs({
        keywords: cleanKw,
        experienceLevel,
        limit: Math.min(limit, 20)
      }).catch(err => {
        console.error('Morocco ESN Hub error:', err.message);
        return [];
      })
    );
  }

  // 7. Rekrute.com (Morocco tech portal)
  if ((source === 'all' || source === 'rekrute') && (isMorocco || location === 'Worldwide')) {
    tasks.push(
      searchRekrute({
        keywords: cleanKw || 'informatique',
        experienceLevel,
        limit: Math.min(limit, 15)
      }).catch(err => {
        console.error('Rekrute error:', err.message);
        return [];
      })
    );
  }

  // 8. Dreamjob.ma (Moroccan IT jobs & concours)
  if ((source === 'all' || source === 'dreamjob') && (isMorocco || location === 'Worldwide')) {
    tasks.push(
      searchDreamjob({
        keywords: cleanKw,
        experienceLevel,
        limit: Math.min(limit, 15)
      }).catch(err => {
        console.error('Dreamjob error:', err.message);
        return [];
      })
    );
  }

  // 9. GitHub Tech Index / SimplifyJobs (2,400+ Internships & New Grad)
  if (source === 'all' || source === 'simplify' || source === 'github') {
    tasks.push(
      searchSimplify({
        keywords: cleanKw,
        experienceLevel,
        location: isMorocco ? '' : location,
        limit: Math.min(limit, 30)
      }).catch(err => {
        console.error('SimplifyJobs error:', err.message);
        return [];
      })
    );
  }

  // 10. Relocate.me (Visa Sponsorship & Relocation)
  if ((source === 'all' || source === 'relocate') && (!isMorocco || isRemoteOnly)) {
    tasks.push(
      searchRelocate({
        keywords: cleanKw,
        experienceLevel,
        limit: Math.min(limit, 15)
      }).catch(err => {
        console.error('Relocate.me error:', err.message);
        return [];
      })
    );
  }

  // 11. Y Combinator Official Job Stories
  if (source === 'all' || source === 'yc') {
    tasks.push(
      searchYCJobs({
        keywords: cleanKw,
        experienceLevel,
        limit: Math.min(limit, 10)
      }).catch(err => {
        console.error('YC Jobs error:', err.message);
        return [];
      })
    );
  }

  // 12. Himalayas API (Remote Worldwide Tech)
  if ((source === 'all' || source === 'himalayas') && (!isMorocco || isRemoteOnly)) {
    tasks.push(
      searchHimalayas({
        keywords: cleanKw,
        experienceLevel,
        limit: Math.min(limit, 20)
      }).catch(err => {
        console.error('Himalayas error:', err.message);
        return [];
      })
    );
  }

  // 13. Jobicy API (Remote Worldwide)
  if ((source === 'all' || source === 'jobicy') && (!isMorocco || isRemoteOnly)) {
    tasks.push(
      searchJobicy({
        keywords: cleanKw,
        experienceLevel,
        limit: Math.min(limit, 20)
      }).catch(err => {
        console.error('Jobicy error:', err.message);
        return [];
      })
    );
  }

  // 14. WeWorkRemotely RSS (Programming & DevOps)
  if ((source === 'all' || source === 'wwr') && (!isMorocco || isRemoteOnly)) {
    tasks.push(
      searchWeWorkRemotely({
        keywords: cleanKw,
        experienceLevel,
        limit: Math.min(limit, 15)
      }).catch(err => {
        console.error('WWR error:', err.message);
        return [];
      })
    );
  }

  // 15. Remotive API
  if ((source === 'all' || source === 'remotive') && (!isMorocco || isRemoteOnly)) {
    tasks.push(
      searchRemotive({
        keywords: cleanKw,
        category: remotiveCategory,
        experienceLevel,
        limit: Math.min(limit, 20)
      }).catch(err => {
        console.error('Remotive error:', err.message);
        return [];
      })
    );
  }

  // 16. RemoteOK API
  if ((source === 'all' || source === 'remoteok') && (!isMorocco || isRemoteOnly)) {
    tasks.push(
      searchRemoteOK({
        keywords: cleanKw,
        experienceLevel,
        limit: Math.min(limit, 20)
      }).catch(err => {
        console.error('RemoteOK error:', err.message);
        return [];
      })
    );
  }

  // 17. Arbeitnow API (Europe & Global)
  if ((source === 'all' || source === 'arbeitnow') && (!isMorocco || isRemoteOnly)) {
    tasks.push(
      searchArbeitnow({
        keywords: cleanKw,
        experienceLevel,
        limit: Math.min(limit, 20)
      }).catch(err => {
        console.error('Arbeitnow error:', err.message);
        return [];
      })
    );
  }

  // 18. Hacker News (Who is Hiring - Startup Founders)
  if (source === 'all' || source === 'hackernews') {
    tasks.push(
      searchHackerNews({
        keywords: cleanKw,
        experienceLevel,
        limit: Math.min(limit, 10)
      }).catch(err => {
        console.error('HackerNews error:', err.message);
        return [];
      })
    );
  }

  // 19. Emploi.ma (Morocco IT Section)
  if ((source === 'all' || source === 'emploi-ma') && (isMorocco || location === 'Worldwide')) {
    tasks.push(
      searchEmploiMa({
        keywords: cleanKw,
        experienceLevel,
        limit: Math.min(limit, 20)
      }).catch(err => {
        console.error('Emploi.ma error:', err.message);
        return [];
      })
    );
  }

  // 20. Custom User Providers (RSS Feeds & JSON APIs defined in data/custom_providers.json)
  if (source === 'all' || source === 'custom') {
    tasks.push(
      searchCustomProviders({
        keywords: cleanKw,
        experienceLevel,
        limit: Math.min(limit, 25)
      }).catch(err => {
        console.error('Custom providers error:', err.message);
        return [];
      })
    );
  }

  // Run all providers concurrently
  const results = await Promise.all(tasks);
  const flattened = results.flat();

  // Deduplicate by URL or normalized Title + Company
  const seen = new Set();
  const uniqueJobs = [];

  for (const job of flattened) {
    if (!job || !job.title) continue;
    const key = (job.url || '').toLowerCase().replace(/(\?|#).*$/, '') ||
                `${job.title.toLowerCase()}_${(job.company || '').toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueJobs.push(job);
    }
  }

  // Sort: Internships / Entry first if requested, then by date
  uniqueJobs.sort((a, b) => {
    if (experienceLevel === 'internship') {
      const aInt = a.experienceLevel.toLowerCase().includes('intern');
      const bInt = b.experienceLevel.toLowerCase().includes('intern');
      if (aInt && !bInt) return -1;
      if (!aInt && bInt) return 1;
    }
    return (b.datePosted || '').localeCompare(a.datePosted || '');
  });

  // Compute breakdown stats
  const stats = {
    total: uniqueJobs.length,
    byLevel: {
      internship: uniqueJobs.filter(j => j.experienceLevel.toLowerCase().includes('intern')).length,
      entry: uniqueJobs.filter(j => j.experienceLevel.toLowerCase().includes('entry') || j.experienceLevel.toLowerCase().includes('junior')).length,
      senior: uniqueJobs.filter(j => j.experienceLevel.toLowerCase().includes('senior')).length,
      other: 0
    },
    bySource: {
      linkedin: uniqueJobs.filter(j => j.source === 'LinkedIn').length,
      indeed: uniqueJobs.filter(j => j.source === 'Indeed').length,
      talentMorocco: uniqueJobs.filter(j => j.source.includes('Talent.com')).length,
      dreamjob: uniqueJobs.filter(j => j.source.includes('Dreamjob')).length,
      jobzyn: uniqueJobs.filter(j => j.source.includes('Jobzyn')).length,
      wetech: uniqueJobs.filter(j => j.source.includes('WeTech')).length,
      esnMorocco: uniqueJobs.filter(j => j.source.includes('Morocco Top ESN')).length,
      rekrute: uniqueJobs.filter(j => j.source === 'Rekrute').length,
      github: uniqueJobs.filter(j => j.source.includes('GitHub')).length,
      relocate: uniqueJobs.filter(j => j.source === 'Relocate.me').length,
      yc: uniqueJobs.filter(j => j.source.includes('Y Combinator')).length,
      himalayas: uniqueJobs.filter(j => j.source === 'Himalayas').length,
      jobicy: uniqueJobs.filter(j => j.source === 'Jobicy').length,
      wwr: uniqueJobs.filter(j => j.source === 'WeWorkRemotely').length,
      remotive: uniqueJobs.filter(j => j.source === 'Remotive').length,
      remoteok: uniqueJobs.filter(j => j.source === 'RemoteOK').length,
      arbeitnow: uniqueJobs.filter(j => j.source === 'Arbeitnow').length,
      hackernews: uniqueJobs.filter(j => j.source.includes('HackerNews')).length,
    }
  };
  stats.byLevel.other = stats.total - (stats.byLevel.internship + stats.byLevel.entry + stats.byLevel.senior);

  const responseData = {
    query: { domain, keywords, experienceLevel, location, source, workType },
    stats,
    jobs: uniqueJobs
  };

  cache.set(cacheKey, { data: responseData, timestamp: Date.now() });

  return responseData;
}

module.exports = {
  searchJobs,
  DOMAIN_PRESETS,
  TOP_MOROCCO_ESNS
};
