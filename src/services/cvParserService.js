const { z } = require('zod');
const axios = require('axios');
const { extractTaxonomySkills, normalizeSkillName } = require('../utils/skillTaxonomy');

/**
 * Canonical Zod Schema for StructuredResume
 */
const StructuredResumeSchema = z.object({
  basics: z.object({
    fullName: z.string().default('Candidate Name'),
    headline: z.string().default('Software Engineer'),
    email: z.string().default(''),
    phone: z.string().default(''),
    location: z.string().default('Morocco'),
    links: z.object({
      linkedin: z.string().default(''),
      github: z.string().default(''),
      portfolio: z.string().default('')
    }).default({}),
    summary: z.string().default('')
  }).default({}),
  education: z.array(z.object({
    institution: z.string().default(''),
    degree: z.string().default(''),
    location: z.string().default(''),
    startDate: z.string().default(''),
    endDate: z.string().default(''),
    highlights: z.array(z.string()).default([])
  })).default([]),
  workExperience: z.array(z.object({
    company: z.string().default(''),
    role: z.string().default(''),
    contractType: z.string().default('Stage'),
    location: z.string().default(''),
    startDate: z.string().default(''),
    endDate: z.string().default(''),
    technologies: z.array(z.string()).default([]),
    bullets: z.array(z.string()).default([])
  })).default([]),
  projects: z.array(z.object({
    name: z.string().default(''),
    role: z.string().default(''),
    url: z.string().default(''),
    technologies: z.array(z.string()).default([]),
    bullets: z.array(z.string()).default([])
  })).default([]),
  skills: z.object({
    languages: z.array(z.string()).default([]),
    frameworks: z.array(z.string()).default([]),
    databases: z.array(z.string()).default([]),
    cloudDevOps: z.array(z.string()).default([]),
    aiCyberData: z.array(z.string()).default([]),
    engineeringPractices: z.array(z.string()).default([])
  }).default({}),
  certifications: z.array(z.object({
    name: z.string().default(''),
    issuer: z.string().default(''),
    date: z.string().default('')
  })).default([]),
  spokenLanguages: z.array(z.object({
    language: z.string().default(''),
    fluency: z.string().default('')
  })).default([])
});

/**
 * Section Header Regexes (Bilingual FR / EN)
 */
const SECTION_HEADERS = {
  workExperience: /^(?:exp[eé]riences?|work\s*experience|employment|stages?)(?:\s+(?:professionnelles?|professionnel|et\s*stages?|stages?\s*et|and)){0,4}$/i,
  projects: /^(?:projets?|projects?)(?:\s*(?:personnels?|acad[eé]miques?|techniques?|cl[eé]s?|r[eé]alis[eé]s?|&|et|and)){0,4}$/i,
  education: /^(?:formations?|éducation|education|parcours\s*acad[eé]mique|dipl[oô]mes?)(?:\s+(?:et\s*formations?|universitaires?|acad[eé]miques?)){0,3}$/i,
  skills: /^(?:comp[eé]tences?|technical\s*skills?|skills?|technologies|stack\s*technique|outils)(?:\s+(?:techniques?|informatiques?|et\s*technologies?|et\s*outils?)){0,3}$/i,
  certifications: /^(?:certifications?|licences?\s*(?:et\s*certifications?)?|certificats?)$/i,
  spokenLanguages: /^(?:langues?|languages?)$/i
};

// Date range pattern supporting French & English months, years, present/en cours
const DATE_RANGE_REGEX = /(?:(?:janv?|févr?|mars?|avr?|mai|juin|juil?|août|sept?|oct?|nov?|déc?|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z.]*\s+)?\b(19\d\d|20\d\d)\b\s*(?:-|–|—|to|à)\s*(?:(?:janv?|févr?|mars?|avr?|mai|juin|juil?|août|sept?|oct?|nov?|déc?|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z.]*\s+)?(?:\b(19\d\d|20\d\d)\b|présent|present|actuel|current|en\s+cours)/i;
const SINGLE_DATE_REGEX = /\b(19\d\d|20\d\d)\b/;

/**
 * Parses raw reconstructed PDF text into canonical StructuredResume JSON object.
 * Attempts LLM extraction first (if key configured), falls back to Deterministic Bilingual Engine.
 */
