// JobRadar v2.0 Frontend Controller
let state = {
  currentDomain: 'all',
  currentTab: 'jobs',
  jobs: [],
  applications: [],
  profile: null,
  activeModalJob: null,
  activeTrackerFilter: 'all',
  trackerMode: 'kanban', // 'kanban' | 'list'
  hiddenCompanies: new Set(),
  health: null,
  activePitchTab: 'letter', // 'letter' | 'linkedin' | 'cold' | 'tips'
  currentPitchData: null
};

document.addEventListener('DOMContentLoaded', async () => {
  if (window.lucide) lucide.createIcons();
  await loadUserProfile();
  await loadApplications();
  await loadProviderHealth();
  triggerSearch();
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

  ['jobs', 'morocco', 'tracker', 'profile', 'tips'].forEach(name => {
    const el = document.getElementById(`view-${name}`);
    if (el) el.classList.add('hidden');
  });

  const targetView = document.getElementById(`view-${tabName}`);
  if (targetView) targetView.classList.remove('hidden');

  if (tabName === 'tracker') {
    renderTracker();
  }

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

function handleSearch(e) {
  if (e) e.preventDefault();
  triggerSearch();
}

// Relative time helper
function formatRelativeTime(dateString) {
  if (!dateString) return 'Recently';
  if (!dateString.includes('T') && !dateString.includes('-')) return dateString;
  const diffMs = Date.now() - new Date(dateString).getTime();
  if (isNaN(diffMs)) return dateString;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo ago`;
}

// Trigger Search Request
async function triggerSearch(forceRefresh = false) {
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
      limit: '50',
      refresh: forceRefresh ? 'true' : 'false'
    });

    const res = await fetch(`/api/jobs?${params.toString()}`);
    const data = await res.json();

    skeletons.classList.add('hidden');
    badgeLoading.classList.add('hidden');

    if (data.success && data.jobs && data.jobs.length > 0) {
      state.jobs = data.jobs;
      updateStats(data.stats, data.jobs);
      renderJobCards(data.jobs);
    } else {
      state.jobs = [];
      emptyState.classList.remove('hidden');
      updateStats({ total: 0, byLevel: { internship: 0, entry: 0 } }, []);
    }
  } catch (err) {
    console.error('Search error:', err);
    skeletons.classList.add('hidden');
    badgeLoading.classList.add('hidden');
    emptyState.classList.remove('hidden');
  }
}

// Update Top Statistics
function updateStats(stats = {}, jobs = []) {
  document.getElementById('stat-total').textContent = stats.total || jobs.length || 0;
  document.getElementById('stat-intern').textContent = stats.byLevel?.internship || jobs.filter(j => (j.experienceLevel || '').toLowerCase().includes('intern')).length || 0;
  document.getElementById('stat-entry').textContent = stats.byLevel?.entry || jobs.filter(j => (j.experienceLevel || '').toLowerCase().includes('entry') || (j.experienceLevel || '').toLowerCase().includes('junior')).length || 0;
}

// Render Job Cards with Match Score, Skills & Actions
function renderJobCards(jobs) {
  const container = document.getElementById('job-cards-container');
  container.innerHTML = '';

  const trackedUrls = new Set(state.applications.map(a => a.url));
  const filteredJobs = jobs.filter(j => !state.hiddenCompanies.has((j.company || '').toLowerCase()));

  if (filteredJobs.length === 0) {
    document.getElementById('empty-state').classList.remove('hidden');
    return;
  }

  filteredJobs.forEach(job => {
    const isTracked = trackedUrls.has(job.url);

    // Experience badge
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

    // Match Score styling
    const score = job.matchScore || 70;
    let matchClass = 'match-high';
    if (score < 60) matchClass = 'bg-surface-800 text-slate-400 border border-slate-700';
    else if (score < 80) matchClass = 'match-med';

    // Source Badge class
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

    // Contract type
    const contract = job.contractType || (lowerLevel.includes('intern') ? 'Stage / PFE' : 'CDI');

    // Matched skills pills
    const matchedPills = (job.matchedSkills || []).slice(0, 3).map(s =>
      `<span class="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 font-medium">+ ${s}</span>`
    ).join(' ');

    const missingPills = (job.missingSkills || []).slice(0, 2).map(s =>
      `<span class="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-500 border border-slate-700/60 font-mono">- ${s}</span>`
    ).join(' ');

    const card = document.createElement('div');
    card.className = 'job-card bg-surface-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-md space-y-4 relative group';

    card.innerHTML = `
      <div class="space-y-3">
        <!-- Top row: Company, Location, Match Score & Source -->
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-lg bg-surface-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300 text-sm overflow-hidden flex-shrink-0">
              ${job.logo ? `<img src="${job.logo}" alt="${job.company}" class="w-full h-full object-contain" onerror="this.parentElement.textContent='${job.company[0]}'">` : job.company[0] || 'C'}
            </div>
            <div>
              <div class="flex items-center space-x-1.5">
                <h4 class="text-xs font-bold text-slate-300 line-clamp-1">${job.company}</h4>
                <button onclick="hideCompany('${job.company.replace(/'/g, "\\'")}')" class="text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity text-[10px]" title="Hide this company">
                  <i data-lucide="eye-off" class="w-3 h-3"></i>
                </button>
              </div>
              <div class="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                <span class="flex items-center space-x-1">
                  <i data-lucide="map-pin" class="w-3 h-3 text-slate-500"></i>
                  <span class="line-clamp-1">${job.location}</span>
                </span>
                ${job.remote ? `<span class="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 text-[10px] border border-emerald-500/20">Remote</span>` : ''}
              </div>
            </div>
          </div>
          <div class="flex flex-col items-end space-y-1">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${matchClass}">
              🔥 ${score}% Match
            </span>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-medium ${sourceClass}">
              ${job.source}
            </span>
          </div>
        </div>

        <!-- Job Title & Contract Type -->
        <div>
          <div class="flex items-center space-x-2 mb-1">
            <span class="px-2 py-0.2 rounded text-[10px] font-semibold bg-brand-500/10 text-brand-300 border border-brand-500/20">
              ${contract}
            </span>
            <span class="px-2 py-0.2 rounded-full text-[10px] font-semibold ${levelBadge}">
              ${levelIcon} ${job.experienceLevel}
            </span>
          </div>
          <h3 class="text-base font-bold text-white hover:text-brand-300 transition-colors line-clamp-2">
            <a href="${job.url}" target="_blank" rel="noopener noreferrer">${job.title}</a>
          </h3>
          ${job.salary ? `<p class="text-xs text-amber-400/90 font-medium mt-1">💰 ${job.salary}</p>` : ''}
          ${job.descriptionSnippet ? `<p class="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">${job.descriptionSnippet}</p>` : ''}
        </div>

        <!-- Matched Skills Pills -->
        <div class="flex flex-wrap items-center gap-1.5 pt-1">
          ${matchedPills}
          ${missingPills}
        </div>
      </div>

      <!-- Actions Footer -->
      <div class="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
        <span class="text-[11px] text-slate-500 flex items-center space-x-1">
          <i data-lucide="clock" class="w-3 h-3"></i>
          <span>${formatRelativeTime(job.datePosted)}</span>
        </span>

        <div class="flex items-center space-x-2">
          <!-- AI Pitch & Letter Button -->
          <button onclick='openAIPitchModal(${JSON.stringify(job).replace(/'/g, "&apos;")})' class="px-2.5 py-1.5 rounded-lg bg-surface-800 hover:bg-slate-700 text-brand-300 text-xs font-semibold border border-brand-500/30 flex items-center space-x-1 transition-all" title="Generate Tailored AI Cover Letter, LinkedIn note & CV tips">
            <i data-lucide="sparkles" class="w-3.5 h-3.5 text-brand-400"></i>
            <span>AI Pitch</span>
          </button>

          <!-- Track Button -->
          <button id="btn-track-${job.id}" onclick='toggleTrackJob(${JSON.stringify(job).replace(/'/g, "&apos;")})' class="px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center space-x-1 ${isTracked ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30' : 'bg-surface-800 hover:bg-slate-700 text-slate-300 border-slate-700'}">
            <i data-lucide="${isTracked ? 'check' : 'bookmark'}" class="w-3.5 h-3.5"></i>
            <span>${isTracked ? 'Saved' : 'Track'}</span>
          </button>

          <!-- Direct Apply Button -->
          <a href="${job.url}" target="_blank" rel="noopener noreferrer" onclick='autoTrackApplied(${JSON.stringify(job).replace(/'/g, "&apos;")})' class="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center space-x-1 shadow-md shadow-brand-500/20 transition-all">
            <span>Apply</span>
            <i data-lucide="external-link" class="w-3 h-3"></i>
          </a>
        </div>
      </div>
    `;

    container.appendChild(card);
  });

  if (window.lucide) lucide.createIcons();
}

function hideCompany(company) {
  state.hiddenCompanies.add(company.toLowerCase());
  renderJobCards(state.jobs);
}

// ==================== KANBAN APPLICATION TRACKER ====================
async function loadApplications() {
  try {
    const res = await fetch('/api/applications');
    const data = await res.json();
    if (data.success && data.applications) {
      state.applications = data.applications;
      updateTrackerCount();
      renderTracker();
    }
  } catch (err) {
    console.error('Failed to load applications:', err);
  }
}

function updateTrackerCount() {
  const badge = document.getElementById('tracker-count-badge');
  if (badge) badge.textContent = state.applications.length;

  const countAll = document.getElementById('t-count-all');
  if (countAll) countAll.textContent = state.applications.length;

  const counts = { Saved: 0, Applied: 0, Technical_Test: 0, Interview: 0, Offer: 0, Rejected: 0 };
  state.applications.forEach(a => {
    if (counts[a.status] !== undefined) counts[a.status]++;
  });

  ['Saved', 'Applied', 'Interview', 'Offer', 'Rejected'].forEach(s => {
    const el = document.getElementById(`t-count-${s.toLowerCase()}`);
    if (el) el.textContent = counts[s] || 0;
  });

  // Check 7-day follow-up reminder
  const now = Date.now();
  const needFollowUp = state.applications.filter(a => {
    if (a.status !== 'Applied' && a.status !== 'Technical_Test') return false;
    const dateApplied = a.appliedAt || a.dateApplied;
    if (!dateApplied) return false;
    const days = (now - new Date(dateApplied).getTime()) / (1000 * 60 * 60 * 24);
    return days >= 7;
  });

  const reminderBanner = document.getElementById('followup-reminder-banner');
  if (reminderBanner) {
    if (needFollowUp.length > 0) {
      reminderBanner.classList.remove('hidden');
      document.getElementById('followup-reminder-text').innerHTML =
        `⚠️ You have <strong>${needFollowUp.length} application(s)</strong> waiting over 7 days for a response (${needFollowUp.map(a => a.company).slice(0, 3).join(', ')}). Time to send a follow-up pitch!`;
    } else {
      reminderBanner.classList.add('hidden');
    }
  }
}

function toggleTrackerMode(mode) {
  state.trackerMode = mode;
  document.getElementById('btn-mode-kanban').className = mode === 'kanban' ? 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 text-white' : 'px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-800 text-slate-400 hover:text-white';
  document.getElementById('btn-mode-list').className = mode === 'list' ? 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 text-white' : 'px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-800 text-slate-400 hover:text-white';
  renderTracker();
}

function renderTracker() {
  const kanbanContainer = document.getElementById('tracker-kanban-board');
  const listContainer = document.getElementById('tracked-list');
  const emptyState = document.getElementById('tracker-empty');

  if (state.applications.length === 0) {
    if (kanbanContainer) kanbanContainer.classList.add('hidden');
    if (listContainer) listContainer.classList.add('hidden');
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

  if (state.trackerMode === 'kanban') {
    if (kanbanContainer) kanbanContainer.classList.remove('hidden');
    if (listContainer) listContainer.classList.add('hidden');
    renderKanbanBoard();
  } else {
    if (kanbanContainer) kanbanContainer.classList.add('hidden');
    if (listContainer) listContainer.classList.remove('hidden');
    renderListView();
  }

  if (window.lucide) lucide.createIcons();
}

const KANBAN_STAGES = [
  { key: 'Saved', label: '🔖 Saved', color: 'border-slate-700 bg-slate-900/40 text-slate-300' },
  { key: 'Applied', label: '📨 Applied', color: 'border-blue-500/30 bg-blue-950/20 text-blue-400' },
  { key: 'Technical_Test', label: '💻 Tech Test', color: 'border-purple-500/30 bg-purple-950/20 text-purple-400' },
  { key: 'Interview', label: '🎙️ Interview', color: 'border-amber-500/30 bg-amber-950/20 text-amber-400' },
  { key: 'Offer', label: '🏆 Offer', color: 'border-emerald-500/30 bg-emerald-950/20 text-emerald-400' },
  { key: 'Rejected', label: '❌ Rejected', color: 'border-rose-500/30 bg-rose-950/20 text-rose-400' }
];

function renderKanbanBoard() {
  const container = document.getElementById('tracker-kanban-board');
  if (!container) return;

  container.innerHTML = KANBAN_STAGES.map(stage => {
    const stageApps = state.applications.filter(a => a.status === stage.key);
    return `
      <div class="kanban-col flex flex-col bg-surface-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3 flex-shrink-0">
        <div class="flex items-center justify-between pb-2 border-b border-slate-800">
          <span class="text-xs font-bold ${stage.color} px-2.5 py-1 rounded-lg">${stage.label}</span>
          <span class="text-xs font-mono text-slate-500">${stageApps.length}</span>
        </div>
        <div class="space-y-3 overflow-y-auto max-h-[650px] pr-1">
          ${stageApps.length === 0 ? `<p class="text-[11px] text-slate-600 text-center py-6">No applications</p>` : ''}
          ${stageApps.map(app => renderKanbanCard(app, stage.key)).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function renderKanbanCard(app, currentStage) {
  const isAppliedStale = (currentStage === 'Applied' || currentStage === 'Technical_Test') && app.appliedAt &&
    ((Date.now() - new Date(app.appliedAt).getTime()) / (1000 * 60 * 60 * 24)) >= 7;

  return `
    <div class="kanban-card bg-surface-800 border ${isAppliedStale ? 'border-amber-500/60 followup-alert' : 'border-slate-700/70'} p-3.5 rounded-xl space-y-2.5 shadow-sm">
      <div class="flex items-start justify-between gap-1">
        <div>
          <h4 class="text-xs font-bold text-white line-clamp-1">${app.title}</h4>
          <p class="text-[11px] text-slate-400 font-medium">${app.company}</p>
        </div>
        <button onclick="deleteApplication('${app.id}')" class="text-slate-500 hover:text-rose-400 text-xs p-1" title="Delete">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
        </button>
      </div>

      ${isAppliedStale ? `<div class="p-1 rounded bg-amber-500/15 text-amber-400 text-[10px] font-semibold flex items-center space-x-1"><i data-lucide="alert-circle" class="w-3 h-3"></i><span>Applied > 7 days ago! Follow up</span></div>` : ''}

      <div class="flex items-center justify-between text-[10px] text-slate-500 pt-1">
        <span>📍 ${app.location || 'Remote'}</span>
        <span>${formatRelativeTime(app.appliedAt || app.dateAdded)}</span>
      </div>

      <!-- Quick Move Selector -->
      <div class="pt-2 border-t border-slate-700/60 flex items-center justify-between gap-1.5">
        <select onchange="updateApplicationStatus('${app.id}', this.value)" class="w-full bg-surface-900 border border-slate-700 text-[11px] text-slate-300 rounded px-2 py-1 focus:outline-none">
          ${KANBAN_STAGES.map(s => `<option value="${s.key}" ${s.key === currentStage ? 'selected' : ''}>Move to: ${s.label}</option>`).join('')}
        </select>
        ${app.url ? `<a href="${app.url}" target="_blank" class="p-1.5 rounded bg-surface-900 border border-slate-700 text-slate-400 hover:text-white" title="Open Job Link"><i data-lucide="external-link" class="w-3 h-3"></i></a>` : ''}
      </div>
    </div>
  `;
}

function renderListView() {
  const container = document.getElementById('tracked-list');
  if (!container) return;

  const filtered = state.activeTrackerFilter === 'all'
    ? state.applications
    : state.applications.filter(a => a.status === state.activeTrackerFilter);

  container.innerHTML = filtered.map(app => `
    <div class="bg-surface-900 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
      <div class="space-y-1">
        <div class="flex items-center space-x-2">
          <h3 class="font-bold text-white text-sm">${app.title}</h3>
          <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-brand-500/20 text-brand-300">${app.status}</span>
        </div>
        <p class="text-xs text-slate-400">${app.company} • 📍 ${app.location || 'Remote'} • ${formatRelativeTime(app.appliedAt || app.dateAdded)}</p>
      </div>
      <div class="flex items-center space-x-2">
        <select onchange="updateApplicationStatus('${app.id}', this.value)" class="bg-surface-800 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-300">
          ${KANBAN_STAGES.map(s => `<option value="${s.key}" ${s.key === app.status ? 'selected' : ''}>${s.label}</option>`).join('')}
        </select>
        <a href="${app.url}" target="_blank" class="px-3 py-1.5 rounded bg-brand-600 text-white text-xs font-semibold flex items-center space-x-1">
          <span>View Job</span>
          <i data-lucide="external-link" class="w-3 h-3"></i>
        </a>
        <button onclick="deleteApplication('${app.id}')" class="p-1.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
        </button>
      </div>
    </div>
  `).join('');
}

async function updateApplicationStatus(id, newStatus) {
  try {
    const res = await fetch(`/api/applications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) {
      await loadApplications();
    }
  } catch (err) {
    console.error('Update status error:', err);
  }
}

async function deleteApplication(id) {
  if (!confirm('Are you sure you want to delete this tracked application?')) return;
  try {
    const res = await fetch(`/api/applications/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await loadApplications();
    }
  } catch (err) {
    console.error('Delete app error:', err);
  }
}

async function toggleTrackJob(job) {
  const existing = state.applications.find(a => a.url === job.url);
  if (existing) {
    await deleteApplication(existing.id);
  } else {
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          title: job.title,
          company: job.company,
          location: job.location,
          url: job.url,
          source: job.source,
          status: 'Saved'
        })
      });
      if (res.ok) {
        await loadApplications();
        renderJobCards(state.jobs);
      }
    } catch (err) {
      console.error('Track error:', err);
    }
  }
}

