const express = require('express');
const { z } = require('zod');
const { db } = require('../db/database');
const { generateAIPitch } = require('../services/aiService');

const router = express.Router();

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

// POST /api/ai/pitch & /api/ai/cover-letter
router.post('/pitch', async (req, res) => {
  try {
    const body = pitchRequestSchema.parse(req.body);

    const job = body.job || {
      title: body.jobTitle || 'Software Engineer',
      company: body.company || 'Tech Company',
      location: body.location || 'Morocco / Remote'
    };

    const profile = db.prepare('SELECT * FROM user_profile WHERE id = ?').get('default') || {
      full_name: 'Tech Candidate',
      title: 'Software Developer',
      location: 'Morocco',
      skills_json: '["JavaScript","Python","React","Node.js"]'
    };

    const result = await generateAIPitch({
      job,
      profile,
      language: body.language || 'English',
      customNotes: body.customNotes || ''
    });

    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: err.errors.map(e => e.message).join(', ') });
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

    const profile = db.prepare('SELECT * FROM user_profile WHERE id = ?').get('default') || {};

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
