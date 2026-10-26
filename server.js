const express = require('express');
const cors = require('cors');
const path = require('path');
const { searchJobs, DOMAIN_PRESETS } = require('./services/aggregator');
const {
  getApplications,
  addApplication,
  updateApplication,
  deleteApplication,
  getProfile,
  updateProfile
} = require('./services/storage');
const { generateCoverLetter } = require('./services/letterGenerator');
const {
  getCustomProviders,
  addCustomProvider,
  removeCustomProvider,
  toggleCustomProvider
} = require('./services/customProvidersService');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 1. Search jobs across all sources
app.get('/api/jobs/search', async (req, res) => {
  try {
    const {
      domain = 'all',
      keywords = '',
      experienceLevel = 'all',
      location = 'Worldwide',
      source = 'all',
      workType = 'all',
      limit = '50'
    } = req.query;

    const results = await searchJobs({
      domain,
      keywords,
      experienceLevel,
      location,
      source,
      workType,
      limit: parseInt(limit, 10) || 50
    });

    res.json({ success: true, ...results });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Presets info
app.get('/api/presets', (req, res) => {
  res.json({ success: true, presets: DOMAIN_PRESETS });
});

// 3. Application Tracker CRUD
app.get('/api/applications', (req, res) => {
  try {
    const apps = getApplications();
    res.json({ success: true, count: apps.length, applications: apps });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/applications', (req, res) => {
  try {
    const jobData = req.body;
    if (!jobData.title || !jobData.url) {
      return res.status(400).json({ success: false, error: 'Job title and URL are required' });
    }
    const appItem = addApplication(jobData);
    res.json({ success: true, application: appItem });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch('/api/applications/:id', (req, res) => {
  try {
    const updated = updateApplication(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }
    res.json({ success: true, application: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/applications/:id', (req, res) => {
  try {
    const deleted = deleteApplication(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }
    res.json({ success: true, message: 'Application deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. User Profile
app.get('/api/profile', (req, res) => {
  res.json({ success: true, profile: getProfile() });
});

app.post('/api/profile', (req, res) => {
  const updated = updateProfile(req.body);
  if (!updated) return res.status(500).json({ success: false, error: 'Failed to update profile' });
  res.json({ success: true, profile: updated });
});

// 5. Generate Cold Email / Cover Letter
app.post('/api/cover-letter/generate', (req, res) => {
  const { jobTitle, company, location, language, customNotes } = req.body;
  if (!jobTitle || !company) {
    return res.status(400).json({ success: false, error: 'jobTitle and company are required' });
  }
  const result = generateCoverLetter({ jobTitle, company, location, language, customNotes });
  res.json({ success: true, ...result });
});

// 6. Export to CSV
app.get('/api/export/applications', (req, res) => {
  try {
    const apps = getApplications();
    const headers = ['Title', 'Company', 'Location', 'Status', 'Date Added', 'Date Applied', 'URL', 'Notes'];
    const rows = apps.map(a => [
      `"${(a.title || '').replace(/"/g, '""')}"`,
      `"${(a.company || '').replace(/"/g, '""')}"`,
      `"${(a.location || '').replace(/"/g, '""')}"`,
      `"${(a.status || '').replace(/"/g, '""')}"`,
      `"${(a.dateAdded || '').replace(/"/g, '""')}"`,
      `"${(a.dateApplied || '').replace(/"/g, '""')}"`,
      `"${(a.url || '').replace(/"/g, '""')}"`,
      `"${(a.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="job_applications.csv"');
    res.send(csvContent);
  } catch (err) {
    res.status(500).send('Error generating CSV');
  }
});

// 7. Custom Providers Management (Add your own RSS Feeds, APIs, Scrapers)
app.get('/api/custom-providers', (req, res) => {
  res.json({ success: true, providers: getCustomProviders() });
});

app.post('/api/custom-providers', (req, res) => {
  try {
    const { name, url, type = 'rss', category = 'all' } = req.body;
    if (!name || !url) {
      return res.status(400).json({ success: false, error: 'Provider name and URL are required' });
    }
    const created = addCustomProvider({ name, url, type, category, active: true });
    res.json({ success: true, provider: created });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/custom-providers/:id', (req, res) => {
  try {
    removeCustomProvider(req.params.id);
    res.json({ success: true, message: 'Provider deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch('/api/custom-providers/:id/toggle', (req, res) => {
  try {
    const updated = toggleCustomProvider(req.params.id);
    if (!updated) return res.status(404).json({ success: false, error: 'Provider not found' });
    res.json({ success: true, provider: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Fallback to index.html for SPA
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 JobRadar server running on http://localhost:${PORT}`);
  console.log(`💡 Multi-source Job Aggregator & Application Tracker active!`);
});