async function autoTrackApplied(job) {
  const existing = state.applications.find(a => a.url === job.url);
  if (!existing) {
    try {
      await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          title: job.title,
          company: job.company,
          location: job.location,
          url: job.url,
          source: job.source,
          status: 'Applied'
        })
      });
      await loadApplications();
    } catch (e) {}
  }
}

// ==================== AI PITCH & MULTI-TAB MODAL ====================
async function openAIPitchModal(job) {
  state.activeModalJob = job;
  const modal = document.getElementById('modal-email');
  if (modal) modal.classList.remove('hidden');

  document.getElementById('modal-job-title').textContent = `${job.title} @ ${job.company}`;
  document.getElementById('modal-body').value = 'Generating tailored pitch with AI...';

  await generatePitchContent();
}

async function generatePitchContent() {
  if (!state.activeModalJob) return;

  const lang = document.getElementById('modal-pitch-lang')?.value || 'English';
  const customNotes = document.getElementById('modal-custom-notes')?.value || '';

  try {
    const res = await fetch('/api/ai/pitch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job: state.activeModalJob,
        language: lang,
        customNotes
      })
    });
    const data = await res.json();
    if (data.success) {
      state.currentPitchData = data;
      renderPitchTab(state.activePitchTab);
    }
  } catch (err) {
    document.getElementById('modal-body').value = 'Failed to generate pitch. Please check connection.';
  }
}

