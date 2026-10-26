// JobRadar Frontend State & Controller
let state = {
  currentDomain: 'all',
  currentTab: 'jobs',
  jobs: [],
  applications: [],
  profile: null,
  activeModalJob: null,
  activeTrackerFilter: 'all',
  isLoading: false
};

// Initialize app on DOM ready
document.addEventListener('DOMContentLoaded', async () => {
  if (window.lucide) lucide.createIcons();
  await loadUserProfile();
  await loadApplications();
  triggerSearch(); // initial search
});

// Tab Switcher
function switchTab(tabName) {
  state.currentTab = tabName;

  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.classList.remove('active', 'bg-brand-600', 'text-white');
    btn.classList.add('text-slate-400');
  });

  const activeBtn = document.getElementById(`tab-${tabName}`);
  if (activeBtn) {
    activeBtn.classList.add('active', 'bg-brand-600', 'text-white');
    activeBtn.classList.remove('text-slate-400');
  }

  // Hide all views
  ['jobs', 'morocco', 'tracker', 'profile', 'tips'].forEach(name => {
    const el = document.getElementById(`view-${name}`);
    if (el) el.classList.add('hidden');
  });

  // Show active view
  const targetView = document.getElementById(`view-${tabName}`);
  if (targetView) targetView.classList.remove('hidden');

  if (window.lucide) lucide.createIcons();
}

// Domain Selector Pills
function setDomain(domain) {
  state.currentDomain = domain;
  document.querySelectorAll('.domain-pill').forEach(pill => {
    if (pill.dataset.domain === domain) {
      pill.className = 'domain-pill px-3 py-1.5 rounded-lg text-xs font-medium border border-brand-500/40 bg-brand-600/20 text-brand-300 hover:bg-brand-600 hover:text-white transition-all whitespace-nowrap active';
    } else {
      pill.className = 'domain-pill px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 bg-surface-800 text-slate-300 hover:border-brand-500/50 hover:text-white transition-all whitespace-nowrap';
    }
  });
  triggerSearch();
}

// Handle Form Submission
function handleSearch(e) {
  if (e) e.preventDefault();
  triggerSearch();
}

// Trigger Search Request
async function triggerSearch() {
  const keywords = document.getElementById('input-keywords').value;
  const experienceLevel = document.getElementById('select-level').value;
  const location = document.getElementById('select-location').value;
  const source = document.getElementById('select-source').value;
  const workType = document.getElementById('select-worktype').value;

  const cardsContainer = document.getElementById('job-cards-container');
  const skeletons = document.getElementById('loading-skeletons');
  const emptyState = document.getElementById('empty-state');
  const badgeLoading = document.getElementById('badge-loading');

  cardsContainer.innerHTML = '';
  skeletons.classList.remove('hidden');
  emptyState.classList.add('hidden');
  badgeLoading.classList.remove('hidden');

  try {
    const params = new URLSearchParams({
      domain: state.currentDomain,
      keywords,
      experienceLevel,
      location,
      source,
      workType,
      limit: '40'
    });

    const res = await fetch(`/api/jobs/search?${params.toString()}`);
    const data = await res.json();

    skeletons.classList.add('hidden');
    badgeLoading.classList.add('hidden');

    if (data.success && data.jobs && data.jobs.length > 0) {
      state.jobs = data.jobs;
      updateStats(data.stats);
      renderJobCards(data.jobs);
    } else {
      state.jobs = [];
      emptyState.classList.remove('hidden');
      updateStats({ total: 0, byLevel: { internship: 0, entry: 0 } });
    }
  } catch (err) {
    console.error('Search error:', err);
    skeletons.classList.add('hidden');
    badgeLoading.classList.add('hidden');
    emptyState.classList.remove('hidden');
  }
}

// Update Top Statistics
function updateStats(stats) {
  const statBar = document.getElementById('results-stat-bar');
  if (statBar) statBar.classList.remove('hidden');

  document.getElementById('stat-total').textContent = stats.total || 0;
  document.getElementById('stat-intern').textContent = stats.byLevel?.internship || 0;
  document.getElementById('stat-entry').textContent = stats.byLevel?.entry || 0;
}