async function parseResumeText(rawText) {
  if (!rawText || rawText.trim().length === 0) {
    throw new Error('No text content available to parse.');
  }

  // 1. Try LLM Structured Extraction if API key is present
  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const ollamaUrl = process.env.OLLAMA_URL;

  let llmResult = null;

  if (geminiKey || groqKey || openaiKey || ollamaUrl) {
    try {
      llmResult = await extractWithLLM(rawText, { geminiKey, groqKey, openaiKey, ollamaUrl });
    } catch (e) {
      console.warn('[CV Parser] LLM extraction failed, using deterministic parser:', e.message);
    }
  }

  if (llmResult) {
    const validated = StructuredResumeSchema.safeParse(llmResult);
    if (validated.success) {
      return validated.data;
    }
  }

  // 2. Deterministic Bilingual Section & Entity Extractor (Offline Engine)
  const deterministicResult = parseDeterministic(rawText);
  return StructuredResumeSchema.parse(deterministicResult);
}

/**
 * LLM Structured Extractor via JSON Mode
 */
async function extractWithLLM(rawText, { geminiKey, groqKey, openaiKey, ollamaUrl }) {
  const prompt = `You are a world-class resume parser.
Extract the candidate's resume text below into the EXACT JSON schema provided.
CRITICAL RULES:
1. NEVER invent or hallucinate companies, degrees, dates, or projects that do not exist in the text.
2. Preserve the candidate's exact wording and language (French or English) for bullet points and descriptions.
3. Normalize all dates to YYYY-MM or YYYY if possible, or keep as written.
4. Categorize technical skills strictly into languages, frameworks, databases, cloudDevOps, and aiCyberData.

Exact Target JSON Schema:
{
  "basics": {
    "fullName": "string",
    "headline": "string",
    "email": "string",
    "phone": "string",
    "location": "string",
    "links": { "linkedin": "string", "github": "string", "portfolio": "string" },
    "summary": "string"
  },
  "education": [
    { "institution": "string", "degree": "string", "location": "string", "startDate": "string", "endDate": "string", "highlights": ["string"] }
  ],
  "workExperience": [
    { "company": "string", "role": "string", "contractType": "string", "location": "string", "startDate": "string", "endDate": "string", "technologies": ["string"], "bullets": ["string"] }
  ],
  "projects": [
    { "name": "string", "role": "string", "url": "string", "technologies": ["string"], "bullets": ["string"] }
  ],
  "skills": {
    "languages": ["string"],
    "frameworks": ["string"],
    "databases": ["string"],
    "cloudDevOps": ["string"],
    "aiCyberData": ["string"],
    "engineeringPractices": ["string"]
  },
  "certifications": [
    { "name": "string", "issuer": "string", "date": "string" }
  ],
  "spokenLanguages": [
    { "language": "string", "fluency": "string" }
  ]
}

Candidate Resume Text:
${rawText.slice(0, 10000)}

Respond ONLY with valid raw JSON:`;

  if (geminiKey) {
    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      },
      { timeout: 15000 }
    );
    return JSON.parse(res.data.candidates[0].content.parts[0].text);
  } else if (groqKey) {
    const res = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      },
      { headers: { Authorization: `Bearer ${groqKey}` }, timeout: 15000 }
    );
    return JSON.parse(res.data.choices[0].message.content);
  } else if (openaiKey) {
    const res = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      },
      { headers: { Authorization: `Bearer ${openaiKey}` }, timeout: 15000 }
    );
    return JSON.parse(res.data.choices[0].message.content);
  } else if (ollamaUrl) {
    const res = await axios.post(
      `${ollamaUrl}/api/generate`,
      { model: 'llama3', prompt, stream: false, format: 'json' },
      { timeout: 20000 }
    );
    return JSON.parse(res.data.response);
  }

  return null;
}

/**
 * Deterministic Bilingual Section & Entity Extractor (Offline Engine)
 */
