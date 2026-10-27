require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Database initialization & legacy migration
const { db, DB_PATH } = require('./src/db/database');
const { runMigration } = require('./src/db/migrateJson');
runMigration();

// Aggregator & Cron
const { searchJobs, DOMAIN_PRESETS } = require('./services/aggregator');
const { startRadarCron } = require('./src/jobs/radarCron');

// Middleware
const { requestIdMiddleware, errorHandler } = require('./src/middleware/error.middleware');

// Modular Route Controllers
const authRoutes = require('./src/routes/auth.routes');
const jobsRoutes = require('./src/routes/jobs.routes');
const applicationsRoutes = require('./src/routes/applications.routes');
const profileRoutes = require('./src/routes/profile.routes');
const providersRoutes = require('./src/routes/providers.routes');
const aiRoutes = require('./src/routes/ai.routes');

const app = express();
const PORT = process.env.PORT || 4000;

// Request ID tracking
app.use(requestIdMiddleware);

// Security Middleware (P0 Task 3: Content Security Policy)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://unpkg.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:4000').split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
}));

// Rate Limiting (500 requests per 15 minutes per IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/providers', providersRoutes);
app.use('/api/custom-providers', providersRoutes); // Backwards compatibility
app.use('/api/ai', aiRoutes);
app.use('/api/cover-letter', aiRoutes); // Backwards compatibility

// Health Check Route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: '2.0.0',
    uptime: process.uptime(),
    database: 'connected',
    timestamp: new Date().toISOString()
  });
});

// Backward compatibility redirects & presets
app.get('/api/presets', (req, res) => {
  res.json({ success: true, presets: DOMAIN_PRESETS });
});

app.get('/api/export/applications', (req, res) => {
  res.redirect('/api/applications/export/csv');
});

// SPA Fallback
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile('index.html', { root: path.join(__dirname, 'public') });
  }
  next();
});

// Centralized Error Handling Middleware (P0 Task 4: Sanitize Error Responses)
app.use(errorHandler);

// Startup Security Validation (P0)
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET must be set and ≥32 chars.');
  process.exit(1);
}

// Start Server and Background Radar
app.listen(PORT, () => {
  console.log(`🚀 JobRadar v2.0 running on http://localhost:${PORT}`);
  console.log(`📦 SQLite database active at: ${DB_PATH}`);
  console.log(`🛡️  Security hardening (Helmet + Rate Limiting) enabled`);

  // Start background job discovery sweeps
  startRadarCron(searchJobs);
});

module.exports = app;