function setPitchTab(tab) {
  state.activePitchTab = tab;
  ['letter', 'linkedin', 'cold', 'tips'].forEach(t => {
    const btn = document.getElementById(`tab-pitch-${t}`);
    if (btn) {
      btn.className = t === tab
        ? 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 text-white'
        : 'px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-surface-800';
    }
  });
  renderPitchTab(tab);
}

function renderPitchTab(tab) {
  if (!state.currentPitchData) return;
  const bodyEl = document.getElementById('modal-body');
  const subjectEl = document.getElementById('modal-subject');

  if (tab === 'letter') {
    subjectEl.value = `Application: ${state.activeModalJob.title} — ${state.profile?.fullName || 'Candidate'}`;
    bodyEl.value = state.currentPitchData.coverLetter || '';
  } else if (tab === 'linkedin') {
    subjectEl.value = 'LinkedIn Recruiter Note (< 300 characters)';
    bodyEl.value = state.currentPitchData.linkedinNote || '';
  } else if (tab === 'cold') {
    subjectEl.value = `Direct Inquiry: ${state.activeModalJob.title}`;
    bodyEl.value = state.currentPitchData.coldEmail || '';
  } else if (tab === 'tips') {
    subjectEl.value = '3 Specific CV Alignment Tips for this Role';
    bodyEl.value = (state.currentPitchData.cvTips || []).map((tip, idx) => `[Tip ${idx + 1}] ${tip}`).join('\n\n');
  }
}