// Render Job Cards
function renderJobCards(jobs) {
  const container = document.getElementById('job-cards-container');
  container.innerHTML = '';

  const trackedUrls = new Set(state.applications.map(a => a.url));

  jobs.forEach(job => {
    const isTracked = trackedUrls.has(job.url);

    // Experience badge class
    let levelBadge = 'badge-entry';
    let levelIcon = '🚀';
    const lowerLevel = (job.experienceLevel || '').toLowerCase();
    if (lowerLevel.includes('intern')) {
      levelBadge = 'badge-intern';
      levelIcon = '🎓';
    } else if (lowerLevel.includes('senior')) {
      levelBadge = 'badge-senior';
      levelIcon = '🏆';
    }

    // Source badge
    let cleanSourceKey = (job.source || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanSourceKey.includes('hackernews')) cleanSourceKey = 'hackernews';
    if (cleanSourceKey.includes('jobzyn')) cleanSourceKey = 'jobzyn';
    if (cleanSourceKey.includes('wetech')) cleanSourceKey = 'wetech';
    if (cleanSourceKey.includes('moroccotopesn')) cleanSourceKey = 'moroccotopesnhub';
    if (cleanSourceKey.includes('talent')) cleanSourceKey = 'talentcommaroc';
    if (cleanSourceKey.includes('dreamjob')) cleanSourceKey = 'dreamjobma';
    if (cleanSourceKey.includes('emploi')) cleanSourceKey = 'emploima';
    if (cleanSourceKey.includes('custom') || cleanSourceKey.includes('rss') || cleanSourceKey.includes('feed')) cleanSourceKey = 'custom';
    const sourceClass = `badge-source-${cleanSourceKey}`;

    // Tag pills
    const tagHtml = (job.tags || []).slice(0, 4).map(t =>
      `<span class="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700/60">${t}</span>`
    ).join('');

    const card = document.createElement('div');
    card.className = 'job-card bg-surface-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-md space-y-4';

    card.innerHTML = `
      <div class="space-y-3">
        <!-- Top row: Company & Badges -->
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-lg bg-surface-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300 text-sm overflow-hidden flex-shrink-0">
              ${job.logo ? `<img src="${job.logo}" alt="${job.company}" class="w-full h-full object-contain" onerror="this.parentElement.textContent='${job.company[0]}'">` : job.company[0] || 'C'}
            </div>
            <div>
              <h4 class="text-xs font-semibold text-slate-400 line-clamp-1">${job.company}</h4>
              <div class="flex items-center space-x-2 text-[11px] text-slate-500">
                <span class="flex items-center space-x-1">
                  <i data-lucide="map-pin" class="w-3 h-3 text-slate-500"></i>
                  <span class="line-clamp-1">${job.location}</span>
                </span>
                ${job.remote ? `<span class="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 text-[10px] border border-emerald-500/20">Remote</span>` : ''}
              </div>
            </div>
          </div>
          <div class="flex flex-col items-end space-y-1">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold ${levelBadge}">
              ${levelIcon} ${job.experienceLevel}
            </span>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-medium ${sourceClass}">
              ${job.source}
            </span>
          </div>
        </div>

        <!-- Job Title -->
        <div>
          <h3 class="text-base font-bold text-white hover:text-brand-300 transition-colors line-clamp-2">
            <a href="${job.url}" target="_blank" rel="noopener noreferrer">${job.title}</a>
          </h3>
          ${job.salary ? `<p class="text-xs text-amber-400/90 font-medium mt-1">💰 ${job.salary}</p>` : ''}
          ${job.descriptionSnippet ? `<p class="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">${job.descriptionSnippet}</p>` : ''}
        </div>

        <!-- Tags -->
        <div class="flex flex-wrap gap-1.5 pt-1">
          ${tagHtml}
        </div>
      </div>

      <!-- Actions Footer -->
      <div class="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
        <span class="text-[11px] text-slate-500 flex items-center space-x-1">
          <i data-lucide="clock" class="w-3 h-3"></i>
          <span>${job.datePosted || 'Recently'}</span>
        </span>

        <div class="flex items-center space-x-2">
          <!-- Cold Email Button -->
          <button onclick='openEmailModal(${JSON.stringify(job).replace(/'/g, "&apos;")})' class="px-2.5 py-1.5 rounded-lg bg-surface-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 flex items-center space-x-1 transition-all" title="Generate Tailored Cold Email">
            <i data-lucide="mail" class="w-3.5 h-3.5 text-brand-400"></i>
            <span class="hidden sm:inline">Pitch</span>
          </button>

          <!-- Track Button -->
          <button id="btn-track-${job.id}" onclick='toggleTrackJob(${JSON.stringify(job).replace(/'/g, "&apos;")})' class="px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center space-x-1 ${isTracked ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30' : 'bg-surface-800 hover:bg-slate-700 text-slate-300 border-slate-700'}">
            <i data-lucide="${isTracked ? 'check' : 'bookmark'}" class="w-3.5 h-3.5"></i>
            <span>${isTracked ? 'Saved' : 'Track'}</span>
          </button>

          <!-- Direct Apply Button -->
          <a href="${job.url}" target="_blank" rel="noopener noreferrer" onclick='autoTrackApplied(${JSON.stringify(job).replace(/'/g, "&apos;")})' class="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center space-x-1 shadow-md shadow-brand-500/20 transition-all">
            <span>Apply Now</span>
            <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
          </a>
        </div>
      </div>
    `;

    container.appendChild(card);
  });

  if (window.lucide) lucide.createIcons();
}

