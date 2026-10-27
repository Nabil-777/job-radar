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

// Modular Route Controllers
const jobsRoutes = require('./src/routes/jobs.routes');
const applicationsRoutes = require('./src/routes/applications.routes');
const profileRoutes = require('./src/routes/profile.routes');
const providersRoutes = require('./src/routes/providers.routes');
const aiRoutes = require('./src/routes/ai.routes');

const app = express();
const PORT = process.env.PORT || 4000;

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allows inline script evaluation for Tailwind CDN & Lucide
  crossOriginEmbedderPolicy: false
}));
app.use(cors());

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

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// SPA Fallback
app.use((req, res) => {
  res.sendFile('index.html', { root: path.join(__dirname, 'public') });
});

// Start Server and Background Radar
app.listen(PORT, () => {
  console.log(`🚀 JobRadar v2.0 running on http://localhost:${PORT}`);
  console.log(`📦 SQLite database active at: ${DB_PATH}`);
  console.log(`🛡️  Security hardening (Helmet + Rate Limiting) enabled`);

  // Start background job discovery sweeps
  startRadarCron(searchJobs);
});

module.exports = app;