function closeEmailModal() {
  const modal = document.getElementById('modal-email');
  if (modal) modal.classList.add('hidden');
}

function copyPitchText() {
  const body = document.getElementById('modal-body');
  navigator.clipboard.writeText(body.value);
  const btn = document.getElementById('btn-copy-pitch');
  if (btn) {
    btn.innerHTML = `<i data-lucide="check" class="w-3.5 h-3.5 text-emerald-400"></i><span>Copied!</span>`;
    setTimeout(() => {
      btn.innerHTML = `<i data-lucide="copy" class="w-3.5 h-3.5"></i><span>Copy Pitch</span>`;
      if (window.lucide) lucide.createIcons();
    }, 2000);
  }
}

function openMailtoClient() {
  const subject = encodeURIComponent(document.getElementById('modal-subject').value);
  const body = encodeURIComponent(document.getElementById('modal-body').value);
  window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
}

// ==================== CV PDF UPLOAD & PARSER ====================
async function handleCvUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const statusEl = document.getElementById('cv-upload-status');
  if (statusEl) statusEl.innerHTML = `<span class="text-indigo-400 animate-pulse">Extracting text & skills...</span>`;

  const formData = new FormData();
  formData.append('cv', file);

  try {
    const res = await fetch('/api/profile/upload-cv', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (data.success) {
      if (statusEl) statusEl.innerHTML = `<span class="text-emerald-400 font-semibold">✓ Parsed ${data.detectedSkills.length} skills successfully!</span>`;
      await loadUserProfile();
      triggerSearch();
    } else {
      if (statusEl) statusEl.innerHTML = `<span class="text-rose-400">${data.error || 'Upload failed'}</span>`;
    }
  } catch (err) {
    if (statusEl) statusEl.innerHTML = `<span class="text-rose-400">Upload error: ${err.message}</span>`;
  }
}

