#!/usr/bin/env node
/**
 * JobRadar CLI v2.0
 * Instant Multi-Portal Tech Job & Internship Scanner with AI Match Scoring
 */
const { searchJobs } = require('./services/aggregator');
const { getDb } = require('./src/db/database');
const { calculateMatchScore } = require('./src/services/matchingEngine');
const fs = require('fs');
const path = require('path');

// ANSI Color Helpers
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

async function runCli() {
  const args = process.argv.slice(2);
  let domain = 'all';
  let level = 'internship';
  let location = 'Worldwide';
  let keywords = '';
  let source = 'all';
  let matchProfile = false;
  let exportFormat = null;
  let exportPath = null;
  let limit = 25;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--domain' && args[i + 1]) domain = args[++i];
    else if (arg === '--level' && args[i + 1]) level = args[++i];
    else if (arg === '--location' && args[i + 1]) location = args[++i];
    else if (arg === '--keywords' && args[i + 1]) keywords = args[++i];
    else if (arg === '--source' && args[i + 1]) source = args[++i];
    else if (arg === '--limit' && args[i + 1]) limit = parseInt(args[++i], 10);
    else if (arg === '--pfe') {
      level = 'internship';
      location = 'Morocco';
      keywords = keywords ? `${keywords} PFE` : 'PFE';
    } else if (arg === '--match') {
      matchProfile = true;
    } else if (arg === '--export' && args[i + 1]) {
      exportFormat = args[++i].toLowerCase();
      if (args[i + 1] && !args[i + 1].startsWith('--')) {
        exportPath = args[++i];
      }
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      return;
    }
  }

  console.log(`\n${colors.bold}${colors.cyan}========================================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}   JobRadar v2.0 — Tech Job & Internship Intelligence CLI${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}========================================================================${colors.reset}`);
  console.log(`   ${colors.dim}Domain:${colors.reset} ${domain} | ${colors.dim}Level:${colors.reset} ${level} | ${colors.dim}Location:${colors.reset} ${location}`);
  console.log(`   ${colors.dim}Source:${colors.reset} ${source} | ${colors.dim}Keywords:${colors.reset} ${keywords || 'None'} | ${colors.dim}Match Score:${colors.reset} ${matchProfile ? 'Enabled (against saved profile)' : 'Disabled'}\n`);

  try {
    const res = await searchJobs({ domain, experienceLevel: level, location, source, keywords, limit });
    let jobs = res.jobs || [];

    // Optional AI Profile Matching
    if (matchProfile) {
      let profile = null;
      try {
        const db = getDb();
        profile = db.prepare('SELECT * FROM user_profile WHERE id = ?').get('default');
      } catch (e) {}

      if (profile) {
        jobs = jobs.map(job => {
          const matchResult = calculateMatchScore(job, profile);
          return {
            ...job,
            matchScore: matchResult.matchScore,
            matchedSkills: matchResult.matchedSkills,
            missingSkills: matchResult.missingSkills
          };
        });
        jobs.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
      } else {
        console.log(`${colors.yellow}⚠️ No user profile found in database. Run with Web UI or insert profile to compute AI scores.${colors.reset}\n`);
      }
    }

    console.log(`${colors.bold}${colors.green}✅ Found ${jobs.length} matching opportunities:${colors.reset}\n`);

    jobs.forEach((j, idx) => {
      console.log(`${colors.dim}------------------------------------------------------------------------${colors.reset}`);
      const scoreBadge = j.matchScore !== undefined
        ? ` ${colors.bold}${colors.magenta}[${j.matchScore}% MATCH]${colors.reset}`
        : '';
      console.log(`${colors.bold}[${idx + 1}] ${j.title}${colors.reset}${scoreBadge}`);
      console.log(`🏢 ${colors.yellow}${j.company}${colors.reset} | 📍 ${j.location} ${j.remote ? `${colors.cyan}(Remote)${colors.reset}` : ''}`);
      console.log(`🎓 Level: ${j.experienceLevel} | 🌐 Sources: ${j.source}${j.otherSources && j.otherSources.length ? `, ${j.otherSources.join(', ')}` : ''}`);
      if (j.matchedSkills && j.matchedSkills.length > 0) {
        console.log(`💡 ${colors.green}Matched Skills: ${j.matchedSkills.join(', ')}${colors.reset}`);
      }
      if (j.missingSkills && j.missingSkills.length > 0) {
        console.log(`⚠️  ${colors.dim}Missing Skills: ${j.missingSkills.join(', ')}${colors.reset}`);
      }
      console.log(`🔗 ${colors.blue}${j.url}${colors.reset}`);
    });
    console.log(`${colors.dim}------------------------------------------------------------------------${colors.reset}\n`);

    // Handle export flag
    if (exportFormat) {
      handleExport(jobs, exportFormat, exportPath);
    }
  } catch (err) {
    console.error(`${colors.red}❌ Error during search:${colors.reset}`, err.message);
  }
}