// Reset filters
function resetFiltersAndSearch() {
  document.getElementById('input-keywords').value = '';
  document.getElementById('select-level').value = 'all';
  document.getElementById('select-location').value = 'Worldwide';
  document.getElementById('select-source').value = 'all';
  setDomain('all');
}

// Track or Untrack a Job
async function toggleTrackJob(job) {
  const existing = state.applications.find(a => a.url === job.url || a.id === job.id);
  if (existing) {
    // Delete
    await fetch(`/api/applications/${existing.id}`, { method: 'DELETE' });
  } else {
    // Add
    await fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...job, status: 'Saved' })
    });
  }
  await loadApplications();
  renderJobCards(state.jobs);
}

// Automatically save as "Applied" when clicking "Apply Now"
async function autoTrackApplied(job) {
  const existing = state.applications.find(a => a.url === job.url || a.id === job.id);
  if (!existing) {
    await fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...job, status: 'Applied' })
    });
    await loadApplications();
  }
}

// Load Application Tracker list
async function loadApplications() {
  try {
    const res = await fetch('/api/applications');
    const data = await res.json();
    if (data.success) {
      state.applications = data.applications || [];
      updateTrackerUI();
    }
  } catch (err) {
    console.error('Failed to load applications:', err);
  }
}

// Update Tracker Counters and UI
function updateTrackerUI() {
  const apps = state.applications;
  const countBadge = document.getElementById('tracker-count-badge');
  if (countBadge) countBadge.textContent = apps.length;

  document.getElementById('t-count-all').textContent = apps.length;
  document.getElementById('t-count-saved').textContent = apps.filter(a => a.status === 'Saved').length;
  document.getElementById('t-count-applied').textContent = apps.filter(a => a.status === 'Applied').length;
  document.getElementById('t-count-interview').textContent = apps.filter(a => a.status === 'Interview').length;
  document.getElementById('t-count-offer').textContent = apps.filter(a => a.status === 'Offer').length;
  document.getElementById('t-count-rejected').textContent = apps.filter(a => a.status === 'Rejected').length;

  renderTrackerList();
}

// Filter tracker items
function filterTracker(status) {
  state.activeTrackerFilter = status;
  document.querySelectorAll('.tracker-filter-btn').forEach(btn => {
    if (btn.dataset.status === status) {
      btn.className = 'tracker-filter-btn active px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 text-white';
    } else {
      btn.className = 'tracker-filter-btn px-3.5 py-1.5 rounded-lg text-xs font-medium bg-surface-900 border border-slate-800 text-slate-300 hover:text-white';
    }
  });
  renderTrackerList();
}

