const { SKILL_TAXONOMY, extractTaxonomySkills, normalizeSkillName } = require('../utils/skillTaxonomy');

// Flatten taxonomy for backward compatibility with tests
const COMMON_TECH_SKILLS = Object.values(SKILL_TAXONOMY).flat().map(s => s.toLowerCase());

/**
 * Extracts tech stack keywords from text (title + description + tags)
 * Returns lowercase strings for robust matching and test compatibility
 */
function extractSkillsFromText(text) {
  if (!text) return [];
  const { allDetected } = extractTaxonomySkills(text);
  return allDetected.map(s => s.toLowerCase());
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

  // If skills_json is empty, fallback to structured_cv_json
  let structuredData = null;
  if (userProfile.structured_cv_json) {
    try {
      structuredData = typeof userProfile.structured_cv_json === 'string'
        ? JSON.parse(userProfile.structured_cv_json)
        : userProfile.structured_cv_json;
      if (structuredData && structuredData.skills && userSkills.length === 0) {
        userSkills = Object.values(structuredData.skills).flat();
      }
    } catch (e) {}
  }

  // Canonicalize user skills to lowercase
  const userSkillsCanonical = new Set(userSkills.map(s => s.toLowerCase().trim()));

  // Extract job skills from tags, title and description
  const jobTags = Array.isArray(job.tags) ? job.tags : (Array.isArray(job.tags_json) ? job.tags_json : []);
  const combinedText = `${job.title || ''} ${job.description || job.descriptionSnippet || ''} ${jobTags.join(' ')}`;
  const jobSkills = extractSkillsFromText(combinedText);

  // 1. Skill Overlap (50 points)
  let skillPoints = 0;
  const matchedSkills = [];
  const missingSkills = [];

  if (jobSkills.length === 0) {
    skillPoints = 35;
  } else {
    for (const skill of jobSkills) {
      const lower = skill.toLowerCase();
      if (userSkillsCanonical.has(lower) || Array.from(userSkillsCanonical).some(us => us.includes(lower) || lower.includes(us))) {
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
  const userTitle = (userProfile.title || structuredData?.basics?.headline || '').toLowerCase();

  const isJobIntern = jobLevel.includes('intern') || jobLevel.includes('stage') || jobLevel.includes('pfe');
  const isJobJunior = jobLevel.includes('junior') || jobLevel.includes('entry') || jobLevel.includes('débutant');
  const isJobSenior = jobLevel.includes('senior') || jobLevel.includes('lead') || jobLevel.includes('architect');

  const isUserStudent = userTitle.includes('student') || userTitle.includes('étudiant') || userTitle.includes('intern') || userTitle.includes('junior') || userTitle.includes('élève');

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
  const userLoc = (userProfile.location || structuredData?.basics?.location || 'Morocco').toLowerCase();

  if (isJobRemote) {
    locationPoints = 25;
  } else if (jobLoc.includes(userLoc) || (userLoc.includes('morocco') && (jobLoc.includes('casablanca') || jobLoc.includes('rabat') || jobLoc.includes('maroc') || jobLoc.includes('oujda')))) {
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