async function loadUserProfile() {
  try {
    const res = await fetch('/api/profile');
    const data = await res.json();
    if (data.success && data.profile) {
      state.profile = data.profile;
      document.getElementById('prof-name').value = data.profile.fullName || '';
      document.getElementById('prof-title').value = data.profile.title || '';
      document.getElementById('prof-school').value = data.profile.school || data.profile.educationSummary || '';
      document.getElementById('prof-email').value = data.profile.email || '';
      document.getElementById('prof-phone').value = data.profile.phone || '';
      document.getElementById('prof-portfolio').value = data.profile.portfolioUrl || '';
      document.getElementById('prof-linkedin').value = data.profile.linkedinUrl || '';
      document.getElementById('prof-skills').value = data.profile.skills || '';
    }
  } catch (e) {}
}

async function saveUserProfile(e) {
  if (e) e.preventDefault();
  const payload = {
    fullName: document.getElementById('prof-name').value,
    title: document.getElementById('prof-title').value,
    educationSummary: document.getElementById('prof-school').value,
    email: document.getElementById('prof-email').value,
    phone: document.getElementById('prof-phone').value,
    portfolioUrl: document.getElementById('prof-portfolio').value,
    linkedinUrl: document.getElementById('prof-linkedin').value,
    skills: document.getElementById('prof-skills').value
  };

  try {
    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const msg = document.getElementById('profile-saved-msg');
      if (msg) {
        msg.classList.remove('hidden');
        setTimeout(() => msg.classList.add('hidden'), 2500);
      }
      await loadUserProfile();
      triggerSearch();
    }
  } catch (err) {
    console.error('Save profile error:', err);
  }
}

