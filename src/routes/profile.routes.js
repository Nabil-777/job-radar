const express = require('express');
const multer = require('multer');
const { z } = require('zod');
const { db } = require('../db/database');
const { extractTextFromPdf } = require('../utils/pdfParser');
const { parseResumeText, StructuredResumeSchema } = require('../services/cvParserService');
const { extractSkillsFromText } = require('../services/matchingEngine');
const { optionalAuth } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(optionalAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const profileSchema = z.object({
  fullName: z.string().optional(),
  title: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  location: z.string().optional(),
  linkedinUrl: z.string().optional(),
  githubUrl: z.string().optional(),
  portfolioUrl: z.string().optional(),
  skills: z.union([z.string(), z.array(z.string())]).optional(),
  languages: z.union([z.string(), z.array(z.string())]).optional(),
  experienceSummary: z.string().optional(),
  educationSummary: z.string().optional(),
  preferredLanguage: z.string().optional(),
  structuredCv: z.any().optional()
});

// GET /api/profile
router.get('/', (req, res) => {
  try {
    const userId = req.user?.id || 'default';
    const row = db.prepare('SELECT * FROM user_profile WHERE user_id = ? OR id = ?').get(userId, userId);

    if (!row) {
      return res.json({
        success: true,
        profile: {
          fullName: req.user?.fullName || 'Candidate',
          title: 'Software Developer',
          email: req.user?.email || '',
          phone: '',
          location: 'Morocco',
          skills: 'JavaScript, Python, React, Node.js, SQL, Docker',
          preferredLanguage: 'English',
          structuredCv: null
        }
      });
    }

    let skills = [];
    if (row.skills_json) {
      try {
        skills = JSON.parse(row.skills_json);
      } catch (e) {
        skills = row.skills_json.split(',').map(s => s.trim());
      }
    }

    let structuredCv = null;
    if (row.structured_cv_json) {
      try {
        structuredCv = JSON.parse(row.structured_cv_json);
      } catch (e) {}
    }

    res.json({
      success: true,
      profile: {
        fullName: row.full_name || '',
        title: row.title || '',
        email: row.email || req.user?.email || '',
        phone: row.phone || '',
        location: row.location || 'Morocco',
        linkedinUrl: row.linkedin_url || '',
        githubUrl: row.github_url || '',
        portfolioUrl: row.portfolio_url || '',
        skills: Array.isArray(skills) ? skills.join(', ') : '',
        skillsArray: Array.isArray(skills) ? skills : [],
        languages: row.languages_json ? JSON.parse(row.languages_json) : ['Arabic', 'French', 'English'],
        experienceSummary: row.experience_summary || '',
        educationSummary: row.education_summary || '',
        preferredLanguage: 'English',
        rawCvText: !!row.raw_cv_text,
        structuredCv,
        updatedAt: row.updated_at
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/profile
router.post('/', (req, res) => {
  try {
    const validated = profileSchema.parse(req.body);
    const userId = req.user?.id || 'default';
    const now = new Date().toISOString();

    let skillsArray = [];
    if (Array.isArray(validated.skills)) {
      skillsArray = validated.skills;
    } else if (typeof validated.skills === 'string') {
      skillsArray = validated.skills.split(',').map(s => s.trim()).filter(Boolean);
    }

    const structuredCvJson = validated.structuredCv ? JSON.stringify(validated.structuredCv) : null;

    const existing = db.prepare('SELECT id FROM user_profile WHERE user_id = ? OR id = ?').get(userId, userId);

    if (existing) {
      db.prepare(`
        UPDATE user_profile SET
          full_name = COALESCE(?, full_name),
          title = COALESCE(?, title),
          email = COALESCE(?, email),
          phone = COALESCE(?, phone),
          location = COALESCE(?, location),
          linkedin_url = COALESCE(?, linkedin_url),
          github_url = COALESCE(?, github_url),
          portfolio_url = COALESCE(?, portfolio_url),
          skills_json = COALESCE(?, skills_json),
          education_summary = COALESCE(?, education_summary),
          structured_cv_json = CASE WHEN ? IS NOT NULL THEN ? ELSE structured_cv_json END,
          updated_at = ?
        WHERE id = ? OR user_id = ?
      `).run(
        validated.fullName || null,
        validated.title || null,
        validated.email || null,
        validated.phone || null,
        validated.location || null,
        validated.linkedinUrl || null,
        validated.githubUrl || null,
        validated.portfolioUrl || null,
        skillsArray.length ? JSON.stringify(skillsArray) : null,
        validated.educationSummary || null,
        structuredCvJson,
        structuredCvJson,
        now,
        existing.id,
        userId
      );
    } else {
      db.prepare(`
        INSERT INTO user_profile (
          id, user_id, full_name, title, email, phone, location, linkedin_url, github_url, portfolio_url, skills_json, education_summary, structured_cv_json, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        userId,
        userId,
        validated.fullName || 'Candidate',
        validated.title || 'Software Developer',
        validated.email || req.user?.email || '',
        validated.phone || '',
        validated.location || 'Morocco',
        validated.linkedinUrl || '',
        validated.githubUrl || '',
        validated.portfolioUrl || '',
        JSON.stringify(skillsArray),
        validated.educationSummary || '',
        structuredCvJson,
        now
      );
    }

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: err.issues.map(e => e.message).join(', ') });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/profile/structured-cv (Save user edits to Structured Resume)
router.put('/structured-cv', (req, res) => {
  try {
    const validated = StructuredResumeSchema.parse(req.body);
    const userId = req.user?.id || 'default';
    const now = new Date().toISOString();

    const flatSkills = [
      ...(validated.skills.languages || []),
      ...(validated.skills.frameworks || []),
      ...(validated.skills.databases || []),
      ...(validated.skills.cloudDevOps || []),
      ...(validated.skills.aiCyberData || []),
      ...(validated.skills.engineeringPractices || [])
    ];

    db.prepare(`
      INSERT INTO user_profile (
        id, user_id, full_name, title, email, phone, location, linkedin_url, github_url, portfolio_url, skills_json, structured_cv_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        full_name = excluded.full_name,
        title = excluded.title,
        email = excluded.email,
        phone = excluded.phone,
        location = excluded.location,
        linkedin_url = excluded.linkedin_url,
        github_url = excluded.github_url,
        portfolio_url = excluded.portfolio_url,
        skills_json = excluded.skills_json,
        structured_cv_json = excluded.structured_cv_json,
        updated_at = excluded.updated_at
    `).run(
      userId,
      userId,
      validated.basics.fullName,
      validated.basics.headline,
      validated.basics.email,
      validated.basics.phone,
      validated.basics.location,
      validated.basics.links?.linkedin || '',
      validated.basics.links?.github || '',
      validated.basics.links?.portfolio || '',
      JSON.stringify(flatSkills),
      JSON.stringify(validated),
      now
    );

    res.json({
      success: true,
      message: 'Structured CV updated successfully',
      structuredCv: validated
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: err.issues.map(e => e.message).join(', ') });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/profile/upload-cv (Coordinate-Aware PDF CV Parser & Auto-Extraction)
router.post('/upload-cv', upload.single('cv'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, error: 'Please upload a valid PDF CV file.' });
    }

    let rawText = '';
    try {
      rawText = await extractTextFromPdf(req.file.buffer);
    } catch (parseErr) {
      if (parseErr.code === 'SCANNED_PDF_UNSUPPORTED') {
        return res.status(422).json({
          success: false,
          code: 'SCANNED_PDF_UNSUPPORTED',
          error: 'This appears to be a scanned image PDF without selectable text. Please upload a digital PDF or edit your details in the resume editor.'
        });
      }
      throw parseErr;
    }

    if (!rawText || rawText.length < 20) {
      return res.status(422).json({
        success: false,
        code: 'SCANNED_PDF_UNSUPPORTED',
        error: 'Unable to extract text from the PDF. It may be scanned as an image or password protected.'
      });
    }

    const userId = req.user?.id || 'default';

    // Parse into structured canonical resume JSON
    const structuredCv = await parseResumeText(rawText);
    const detectedSkills = extractSkillsFromText(rawText);

    // Combine taxonomy skills with parsed structured skills
    const allSkillsSet = new Set([
      ...detectedSkills,
      ...(structuredCv.skills.languages || []),
      ...(structuredCv.skills.frameworks || []),
      ...(structuredCv.skills.databases || []),
      ...(structuredCv.skills.cloudDevOps || []),
      ...(structuredCv.skills.aiCyberData || []),
      ...(structuredCv.skills.engineeringPractices || [])
    ]);
    const finalSkills = Array.from(allSkillsSet);

    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO user_profile (
        id, user_id, full_name, title, email, phone, location, linkedin_url, github_url, portfolio_url, skills_json, raw_cv_text, structured_cv_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        full_name = CASE WHEN excluded.full_name != 'Candidate Name' THEN excluded.full_name ELSE full_name END,
        title = CASE WHEN excluded.title != 'Software Engineer' THEN excluded.title ELSE title END,
        email = CASE WHEN excluded.email != '' THEN excluded.email ELSE email END,
        phone = CASE WHEN excluded.phone != '' THEN excluded.phone ELSE phone END,
        location = CASE WHEN excluded.location != '' THEN excluded.location ELSE location END,
        linkedin_url = CASE WHEN excluded.linkedin_url != '' THEN excluded.linkedin_url ELSE linkedin_url END,
        github_url = CASE WHEN excluded.github_url != '' THEN excluded.github_url ELSE github_url END,
        portfolio_url = CASE WHEN excluded.portfolio_url != '' THEN excluded.portfolio_url ELSE portfolio_url END,
        skills_json = excluded.skills_json,
        raw_cv_text = excluded.raw_cv_text,
        structured_cv_json = excluded.structured_cv_json,
        updated_at = excluded.updated_at
    `).run(
      userId,
      userId,
      structuredCv.basics.fullName || 'Candidate Name',
      structuredCv.basics.headline || 'Software Engineer',
      structuredCv.basics.email || (req.user?.email || ''),
      structuredCv.basics.phone || '',
      structuredCv.basics.location || 'Morocco',
      structuredCv.basics.links?.linkedin || '',
      structuredCv.basics.links?.github || '',
      structuredCv.basics.links?.portfolio || '',
      JSON.stringify(finalSkills),
      rawText,
      JSON.stringify(structuredCv),
      now
    );

    const updated = db.prepare('SELECT * FROM user_profile WHERE user_id = ? OR id = ?').get(userId, userId);

    res.json({
      success: true,
      message: 'CV parsed and structured profile generated successfully!',
      structuredCv,
      detectedSkills: finalSkills,
      profile: updated
    });
  } catch (err) {
    console.error('[CV Upload Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