// Render Tracked Applications
function renderTrackerList() {
  const listEl = document.getElementById('tracked-list');
  const emptyEl = document.getElementById('tracker-empty');
  listEl.innerHTML = '';

  let filtered = state.applications;
  if (state.activeTrackerFilter !== 'all') {
    filtered = filtered.filter(a => a.status === state.activeTrackerFilter);
  }

  if (filtered.length === 0) {
    emptyEl.classList.remove('hidden');
    return;
  }
  emptyEl.classList.add('hidden');

  filtered.forEach(app => {
    const row = document.createElement('div');
    row.className = 'bg-surface-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm';

    const statusColors = {
      'Saved': 'bg-slate-700 text-slate-300',
      'Applied': 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
      'Interview': 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
      'Offer': 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      'Rejected': 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
    };

    row.innerHTML = `
      <div class="flex-1 space-y-1">
        <div class="flex items-center space-x-2">
          <h3 class="font-bold text-white text-sm hover:text-brand-300 transition-colors">
            <a href="${app.url}" target="_blank" rel="noopener noreferrer">${app.title}</a>
          </h3>
          <span class="text-xs text-slate-500">•</span>
          <span class="text-xs text-slate-400 font-medium">${app.company}</span>
        </div>
        <div class="flex items-center space-x-3 text-xs text-slate-500">
          <span>📍 ${app.location}</span>
          <span>📅 Added: ${app.dateAdded ? app.dateAdded.split('T')[0] : 'N/A'}</span>
          ${app.dateApplied ? `<span class="text-blue-400">📨 Applied: ${app.dateApplied.split('T')[0]}</span>` : ''}
        </div>
        <div class="pt-1">
          <input type="text" value="${app.notes || ''}" placeholder="Add interview notes, recruiter contacts, follow-up..." onchange="updateAppNotes('${app.id}', this.value)" class="w-full text-xs bg-surface-800 border border-slate-800 rounded px-2.5 py-1 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-brand-500">
        </div>
      </div>

      <div class="flex items-center space-x-3 self-end md:self-center">
        <!-- Status dropdown -->
        <select onchange="updateAppStatus('${app.id}', this.value)" class="text-xs px-2.5 py-1.5 rounded-lg font-medium border bg-surface-800 border-slate-700 text-slate-200 focus:outline-none">
          <option value="Saved" ${app.status === 'Saved' ? 'selected' : ''}>🔖 Saved</option>
          <option value="Applied" ${app.status === 'Applied' ? 'selected' : ''}>📨 Applied</option>
          <option value="Interview" ${app.status === 'Interview' ? 'selected' : ''}>🎙️ Interview</option>
          <option value="Offer" ${app.status === 'Offer' ? 'selected' : ''}>🏆 Offer</option>
          <option value="Rejected" ${app.status === 'Rejected' ? 'selected' : ''}>❌ Rejected</option>
        </select>

        <!-- Direct Apply link -->
        <a href="${app.url}" target="_blank" rel="noopener noreferrer" class="p-1.5 rounded-lg bg-surface-800 hover:bg-slate-700 text-slate-300 border border-slate-700" title="Open Job Post">
          <i data-lucide="external-link" class="w-4 h-4"></i>
        </a>

        <!-- Delete button -->
        <button onclick="deleteTrackerApp('${app.id}')" class="p-1.5 rounded-lg bg-surface-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700" title="Remove">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </div>
    `;

    listEl.appendChild(row);
  });

  if (window.lucide) lucide.createIcons();
}

async function updateAppStatus(id, newStatus) {
  await fetch(`/api/applications/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: newStatus })
  });
  await loadApplications();
}

async function updateAppNotes(id, notes) {
  await fetch(`/api/applications/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes })
  });
}

async function deleteTrackerApp(id) {
  if (confirm('Remove this opportunity from your tracker?')) {
    await fetch(`/api/applications/${id}`, { method: 'DELETE' });
    await loadApplications();
    renderJobCards(state.jobs);
  }
}