function parseDeterministic(rawText) {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

  // 1. Extract contact basics
  const emailMatch = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const phoneMatch = rawText.match(/(?:\+|00)\d[\d\s.-]{7,18}|\b0[5-7]\d{8}\b/);
  const linkedinMatch = rawText.match(/linkedin\.com\/in\/[a-zA-Z0-9_.-]+/i);
  const githubMatch = rawText.match(/github\.com\/[a-zA-Z0-9_.-]+/i);
  const portfolioMatch = rawText.match(/(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.(?:dev|me|io|tech|ma|com)(?:\/[^\s]*)?/i);

  // Find candidate name from the top non-contact lines
  let fullName = 'Candidate Name';
  let headline = 'Software Engineer';
  let location = 'Morocco';

  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const l = lines[i];
    if (l.includes('@') || l.includes('http') || l.includes('www.') || l.match(/\d{4}/)) continue;
    if (l.length >= 3 && l.length <= 40 && !l.match(/cv|resume|curriculum/i)) {
      fullName = l;
      // If the next line looks like a title
      if (lines[i + 1] && lines[i + 1].length <= 60 && !lines[i + 1].includes('@')) {
        headline = lines[i + 1];
      }
      break;
    }
  }

  // Location detection
  const cityMatch = rawText.match(/\b(Casablanca|Rabat|Marrakech|Tanger|Fès|Oujda|Agadir|Kénitra|Tétouan|Salé|Paris|Lyon|Morocco|Maroc|Remote|Télétravail)\b/i);
  if (cityMatch) {
    location = cityMatch[0];
  }

  // 2. Section Segmentation
  const sections = {
    workExperience: [],
    projects: [],
    education: [],
    skills: [],
    certifications: [],
    spokenLanguages: [],
    summary: []
  };

  let currentSection = null;

  for (const line of lines) {
    let matchedHeader = null;
    for (const [secKey, regex] of Object.entries(SECTION_HEADERS)) {
      if (regex.test(line)) {
        matchedHeader = secKey;
        break;
      }
    }

    if (matchedHeader) {
      currentSection = matchedHeader;
      continue;
    }

    if (currentSection) {
      sections[currentSection].push(line);
    } else {
      // Prior to any section header: could be summary / profile paragraph
      if (line.length > 50 && !line.includes('@')) {
        sections.summary.push(line);
      }
    }
  }

  // 3. Parse Work Experience
  const workExperience = parseExperienceEntries(sections.workExperience);

  // 4. Parse Projects
  const projects = parseProjectEntries(sections.projects);

  // 5. Parse Education
  const education = parseEducationEntries(sections.education);

  // 6. Parse Skills with Taxonomy
  const skillsText = sections.skills.join('\n') + '\n' + rawText;
  const taxonomyExtraction = extractTaxonomySkills(skillsText);

  // 7. Parse Spoken Languages
  const spokenLanguages = parseSpokenLanguages(sections.spokenLanguages.join('\n'));

  // 8. Parse Certifications
  const certifications = parseCertifications(sections.certifications);

  return {
    basics: {
      fullName,
      headline,
      email: emailMatch ? emailMatch[0] : '',
      phone: phoneMatch ? phoneMatch[0].replace(/\s+/g, ' ').trim() : '',
      location,
      links: {
        linkedin: linkedinMatch ? `https://${linkedinMatch[0].replace(/^https?:\/\//, '')}` : '',
        github: githubMatch ? `https://${githubMatch[0].replace(/^https?:\/\//, '')}` : '',
        portfolio: portfolioMatch ? (portfolioMatch[0].startsWith('http') ? portfolioMatch[0] : `https://${portfolioMatch[0]}`) : ''
      },
      summary: sections.summary.join(' ').slice(0, 500)
    },
    education,
    workExperience,
    projects,
    skills: {
      languages: taxonomyExtraction.byCategory.languages.slice(0, 10),
      frameworks: taxonomyExtraction.byCategory.frameworks.slice(0, 12),
      databases: taxonomyExtraction.byCategory.databases.slice(0, 8),
      cloudDevOps: taxonomyExtraction.byCategory.cloudDevOps.slice(0, 10),
      aiCyberData: taxonomyExtraction.byCategory.aiCyberData.slice(0, 10),
      engineeringPractices: taxonomyExtraction.byCategory.engineeringPractices.slice(0, 8)
    },
    certifications,
    spokenLanguages
  };
}

/**
 * Parses work experience lines into structured entries
 */
function parseExperienceEntries(lines) {
  const entries = [];
  let current = null;

  for (const line of lines) {
    const isBullet = /^[•\-▪–*]/.test(line);
    const dateMatch = line.match(DATE_RANGE_REGEX);

    if (dateMatch && !isBullet) {
      if (current) entries.push(finalizeExperience(current));
      const parts = line.replace(DATE_RANGE_REGEX, '').split(/[-–|•,]/).map(p => p.trim()).filter(Boolean);
      current = {
        role: parts[0] || 'Software Engineer',
        company: parts[1] || 'Company',
        contractType: detectContractType(line),
        location: '',
        startDate: dateMatch[1] || '',
        endDate: dateMatch[2] || 'Present',
        bullets: []
      };
    } else if (current) {
      if (isBullet) {
        current.bullets.push(line.replace(/^[•\-▪–*]\s*/, '').trim());
      } else if (current.bullets.length > 0) {
        // Multi-line bullet continuation
        current.bullets[current.bullets.length - 1] += ' ' + line.trim();
      } else if (!current.company || current.company === 'Company') {
        current.company = line.trim();
      }
    }
  }

  if (current) entries.push(finalizeExperience(current));
  return entries;
}

