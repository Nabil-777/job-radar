const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { db } = require('../db/database');
const { signUserToken, authRequired } = require('../middleware/auth.middleware');

const router = express.Router();

const signupSchema = z.object({
  email: z.string().email('Please enter a valid email address').transform(v => v.trim().toLowerCase()),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  fullName: z.string().optional(),
  name: z.string().optional()
}).transform(data => {
  const finalName = (data.fullName || data.name || 'JobRadar User').trim();
  if (finalName.length < 2) {
    throw new Error('Full name must be at least 2 characters');
  }
  return {
    email: data.email,
    password: data.password,
    fullName: finalName
  };
});

const loginSchema = z.object({
  email: z.string().email().transform(v => v.trim().toLowerCase()),
  password: z.string().min(1, 'Password is required')
});

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const parseResult = signupSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.error.issues[0]?.message || 'Invalid registration data'
      });
    }

    const { email, password, fullName } = parseResult.data;

    // Check if email already registered
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email address already exists. Please sign in.'
      });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const userId = 'usr_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    const nowIso = new Date().toISOString();

    // Insert user into SQLite inside a transaction
    const createUserAndProfile = db.transaction(() => {
      db.prepare(`
        INSERT INTO users (id, email, password_hash, full_name, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(userId, email, passwordHash, fullName, nowIso, nowIso);

      // Initialize user profile
      db.prepare(`
        INSERT OR REPLACE INTO user_profile (id, user_id, full_name, email, location, skills_json, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        userId,
        userId,
        fullName,
        email,
        'Morocco',
        JSON.stringify(['JavaScript', 'Python', 'React', 'Node.js', 'SQL', 'Docker']),
        nowIso
      );
    });
    createUserAndProfile();

    const userPayload = {
      id: userId,
      email,
      fullName
    };

    const token = signUserToken(userPayload);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: userPayload
    });
  } catch (err) {
    console.error('[Auth Signup Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to create account. Please try again.'
    });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.error.issues[0]?.message || 'Invalid credentials'
      });
    }

    const { email, password } = parseResult.data;

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    const userPayload = {
      id: user.id,
      email: user.email,
      fullName: user.full_name
    };

    const token = signUserToken(userPayload);

    return res.json({
      success: true,
      token,
      user: userPayload
    });
  } catch (err) {
    console.error('[Auth Login Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Sign in failed. Please try again.'
    });
  }
});

// GET /api/auth/me
router.get('/me', authRequired, (req, res) => {
  try {
    const profile = db.prepare('SELECT * FROM user_profile WHERE user_id = ? OR id = ?').get(req.user.id, req.user.id);
    return res.json({
      success: true,
      user: req.user,
      profile: profile || null
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/demo (Instant Quick 1-Click Guest / Test Account)
router.post('/demo', async (req, res) => {
  try {
    const demoEmail = 'demo@jobradar.local';
    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(demoEmail);

    if (!user) {
      const passwordHash = await bcrypt.hash('JobRadar2026!', 10);
      const userId = 'usr_demo_account';
      const now = new Date().toISOString();

      const createDemoUserAndProfile = db.transaction(() => {
        db.prepare(`
          INSERT INTO users (id, email, password_hash, full_name, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(userId, demoEmail, passwordHash, 'Demo Engineer', now, now);

        db.prepare(`
          INSERT OR REPLACE INTO user_profile (id, user_id, full_name, email, location, title, skills_json, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          userId,
          userId,
          'Demo Engineer',
          demoEmail,
          'Casablanca, Morocco',
          'Full-Stack & AI Engineer',
          JSON.stringify(['React', 'Node.js', 'Python', 'FastAPI', 'Docker', 'PostgreSQL', 'Git']),
          now
        );
      });
      createDemoUserAndProfile();

      user = { id: userId, email: demoEmail, full_name: 'Demo Engineer' };
    }

    const token = signUserToken({ id: user.id, email: user.email, fullName: user.full_name });

    return res.json({
      success: true,
      token,
      user: { id: user.id, email: user.email, fullName: user.full_name }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