// User Profile Management
async function loadUserProfile() {
  try {
    const res = await fetch('/api/profile');
    const data = await res.json();
    if (data.success && data.profile) {
      state.profile = data.profile;
      document.getElementById('prof-name').value = data.profile.fullName || '';
      document.getElementById('prof-title').value = data.profile.title || '';
      document.getElementById('prof-school').value = data.profile.school || '';
      document.getElementById('prof-email').value = data.profile.email || '';
      document.getElementById('prof-phone').value = data.profile.phone || '';
      document.getElementById('prof-lang').value = data.profile.preferredLanguage || 'English';
      document.getElementById('prof-portfolio').value = data.profile.portfolioUrl || '';
      document.getElementById('prof-linkedin').value = data.profile.linkedinUrl || '';
      document.getElementById('prof-skills').value = data.profile.skills || '';
    }
  } catch (err) {
    console.error('Error loading profile:', err);
  }
}

async function saveUserProfile(e) {
  e.preventDefault();
  const profileData = {
    fullName: document.getElementById('prof-name').value,
    title: document.getElementById('prof-title').value,
    school: document.getElementById('prof-school').value,
    email: document.getElementById('prof-email').value,
    phone: document.getElementById('prof-phone').value,
    preferredLanguage: document.getElementById('prof-lang').value,
    portfolioUrl: document.getElementById('prof-portfolio').value,
    linkedinUrl: document.getElementById('prof-linkedin').value,
    skills: document.getElementById('prof-skills').value
  };

  const res = await fetch('/api/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profileData)
  });

  const data = await res.json();
  if (data.success) {
    state.profile = data.profile;
    const msg = document.getElementById('profile-saved-msg');
    msg.classList.remove('hidden');
    setTimeout(() => msg.classList.add('hidden'), 3000);
  }
}

// Cold Email Modal
async function openEmailModal(job) {
  state.activeModalJob = job;
  document.getElementById('modal-subtitle').textContent = `${job.title} at ${job.company}`;

  const lang = state.profile?.preferredLanguage || 'English';
  await regenerateModalEmail(lang);

  document.getElementById('email-modal').classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function closeEmailModal() {
  document.getElementById('email-modal').classList.add('hidden');
}

async function regenerateModalEmail(lang) {
  const job = state.activeModalJob;
  if (!job) return;

  const btnEn = document.getElementById('btn-lang-en');
  const btnFr = document.getElementById('btn-lang-fr');

  if (lang === 'French') {
    btnFr.className = 'px-3 py-1 rounded text-xs font-semibold bg-brand-600 text-white';
    btnEn.className = 'px-3 py-1 rounded text-xs font-medium text-slate-400 hover:text-white';
  } else {
    btnEn.className = 'px-3 py-1 rounded text-xs font-semibold bg-brand-600 text-white';
    btnFr.className = 'px-3 py-1 rounded text-xs font-medium text-slate-400 hover:text-white';
  }

  const res = await fetch('/api/cover-letter/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jobTitle: job.title,
      company: job.company,
      location: job.location,
      language: lang
    })
  });

  const data = await res.json();
  if (data.success) {
    document.getElementById('modal-subject').value = data.subject;
    document.getElementById('modal-body').value = data.body;
  }
}

function copyToClipboard(elementId, btnElement) {
  const el = document.getElementById(elementId);
  el.select();
  navigator.clipboard.writeText(el.value);

  const originalText = btnElement.innerHTML;
  btnElement.innerHTML = '<span>✓ Copied!</span>';
  setTimeout(() => {
    btnElement.innerHTML = originalText;
  }, 2000);
}

function openMailtoClient() {
  const subject = encodeURIComponent(document.getElementById('modal-subject').value);
  const body = encodeURIComponent(document.getElementById('modal-body').value);
  window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
}

