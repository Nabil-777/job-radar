const express = require('express');
const { z } = require('zod');
const { db } = require('../db/database');
const { generateAIPitch, generateTailoredCV } = require('../services/aiService');
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
  language: z.string().optional().default('English'),
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

// POST /api/ai/pitch & /api/ai/cover-letter
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

// POST /api/ai/tailored-cv (Tailored CV Generator for each opportunity)
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

    const tailoredCv = await generateTailoredCV({
      job,
      profile,
      language: body.language || 'English',
      customNotes: body.customNotes || ''
    });

    res.json({
      success: true,
      tailoredCv
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: err.issues.map(e => e.message).join(', ') });
    }
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