function handleExport(jobs, format, targetPath) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = targetPath || `jobradar_export_${timestamp}.${format === 'csv' ? 'csv' : 'json'}`;
  const resolvedPath = path.resolve(process.cwd(), filename);

  if (format === 'json') {
    fs.writeFileSync(resolvedPath, JSON.stringify(jobs, null, 2), 'utf-8');
    console.log(`${colors.bold}${colors.green}💾 Exported ${jobs.length} jobs to JSON:${colors.reset} ${resolvedPath}\n`);
  } else if (format === 'csv') {
    const headers = ['ID', 'Title', 'Company', 'Location', 'Remote', 'Level', 'Source', 'MatchScore', 'URL'];
    const rows = jobs.map(j => [
      `"${(j.id || '').replace(/"/g, '""')}"`,
      `"${(j.title || '').replace(/"/g, '""')}"`,
      `"${(j.company || '').replace(/"/g, '""')}"`,
      `"${(j.location || '').replace(/"/g, '""')}"`,
      j.remote ? 'Yes' : 'No',
      `"${(j.experienceLevel || '').replace(/"/g, '""')}"`,
      `"${(j.source || '').replace(/"/g, '""')}"`,
      j.matchScore !== undefined ? j.matchScore : '',
      `"${(j.url || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    fs.writeFileSync(resolvedPath, csvContent, 'utf-8');
    console.log(`${colors.bold}${colors.green}💾 Exported ${jobs.length} jobs to CSV:${colors.reset} ${resolvedPath}\n`);
  }
}

function printHelp() {
  console.log(`
${colors.bold}JobRadar CLI v2.0 - Automated Tech Job & Internship Intelligence${colors.reset}

${colors.bold}Usage:${colors.reset}
  node cli.js [options]

${colors.bold}Options:${colors.reset}
  --pfe               Shorthand for Moroccan PFE internships (--level internship --location Morocco --keywords PFE)
  --match             Compute and rank by 0-100% Match Score against your saved profile
  --keywords <text>   Filter by tech stack or keyword (e.g. "React", "Python", "SOC", "FastAPI")
  --domain <domain>   Domain preset: ai, cybersecurity, dev, cloud, data, mobile, all (default: all)
  --level <level>     internship, entry, mid, senior, all (default: internship)
  --location <loc>    Morocco, Remote, Worldwide, France, Europe, etc. (default: Worldwide)
  --source <src>      all, jobzyn, wetech, esn-morocco, rekrute, talent-morocco, dreamjob, emploi-ma, custom, simplify, etc.
  --limit <number>    Max jobs to return (default: 25)
  --export <csv|json> Export results directly to a CSV or JSON file
  --help, -h          Show this help manual

${colors.bold}Examples:${colors.reset}
  node cli.js --pfe
  node cli.js --pfe --match
  node cli.js --source jobzyn --level internship --keywords "React"
  node cli.js --keywords "Cybersecurity" --match --export csv
  node cli.js --source simplify --keywords "Machine Learning" --limit 15
  node cli.js --source esn-morocco --keywords "Java"
  `);
}

runCli();
