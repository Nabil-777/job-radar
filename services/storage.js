const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const APPS_FILE = path.join(DATA_DIR, 'applications.json');
const PROFILE_FILE = path.join(DATA_DIR, 'user_profile.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial defaults
if (!fs.existsSync(APPS_FILE)) {
  fs.writeFileSync(APPS_FILE, JSON.stringify([], null, 2), 'utf-8');
}

const DEFAULT_PROFILE = {
  fullName: 'Your Name',
  email: 'your.email@example.com',
  phone: '+212 600-000000',
  title: 'Full-Stack Developer / AI Enthusiast',
  school: 'Engineering / CS Student',
  portfolioUrl: 'https://github.com/yourusername',
  linkedinUrl: 'https://linkedin.com/in/yourprofile',
  skills: 'Python, JavaScript, React, Node.js, Docker, Git, REST APIs',
  preferredLanguage: 'English' // 'English' | 'French'
};

if (!fs.existsSync(PROFILE_FILE)) {
  fs.writeFileSync(PROFILE_FILE, JSON.stringify(DEFAULT_PROFILE, null, 2), 'utf-8');
}

function getApplications() {
  try {
    const raw = fs.readFileSync(APPS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading applications:', err.message);
    return [];
  }
}

function saveApplications(apps) {
  try {
    fs.writeFileSync(APPS_FILE, JSON.stringify(apps, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error saving applications:', err.message);
    return false;
  }
}

function addApplication(jobData) {
  const apps = getApplications();
  const existing = apps.find(a => a.id === jobData.id || a.url === jobData.url);

  if (existing) {
    return existing; // already tracked
  }

  const newApp = {
    id: jobData.id || 'app-' + Date.now(),
    title: jobData.title,
    company: jobData.company,
    location: jobData.location,
    url: jobData.url,
    source: jobData.source || 'Other',
    experienceLevel: jobData.experienceLevel || 'Entry / Internship',
    status: jobData.status || 'Saved', // Saved, Applied, Interview, Offer, Rejected
    notes: jobData.notes || '',
    dateAdded: new Date().toISOString(),
    dateApplied: jobData.status === 'Applied' ? new Date().toISOString() : null,
    salary: jobData.salary || ''
  };

  apps.unshift(newApp);
  saveApplications(apps);
  return newApp;
}

function updateApplication(id, updates) {
  const apps = getApplications();
  const idx = apps.findIndex(a => a.id === id);
  if (idx === -1) return null;

  // If changing status to Applied and dateApplied not set, set it
  if (updates.status === 'Applied' && !apps[idx].dateApplied) {
    updates.dateApplied = new Date().toISOString();
  }

  apps[idx] = { ...apps[idx], ...updates, updatedAt: new Date().toISOString() };
  saveApplications(apps);
  return apps[idx];
}

function deleteApplication(id) {
  let apps = getApplications();
  const initialLength = apps.length;
  apps = apps.filter(a => a.id !== id);
  if (apps.length !== initialLength) {
    saveApplications(apps);
    return true;
  }
  return false;
}

function getProfile() {
  try {
    const raw = fs.readFileSync(PROFILE_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return DEFAULT_PROFILE;
  }
}

function updateProfile(newProfile) {
  try {
    const merged = { ...getProfile(), ...newProfile };
    fs.writeFileSync(PROFILE_FILE, JSON.stringify(merged, null, 2), 'utf-8');
    return merged;
  } catch (err) {
    console.error('Error updating profile:', err.message);
    return null;
  }
}

module.exports = {
  getApplications,
  addApplication,
  updateApplication,
  deleteApplication,
  getProfile,
  updateProfile
};