// ==================== PROVIDER HEALTH & OBSERVABILITY ====================
async function loadProviderHealth() {
  try {
    const res = await fetch('/api/providers/health');
    const data = await res.json();
    if (data.success && data.health) {
      state.health = data.health;
      const pill = document.getElementById('health-summary-pill');
      if (pill) {
        const live = data.health.healthyCount || 19;
        const total = data.health.totalProvidersMonitored || 19;
        pill.textContent = `${live}/${total} Live`;
      }
    }
  } catch (e) {}
}

function openHealthModal() {
  const modal = document.getElementById('modal-health');
  if (modal) modal.classList.remove('hidden');
  renderHealthTable();
}

function closeHealthModal() {
  const modal = document.getElementById('modal-health');
  if (modal) modal.classList.add('hidden');
}

function renderHealthTable() {
  const container = document.getElementById('health-table-body');
  if (!container || !state.health) return;

  container.innerHTML = (state.health.providers || []).map(p => `
    <tr class="border-b border-slate-800 text-xs">
      <td class="py-2.5 font-semibold text-white">${p.name}</td>
      <td class="py-2.5">
        <span class="px-2 py-0.5 rounded text-[10px] font-bold ${p.status === 'ok' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}">
          ● ${p.status.toUpperCase()}
        </span>
      </td>
      <td class="py-2.5 text-slate-300 font-mono">${p.jobsCount || 0}</td>
      <td class="py-2.5 text-slate-400 font-mono">${p.latencyMs ? `${p.latencyMs}ms` : '< 1s'}</td>
      <td class="py-2.5 text-slate-500 text-[11px]">${p.errorMessage ? p.errorMessage.slice(0, 40) : 'None'}</td>
    </tr>
  `).join('');
}

// ==================== SETTINGS MODAL ====================
function openSettingsModal() {
  const modal = document.getElementById('modal-settings');
  if (modal) modal.classList.remove('hidden');
}

function closeSettingsModal() {
  const modal = document.getElementById('modal-settings');
  if (modal) modal.classList.add('hidden');
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
