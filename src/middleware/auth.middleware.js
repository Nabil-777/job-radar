const jwt = require('jsonwebtoken');
const { db } = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'jobradar-secure-jwt-signature-key-2026';
const TOKEN_EXPIRY = '30d';

function signUserToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      fullName: user.full_name || user.fullName
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  return null;
}

function authRequired(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please sign in.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Verify user exists in SQLite
    const user = db.prepare('SELECT id, email, full_name, created_at FROM users WHERE id = ?').get(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User account not found or expired. Please sign in again.'
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      fullName: user.full_name
    };
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired session token.'
    });
  }
}

function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    // Default fallback to 'default' guest profile for zero-friction browsing
    req.user = {
      id: 'default',
      email: 'guest@jobradar.local',
      fullName: 'Guest Candidate'
    };
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, email, full_name FROM users WHERE id = ?').get(decoded.id);
    if (user) {
      req.user = {
        id: user.id,
        email: user.email,
        fullName: user.full_name
      };
    } else {
      req.user = { id: 'default', email: 'guest@jobradar.local', fullName: 'Guest Candidate' };
    }
  } catch (err) {
    req.user = { id: 'default', email: 'guest@jobradar.local', fullName: 'Guest Candidate' };
  }
  next();
}

module.exports = {
  signUserToken,
  authRequired,
  optionalAuth,
  JWT_SECRET
};
