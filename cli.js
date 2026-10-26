#!/usr/bin/env node
const { searchJobs } = require('./services/aggregator');

async function runCli() {
  const args = process.argv.slice(2);
  let domain = 'all';
  let level = 'internship';
  let location = 'Worldwide';
  let keywords = '';
  let source = 'all';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--domain' && args[i+1]) domain = args[++i];
    else if (args[i] === '--level' && args[i+1]) level = args[++i];
    else if (args[i] === '--location' && args[i+1]) location = args[++i];
    else if (args[i] === '--keywords' && args[i+1]) keywords = args[++i];
    else if (args[i] === '--source' && args[i+1]) source = args[++i];
    else if (args[i] === '--help') {
      console.log(`
JobRadar CLI - Instant Tech Job & Internship Finder
Usage:
  node cli.js [options]

Options:
  --domain    Domain preset (ai, cybersecurity, dev, cloud, data, mobile, all)
  --level     Experience level (internship, entry, mid, senior, all)
  --location  Location (Morocco, Remote, Worldwide, France, etc.)
  --source    Provider (all, jobzyn, wetech, esn-morocco, rekrute, talent-morocco, dreamjob, emploi-ma, custom, simplify, indeed, linkedin, relocate, yc, himalayas, jobicy, wwr, remotive, remoteok, arbeitnow, hackernews)
  --keywords  Custom keywords (e.g. "React", "Python", "PFE", "FastAPI")

Examples:
  node cli.js --source jobzyn --level internship --keywords "React"
  node cli.js --source wetech --keywords "Python"
  node cli.js --source emploi-ma --keywords "dev"
  node cli.js --source custom --keywords "engineer"
  node cli.js --source talent-morocco --keywords "informatique"
  node cli.js --source dreamjob --level internship
  node cli.js --source esn-morocco --level internship --location Morocco
  node cli.js --source simplify --level internship --keywords "AI"
  node cli.js --source indeed --level internship --keywords "software engineer"
  node cli.js --source rekrute --level internship --location Morocco
      `);
      return;
    }
  }

  console.log(`\n🔍 Searching opportunities...`);
  console.log(`   Domain: ${domain} | Level: ${level} | Location: ${location} | Source: ${source} | Keywords: ${keywords || 'None'}\n`);

  try {
    const res = await searchJobs({ domain, experienceLevel: level, location, source, keywords, limit: 20 });
    console.log(`✅ Found ${res.jobs.length} matching jobs:\n`);

    res.jobs.forEach((j, idx) => {
      console.log(`------------------------------------------------------------------------`);
      console.log(`[${idx + 1}] ${j.title}`);
      console.log(`🏢 Company : ${j.company}`);
      console.log(`📍 Location: ${j.location} ${j.remote ? '(Remote)' : ''}`);
      console.log(`🎓 Level   : ${j.experienceLevel} | 🌐 Source: ${j.source}`);
      console.log(`🔗 Link    : ${j.url}`);
    });
    console.log(`------------------------------------------------------------------------\n`);
  } catch (err) {
    console.error('Error during search:', err.message);
  }
}

runCli();