function finalizeExperience(exp) {
  const combinedText = `${exp.role} ${exp.company} ${exp.bullets.join(' ')}`;
  const tech = extractTaxonomySkills(combinedText).allDetected;
  return {
    ...exp,
    technologies: tech.slice(0, 6)
  };
}

/**
 * Parses academic and personal project lines
 */
function parseProjectEntries(lines) {
  const projects = [];
  let current = null;

  for (const line of lines) {
    const isBullet = /^[•\-▪–*]/.test(line);

    if (!isBullet && line.length < 70 && !line.toLowerCase().startsWith('technologie')) {
      if (current) projects.push(finalizeProject(current));
      const parts = line.split(/[-–:|]/).map(p => p.trim()).filter(Boolean);
      current = {
        name: parts[0] || 'Project',
        role: parts[1] || 'Lead Developer',
        url: '',
        bullets: []
      };
    } else if (current) {
      if (isBullet) {
        current.bullets.push(line.replace(/^[•\-▪–*]\s*/, '').trim());
      } else if (current.bullets.length > 0) {
        current.bullets[current.bullets.length - 1] += ' ' + line.trim();
      }
    }
  }

  if (current) projects.push(finalizeProject(current));
  return projects;
}

function finalizeProject(proj) {
  const combinedText = `${proj.name} ${proj.role} ${proj.bullets.join(' ')}`;
  const tech = extractTaxonomySkills(combinedText).allDetected;
  return {
    ...proj,
    technologies: tech.slice(0, 6)
  };
}

/**
 * Parses education lines
 */
function parseEducationEntries(lines) {
  const eduList = [];
  let current = null;

  for (const line of lines) {
    const dateMatch = line.match(DATE_RANGE_REGEX) || line.match(SINGLE_DATE_REGEX);
    const isBullet = /^[•\-▪–*]/.test(line);

    if (dateMatch && !isBullet) {
      if (current) eduList.push(current);
      const degreeText = line.replace(DATE_RANGE_REGEX, '').replace(SINGLE_DATE_REGEX, '').trim();
      current = {
        institution: 'University / Engineering School',
        degree: degreeText || 'Diplôme d’Ingénieur / Bachelor / Master',
        location: '',
        startDate: dateMatch[1] || '',
        endDate: dateMatch[2] || dateMatch[1] || '',
        highlights: []
      };
    } else if (current) {
      if (isBullet) {
        current.highlights.push(line.replace(/^[•\-▪–*]\s*/, '').trim());
      } else if (current.institution === 'University / Engineering School') {
        current.institution = line.trim();
      }
    }
  }

  if (current) eduList.push(current);
  return eduList;
}

function detectContractType(str) {
  const l = str.toLowerCase();
  if (l.includes('pfe') || l.includes('stage pfe')) return 'Stage PFE';
  if (l.includes('pfa') || l.includes('stage')) return 'Stage';
  if (l.includes('freelance')) return 'Freelance';
  if (l.includes('cdd')) return 'CDD';
  if (l.includes('cdi')) return 'CDI';
  return 'Stage';
}

function parseSpokenLanguages(text) {
  const langs = [];
  const known = [
    { name: 'Arabic', fr: 'Arabe', match: /arab/i },
    { name: 'French', fr: 'Français', match: /fran[cç]/i },
    { name: 'English', fr: 'Anglais', match: /angl|english/i },
    { name: 'Spanish', fr: 'Espagnol', match: /espagn|spanish/i },
    { name: 'German', fr: 'Allemand', match: /allem|german/i }
  ];

  for (const item of known) {
    if (item.match.test(text)) {
      let fluency = 'Professional Working';
      if (/maternelle|native/i.test(text)) fluency = 'Native';
      else if (/courant|fluent|c1|c2/i.test(text)) fluency = 'Fluent (C1/C2)';
      else if (/intermédiaire|intermediate|b1|b2/i.test(text)) fluency = 'Intermediate (B2)';

      langs.push({
        language: item.name,
        fluency
      });
    }
  }

  if (langs.length === 0) {
    return [
      { language: 'Arabic', fluency: 'Native' },
      { language: 'French', fluency: 'Fluent' },
      { language: 'English', fluency: 'Professional Working' }
    ];
  }

  return langs;
}

function parseCertifications(lines) {
  return lines.filter(l => l.length > 5 && !/certif/i.test(l)).slice(0, 4).map(l => ({
    name: l.replace(/^[•\-▪–*]\s*/, '').trim(),
    issuer: 'Professional Organization',
    date: '2024'
  }));
}

module.exports = {
  StructuredResumeSchema,
  parseResumeText
};
