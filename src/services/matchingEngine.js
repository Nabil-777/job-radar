const COMMON_TECH_SKILLS = [
  'javascript', 'typescript', 'python', 'java', 'c++', 'c#', '.net', 'php', 'ruby', 'go', 'rust', 'scala',
  'react', 'angular', 'vue', 'next.js', 'nuxt', 'svelte', 'node.js', 'express', 'nestjs', 'django', 'fastapi',
  'flask', 'spring', 'spring boot', 'laravel', 'symfony', 'asp.net',
  'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'oracle', 'dynamodb',
  'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'terraform', 'ansible', 'jenkins', 'gitlab', 'ci/cd',
  'linux', 'git', 'rest api', 'graphql', 'kafka', 'rabbitmq', 'microservices',
  'machine learning', 'deep learning', 'pytorch', 'tensorflow', 'nlp', 'llm', 'computer vision', 'data science',
  'cybersecurity', 'soc', 'pentesting', 'siem', 'firewall', 'owasp', 'iso 27001', 'wireshark',
  'devops', 'sysadmin', 'cloud', 'agile', 'scrum'
];

/**
 * Extracts tech stack keywords from text (title + description + tags)
 */
function extractSkillsFromText(text) {
  if (!text) return [];
  const lower = text.toLowerCase();
  const detected = new Set();

  for (const skill of COMMON_TECH_SKILLS) {
    // Word boundary check
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|[^a-zA-Z0-9_#+])${escaped}([^a-zA-Z0-9_#+]|$)`, 'i');
    if (regex.test(lower)) {
      detected.add(skill);
    }
  }

  return Array.from(detected);
}

/**
 * Calculates a 0-100% Match Score between a job and a candidate user profile
 */
function calculateMatchScore(job, userProfile) {
  if (!userProfile) {
    return {
      matchScore: 50,
      matchedSkills: [],
      missingSkills: []
    };
  }

  // Parse user skills
  let userSkills = [];
  if (Array.isArray(userProfile.skills_json)) {
    userSkills = userProfile.skills_json;
  } else if (typeof userProfile.skills_json === 'string') {
    try {
      userSkills = JSON.parse(userProfile.skills_json);
    } catch (e) {
      userSkills = userProfile.skills_json.split(',').map(s => s.trim());
    }
  }
  const userSkillsLower = new Set(userSkills.map(s => s.toLowerCase().trim()));

  // Extract job skills from tags, title and description
  const jobTags = Array.isArray(job.tags) ? job.tags : (Array.isArray(job.tags_json) ? job.tags_json : []);
  const combinedText = `${job.title || ''} ${job.description || job.descriptionSnippet || ''} ${jobTags.join(' ')}`;
  const jobSkills = extractSkillsFromText(combinedText);

  // 1. Skill Overlap (50 points)
  let skillPoints = 0;
  const matchedSkills = [];
  const missingSkills = [];

  if (jobSkills.length === 0) {
    // If no specific skills detected, award baseline 35 points if domain keywords match
    skillPoints = 35;
  } else {
    for (const skill of jobSkills) {
      if (userSkillsLower.has(skill) || Array.from(userSkillsLower).some(us => us.includes(skill) || skill.includes(us))) {
        matchedSkills.push(skill);
      } else {
        missingSkills.push(skill);
      }
    }
    const ratio = matchedSkills.length / jobSkills.length;
    skillPoints = Math.round(ratio * 50);
  }

  // 2. Role & Seniority Fit (25 points)
  let seniorityPoints = 15;
  const jobLevel = (job.experienceLevel || job.experience_level || '').toLowerCase();
  const userTitle = (userProfile.title || '').toLowerCase();

  const isJobIntern = jobLevel.includes('intern') || jobLevel.includes('stage') || jobLevel.includes('pfe');
  const isJobJunior = jobLevel.includes('junior') || jobLevel.includes('entry') || jobLevel.includes('débutant');
  const isJobSenior = jobLevel.includes('senior') || jobLevel.includes('lead') || jobLevel.includes('architect');

  const isUserStudent = userTitle.includes('student') || userTitle.includes('étudiant') || userTitle.includes('intern') || userTitle.includes('junior');

  if (isUserStudent) {
    if (isJobIntern || isJobJunior) seniorityPoints = 25;
    else if (isJobSenior) seniorityPoints = 5;
    else seniorityPoints = 18;
  } else {
    if (!isJobSenior) seniorityPoints = 23;
    else seniorityPoints = 25;
  }

  // 3. Location & Remote Fit (25 points)
  let locationPoints = 15;
  const jobLoc = (job.location || '').toLowerCase();
  const isJobRemote = job.remote === true || job.is_remote === 1 || jobLoc.includes('remote') || jobLoc.includes('télétravail');
  const userLoc = (userProfile.location || 'Morocco').toLowerCase();

  if (isJobRemote) {
    locationPoints = 25;
  } else if (jobLoc.includes(userLoc) || (userLoc.includes('morocco') && (jobLoc.includes('casablanca') || jobLoc.includes('rabat') || jobLoc.includes('maroc')))) {
    locationPoints = 25;
  } else {
    locationPoints = 15;
  }

  const matchScore = Math.min(100, Math.max(10, skillPoints + seniorityPoints + locationPoints));

  return {
    matchScore,
    matchedSkills: matchedSkills.slice(0, 8),
    missingSkills: missingSkills.slice(0, 6)
  };
}

module.exports = {
  COMMON_TECH_SKILLS,
  extractSkillsFromText,
  calculateMatchScore
};
