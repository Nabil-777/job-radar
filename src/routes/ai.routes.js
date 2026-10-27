const express = require('express');
const { z } = require('zod');
const { db } = require('../db/database');
const { generateAIPitch, generateTailoredCV } = require('../services/aiService');
const { generateTailoredResume } = require('../services/cvGeneratorService');
const { optionalAuth } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(optionalAuth);

const pitchRequestSchema = z.object({
  job: z.object({
    title: z.string(),
    company: z.string(),
    location: z.string().optional(),
    experienceLevel: z.string().optional(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional()
  }).optional(),
  jobTitle: z.string().optional(),
  company: z.string().optional(),
  location: z.string().optional(),
  language: z.string().optional().default('auto'),
  template: z.enum(['jake-ats', 'morocco-pfe', 'modern-split']).optional().default('jake-ats'),
  customNotes: z.string().optional()
});

function getCandidateProfile(userId) {
  return db.prepare('SELECT * FROM user_profile WHERE user_id = ? OR id = ?').get(userId, userId) || {
    full_name: 'Tech Candidate',
    title: 'Software Developer',
    location: 'Morocco',
    skills_json: '["JavaScript","Python","React","Node.js","SQL","Docker"]'
  };
}

// POST /api/ai/pitch
router.post('/pitch', async (req, res) => {
  try {
    const body = pitchRequestSchema.parse(req.body);

    const job = body.job || {
      title: body.jobTitle || 'Software Engineer',
      company: body.company || 'Tech Company',
      location: body.location || 'Morocco / Remote'
    };

    const userId = req.user?.id || 'default';
    const profile = getCandidateProfile(userId);

    const result = await generateAIPitch({
      job,
      profile,
      language: body.language || 'English',
      customNotes: body.customNotes || ''
    });

    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: err.issues.map(e => e.message).join(', ') });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/ai/tailored-cv (Fact-Preserving ATS-Optimized A4 Resume Generator)
router.post('/tailored-cv', async (req, res) => {
  try {
    const body = pitchRequestSchema.parse(req.body);

    const job = body.job || {
      title: body.jobTitle || 'Software Engineer',
      company: body.company || 'Tech Company',
      location: body.location || 'Morocco / Remote'
    };

    const userId = req.user?.id || 'default';
    const profile = getCandidateProfile(userId);

    const result = await generateTailoredResume({
      job,
      profile,
      language: body.language || 'auto',
      template: body.template || 'jake-ats',
      customNotes: body.customNotes || ''
    });

    res.json({
      success: true,
      targetLanguage: result.targetLanguage,
      template: result.template,
      tailoredResumeJson: result.tailoredResumeJson,
      atsAnalysis: result.atsAnalysis,
      renderedHtml: result.renderedHtml,
      markdown: result.markdown,
      // Backward compatibility object
      tailoredCv: {
        success: true,
        candidateName: result.tailoredResumeJson.basics.fullName,
        targetedTitle: result.tailoredResumeJson.basics.headline,
        summary: result.tailoredResumeJson.basics.summary,
        markdown: result.markdown,
        matchScore: result.atsAnalysis.score,
        matchedSkills: result.atsAnalysis.matchedKeywords,
        missingSkills: result.atsAnalysis.missingKeywords,
        contact: {
          email: result.tailoredResumeJson.basics.email,
          phone: result.tailoredResumeJson.basics.phone,
          location: result.tailoredResumeJson.basics.location
        },
        skillsByCategory: {
          coreStack: result.tailoredResumeJson.skills.languages,
          frameworksAndDatabases: [
            ...(result.tailoredResumeJson.skills.frameworks || []),
            ...(result.tailoredResumeJson.skills.databases || [])
          ],
          toolsAndDevOps: result.tailoredResumeJson.skills.cloudDevOps
        },
        experience: result.tailoredResumeJson.workExperience,
        projects: result.tailoredResumeJson.projects,
        education: result.tailoredResumeJson.education
      }
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: err.issues.map(e => e.message).join(', ') });
    }
    console.error('[Tailored CV Route Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Backward compatibility alias for /api/cover-letter/generate
router.post('/cover-letter', async (req, res) => {
  try {
    const { jobTitle, company, location, language = 'English', customNotes = '' } = req.body;
    if (!jobTitle || !company) {
      return res.status(400).json({ success: false, error: 'jobTitle and company are required' });
    }

    const userId = req.user?.id || 'default';
    const profile = getCandidateProfile(userId);

    const result = await generateAIPitch({
      job: { title: jobTitle, company, location },
      profile,
      language,
      customNotes
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