// Export current search results as CSV
function exportCurrentJobs() {
  if (!state.jobs || state.jobs.length === 0) {
    alert('No jobs to export! Perform a search first.');
    return;
  }

  const headers = ['Title', 'Company', 'Location', 'ExperienceLevel', 'Source', 'URL', 'DatePosted'];
  const rows = state.jobs.map(j => [
    `"${(j.title || '').replace(/"/g, '""')}"`,
    `"${(j.company || '').replace(/"/g, '""')}"`,
    `"${(j.location || '').replace(/"/g, '""')}"`,
    `"${(j.experienceLevel || '').replace(/"/g, '""')}"`,
    `"${(j.source || '').replace(/"/g, '""')}"`,
    `"${(j.url || '').replace(/"/g, '""')}"`,
    `"${(j.datePosted || '').replace(/"/g, '""')}"`
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `tech_jobs_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Morocco Directory Quick Search Actions
function searchDirectCompany(company) {
  switchTab('jobs');
  document.getElementById('input-keywords').value = company;
  document.getElementById('select-location').value = 'Morocco';
  document.getElementById('select-source').value = 'all';
  triggerSearch();
}

function searchByProvider(provider) {
  switchTab('jobs');
  document.getElementById('select-source').value = provider;
  document.getElementById('select-location').value = 'Morocco';
  triggerSearch();
}

// Custom Providers Management
async function openCustomProvidersModal() {
  const modal = document.getElementById('modal-custom-providers');
  if (modal) modal.classList.remove('hidden');
  await loadCustomProvidersList();
}

function closeCustomProvidersModal() {
  const modal = document.getElementById('modal-custom-providers');
  if (modal) modal.classList.add('hidden');
}

async function loadCustomProvidersList() {
  const container = document.getElementById('custom-providers-list');
  if (!container) return;

  try {
    const res = await fetch('/api/custom-providers');
    const data = await res.json();
    if (data.success && data.providers) {
      if (data.providers.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-500 py-4 text-center">No custom providers added yet. Paste an RSS or JSON URL below!</p>`;
        return;
      }

      container.innerHTML = data.providers.map(p => `
        <div class="flex items-center justify-between p-3 rounded-xl bg-surface-800 border border-slate-700/60">
          <div class="space-y-0.5">
            <div class="flex items-center space-x-2">
              <span class="text-xs font-bold text-white">${p.name}</span>
              <span class="px-1.5 py-0.2 rounded text-[10px] uppercase font-mono ${p.type === 'rss' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}">${p.type}</span>
              <span class="text-[10px] ${p.active ? 'text-emerald-400' : 'text-slate-500'}">● ${p.active ? 'Active' : 'Disabled'}</span>
            </div>
            <p class="text-[11px] text-slate-400 font-mono truncate max-w-sm sm:max-w-md">${p.url}</p>
          </div>
          <div class="flex items-center space-x-2">
            <button onclick="handleToggleCustomProvider('${p.id}')" class="px-2 py-1 text-xs rounded bg-surface-900 border border-slate-700 hover:text-white text-slate-300">
              ${p.active ? 'Disable' : 'Enable'}
            </button>
            <button onclick="handleDeleteCustomProvider('${p.id}')" class="p-1 text-xs rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>
      `).join('');

      if (window.lucide) lucide.createIcons();
    }
  } catch (err) {
    console.error('Failed to load custom providers:', err);
  }
}

async function handleAddCustomProvider(e) {
  if (e) e.preventDefault();
  const name = document.getElementById('input-provider-name').value.trim();
  const url = document.getElementById('input-provider-url').value.trim();
  const type = document.getElementById('select-provider-type').value;

  if (!name || !url) {
    alert('Please provide a provider name and URL.');
    return;
  }

  try {
    const res = await fetch('/api/custom-providers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, url, type })
    });
    const data = await res.json();
    if (data.success) {
      document.getElementById('input-provider-name').value = '';
      document.getElementById('input-provider-url').value = '';
      await loadCustomProvidersList();
      triggerSearch();
    } else {
      alert(data.error || 'Failed to add provider');
    }
  } catch (err) {
    alert('Error adding provider: ' + err.message);
  }
}

async function handleToggleCustomProvider(id) {
  try {
    await fetch(`/api/custom-providers/${id}/toggle`, { method: 'PATCH' });
    await loadCustomProvidersList();
    triggerSearch();
  } catch (err) {
    console.error('Toggle error:', err);
  }
}

async function handleDeleteCustomProvider(id) {
  if (!confirm('Are you sure you want to remove this provider?')) return;
  try {
    await fetch(`/api/custom-providers/${id}`, { method: 'DELETE' });
    await loadCustomProvidersList();
    triggerSearch();
  } catch (err) {
    console.error('Delete error:', err);
  }
}

function addPresetFeed(name, url, type = 'rss') {
  document.getElementById('input-provider-name').value = name;
  document.getElementById('input-provider-url').value = url;
  document.getElementById('select-provider-type').value = type;
  handleAddCustomProvider();
}
