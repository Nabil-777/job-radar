const express = require('express');
const multer = require('multer');
const { z } = require('zod');
const { db } = require('../db/database');
const { extractTextFromPdf } = require('../utils/pdfParser');
const { extractSkillsFromText } = require('../services/matchingEngine');

const router = express.Router();
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
  preferredLanguage: z.string().optional()
});

// GET /api/profile
router.get('/', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM user_profile WHERE id = ?').get('default');
    if (!row) {
      return res.json({
        success: true,
        profile: {
          fullName: 'Tech Professional',
          title: 'Software Engineer',
          email: '',
          phone: '',
          location: 'Morocco',
          skills: 'JavaScript, Python, React, Node.js, SQL, Docker',
          preferredLanguage: 'English'
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

    let languages = [];
    if (row.languages_json) {
      try {
        languages = JSON.parse(row.languages_json);
      } catch (e) {}
    }

    res.json({
      success: true,
      profile: {
        id: row.id,
        fullName: row.full_name,
        title: row.title,
        email: row.email,
        phone: row.phone,
        location: row.location,
        linkedinUrl: row.linkedin_url,
        githubUrl: row.github_url,
        portfolioUrl: row.portfolio_url,
        skills: Array.isArray(skills) ? skills.join(', ') : skills,
        skillsList: skills,
        languages: languages,
        experienceSummary: row.experience_summary,
        educationSummary: row.education_summary,
        school: row.education_summary,
        rawCvText: row.raw_cv_text ? true : false,
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
    const existing = db.prepare('SELECT id FROM user_profile WHERE id = ?').get('default');

    let skillsArray = [];
    if (Array.isArray(validated.skills)) {
      skillsArray = validated.skills;
    } else if (typeof validated.skills === 'string') {
      skillsArray = validated.skills.split(',').map(s => s.trim()).filter(Boolean);
    }

    const now = new Date().toISOString();

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
          skills_json = ?,
          education_summary = COALESCE(?, education_summary),
          updated_at = ?
        WHERE id = 'default'
      `).run(
        validated.fullName || null,
        validated.title || null,
        validated.email || null,
        validated.phone || null,
        validated.location || null,
        validated.linkedinUrl || null,
        validated.githubUrl || null,
        validated.portfolioUrl || null,
        JSON.stringify(skillsArray),
        validated.educationSummary || null,
        now
      );
    } else {
      db.prepare(`
        INSERT INTO user_profile (
          id, full_name, title, email, phone, location, linkedin_url, github_url, portfolio_url, skills_json, education_summary, updated_at
        ) VALUES ('default', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        validated.fullName || 'Candidate',
        validated.title || 'Software Developer',
        validated.email || '',
        validated.phone || '',
        validated.location || 'Morocco',
        validated.linkedinUrl || '',
        validated.githubUrl || '',
        validated.portfolioUrl || '',
        JSON.stringify(skillsArray),
        validated.educationSummary || '',
        now
      );
    }

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: err.errors.map(e => e.message).join(', ') });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/profile/upload-cv (PDF CV Parser & Auto-Profile Extraction)
router.post('/upload-cv', upload.single('cv'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, error: 'Please upload a valid PDF CV file.' });
    }

    const rawText = await extractTextFromPdf(req.file.buffer);
    if (!rawText || rawText.length < 20) {
      return res.status(422).json({
        success: false,
        error: 'Unable to extract text from the PDF. It may be scanned as an image or password protected.'
      });
    }

    // Auto-detect skills
    const detectedSkills = extractSkillsFromText(rawText);

    // Extract potential email
    const emailMatch = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    // Extract potential phone (Moroccan / international)
    const phoneMatch = rawText.match(/(?:\+212|0)[5-7]\d{8}/);
    // Extract potential LinkedIn
    const linkedinMatch = rawText.match(/linkedin\.com\/in\/[a-zA-Z0-9_-]+/i);
    // Extract potential GitHub
    const githubMatch = rawText.match(/github\.com\/[a-zA-Z0-9_-]+/i);

    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO user_profile (
        id, email, phone, linkedin_url, github_url, skills_json, raw_cv_text, updated_at
      ) VALUES ('default', ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        email = CASE WHEN email IS NULL OR email = '' THEN excluded.email ELSE email END,
        phone = CASE WHEN phone IS NULL OR phone = '' THEN excluded.phone ELSE phone END,
        linkedin_url = CASE WHEN linkedin_url IS NULL OR linkedin_url = '' THEN excluded.linkedin_url ELSE linkedin_url END,
        github_url = CASE WHEN github_url IS NULL OR github_url = '' THEN excluded.github_url ELSE github_url END,
        skills_json = excluded.skills_json,
        raw_cv_text = excluded.raw_cv_text,
        updated_at = excluded.updated_at
    `).run(
      emailMatch ? emailMatch[0] : null,
      phoneMatch ? phoneMatch[0] : null,
      linkedinMatch ? `https://${linkedinMatch[0]}` : null,
      githubMatch ? `https://${githubMatch[0]}` : null,
      JSON.stringify(detectedSkills),
      rawText,
      now
    );

    const updated = db.prepare('SELECT * FROM user_profile WHERE id = ?').get('default');

    res.json({
      success: true,
      message: 'CV parsed and profile updated successfully!',
      detectedSkills,
      extractedMeta: {
        email: emailMatch ? emailMatch[0] : null,
        phone: phoneMatch ? phoneMatch[0] : null,
        linkedin: linkedinMatch ? `https://${linkedinMatch[0]}` : null,
        github: githubMatch ? `https://${githubMatch[0]}` : null,
        textLength: rawText.length
      },
      profile: updated
    });
  } catch (err) {
    console.error('[CV Upload Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
