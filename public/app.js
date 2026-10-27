/**
 * JobRadar v2.0 — Craft Frontend Controller (Linear / Raycast / Read.cv Inspired)
 * High-Density Scannability, Keyboard Navigation (j/k/⌘K), 3-Zone Shell, Inspector Drawer
 */

// Application State
const state = {
  currentView: 'jobs',           // 'jobs' | 'morocco' | 'tracker' | 'profile' | 'sources'
  feedViewMode: 'list',          // 'list' | 'grid'
  jobs: [],
  filteredJobs: [],
  applications: [],
  profile: null,
  health: null,
  customProviders: [],
  selectedIndex: -1,             // Keyboard focused job index
  activeDrawerJob: null,         // Currently inspected job in right slide-over
  activePitchMode: 'letter',     // 'letter' | 'linkedin' | 'cold' | 'tips'
  pitchDataCache: {},            // Cache generated pitches by jobId
  theme: localStorage.getItem('jobradar_theme') || 'dark'
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', async () => {
  // Apply theme
  document.documentElement.setAttribute('data-theme', state.theme);
  updateThemeButton();

  // Load saved view mode
  const savedViewMode = localStorage.getItem('jobradar_view_mode') || 'list';
  setFeedViewMode(savedViewMode, false);

  // Setup drag & drop for CV
  setupCvDropzone();

  // Register global keyboard listeners
  setupKeyboardNavigation();

  // Initialize Lucide icons
  if (window.lucide) lucide.createIcons();

  // Concurrent initial fetches
  await Promise.allSettled([
    loadUserProfile(),
    loadApplications(),
    loadProviderHealth(),
    loadCustomProviders()
  ]);

  // Initial jobs search
  await triggerSearch();
});

// ==================== THEME CONTROLLER ====================
function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', state.theme);
  localStorage.setItem('jobradar_theme', state.theme);
  updateThemeButton();
  if (window.lucide) lucide.createIcons();
}

function updateThemeButton() {
  const label = document.getElementById('theme-toggle-label');
  if (label) {
    label.textContent = state.theme === 'dark' ? 'Light Mode' : 'Dark Mode';
  }
}

// ==================== NAVIGATION VIEWS ====================
function switchView(viewName) {
  state.currentView = viewName;

  // Update left rail items
  ['jobs', 'morocco', 'tracker', 'profile', 'sources'].forEach(v => {
    const btn = document.getElementById(`nav-btn-${v}`);
    const section = document.getElementById(`view-${v}`);
    if (btn) btn.classList.toggle('active', v === viewName);
    if (section) section.style.display = v === viewName ? (v === 'jobs' ? 'block' : 'flex') : 'none';
  });

  if (viewName === 'tracker') {
    renderKanbanBoard();
  } else if (viewName === 'sources') {
    renderHealthTable();
    renderCustomProvidersList();
  }

  if (window.lucide) lucide.createIcons();
}

// ==================== KEYBOARD FIRST NAVIGATION ====================
function setupKeyboardNavigation() {
  window.addEventListener('keydown', (e) => {
    // If inside text input / textarea, only check Escape or Cmd+K
    const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);

    // ⌘K or Ctrl+K: Focus Search Input
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      const searchInput = document.getElementById('cmd-search-input');
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
      return;
    }

    // Escape: Close drawer or modals
    if (e.key === 'Escape') {
      closeDrawer();
      closeShortcutsModal();
      closeAddFeedModal();
      return;
    }

    if (isInput) return;

    // ? : Open shortcuts cheat sheet
    if (e.key === '?' || (e.shiftKey && e.key === '/')) {
      e.preventDefault();
      openShortcutsModal();
      return;
    }

    // j or ArrowDown: Next job in feed
    if (e.key === 'j' || e.key === 'ArrowDown') {
      e.preventDefault();
      moveFocus(1);
    }

    // k or ArrowUp: Previous job in feed
    if (e.key === 'k' || e.key === 'ArrowUp') {
      e.preventDefault();
      moveFocus(-1);
    }

    // Enter: Inspect currently focused job
    if (e.key === 'Enter') {
      if (state.selectedIndex >= 0 && state.jobs[state.selectedIndex]) {
        e.preventDefault();
        openDrawer(state.jobs[state.selectedIndex]);
      }
    }

    // s: Bookmark / Save currently focused job
    if (e.key === 's') {
      if (state.selectedIndex >= 0 && state.jobs[state.selectedIndex]) {
        e.preventDefault();
        toggleTrackJob(state.jobs[state.selectedIndex]);
      }
    }

    // c: Open AI Pitch directly in drawer for focused job
    if (e.key === 'c') {
      if (state.selectedIndex >= 0 && state.jobs[state.selectedIndex]) {
        e.preventDefault();
        openDrawer(state.jobs[state.selectedIndex]);
        switchDrawerTab('pitch');
      }
    }
  });
}

function moveFocus(delta) {
  if (state.jobs.length === 0) return;
  state.selectedIndex = Math.max(0, Math.min(state.jobs.length - 1, state.selectedIndex + delta));

  document.querySelectorAll('.job-card').forEach((card, idx) => {
    card.classList.toggle('keyboard-focused', idx === state.selectedIndex);
  });

  const focusedCard = document.querySelectorAll('.job-card')[state.selectedIndex];
  if (focusedCard) {
    focusedCard.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

function handleSearchKey(e) {
  if (e.key === 'Enter') {
    triggerSearch();
  }
}

// ==================== SEARCH & FEED ENGINE ====================
async function triggerSearch(forceRefresh = false) {
  const keywords = document.getElementById('cmd-search-input').value.trim();
  const location = document.getElementById('filter-location').value;
  const experienceLevel = document.getElementById('filter-level').value;
  const source = document.getElementById('filter-source').value;

  const container = document.getElementById('job-feed-container');
  const skeletons = document.getElementById('loading-skeletons');
  const emptyState = document.getElementById('empty-state');
  const syncBtn = document.getElementById('btn-sync');

  if (skeletons) skeletons.style.display = 'flex';
  if (emptyState) emptyState.style.display = 'none';
  if (container) container.innerHTML = '';
  if (syncBtn) syncBtn.classList.add('spinning');

  try {
    const params = new URLSearchParams({
      keywords,
      location,
      experienceLevel,
      source,
      limit: '60'
    });
    if (forceRefresh) params.append('refresh', 'true');

    const res = await fetch(`/api/jobs?${params.toString()}`);
    const data = await res.json();

    if (data.success && data.jobs) {
      state.jobs = data.jobs;
      state.selectedIndex = -1;
      renderJobFeed(state.jobs);
      updateFeedStats(state.jobs);
    }
  } catch (err) {
    console.error('Search request failed:', err);
    showToast('Failed to fetch opportunities', 'alert-circle');
  } finally {
    if (skeletons) skeletons.style.display = 'none';
    if (syncBtn) syncBtn.classList.remove('spinning');
  }
}

function setFeedViewMode(mode, save = true) {
  state.feedViewMode = mode;
  if (save) localStorage.setItem('jobradar_view_mode', mode);

  const container = document.getElementById('job-feed-container');
  if (container) {
    container.classList.toggle('grid-view', mode === 'grid');
  }

  const btnList = document.getElementById('btn-view-list');
  const btnGrid = document.getElementById('btn-view-grid');
  if (btnList) btnList.classList.toggle('active', mode === 'list');
  if (btnGrid) btnGrid.classList.toggle('active', mode === 'grid');
}

function updateFeedStats(jobs) {
  const countPill = document.getElementById('rail-feed-count');
  if (countPill) countPill.textContent = jobs.length;

  const statTotal = document.getElementById('stat-total');
  const statIntern = document.getElementById('stat-intern');
  const statEntry = document.getElementById('stat-entry');

  if (statTotal) statTotal.textContent = jobs.length;

  let internCount = 0;
  let entryCount = 0;

  jobs.forEach(j => {
    const lvl = (j.experienceLevel || '').toLowerCase();
    if (lvl.includes('intern') || lvl.includes('stage') || lvl.includes('pfe')) internCount++;
    else if (lvl.includes('entry') || lvl.includes('junior')) entryCount++;
  });

  if (statIntern) statIntern.textContent = internCount;
  if (statEntry) statEntry.textContent = entryCount;
}

// Company Monogram & Favicon Helper
function getCompanyAvatarHtml(company, url) {
  const cleanComp = (company || 'Company').trim();
  const monogram = cleanComp.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'CO';

  let domain = '';
  try {
    if (url && url.startsWith('http')) {
      domain = new URL(url).hostname;
    }
  } catch (e) {}

  if (domain && !domain.includes('linkedin') && !domain.includes('rekrute')) {
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    return `
      <div class="company-avatar">
        <img src="${faviconUrl}" alt="${cleanComp}" onerror="this.parentElement.innerHTML='${monogram}'">
      </div>
    `;
  }

  return `<div class="company-avatar">${monogram}</div>`;
}

function formatRelativeTime(dateString) {
  if (!dateString) return 'Recent';
  const diffMs = Date.now() - new Date(dateString).getTime();
  if (isNaN(diffMs)) return 'Recent';
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return '1d ago';
  if (diffDays < 30) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

// Render Job Cards Feed
function renderJobFeed(jobs) {
  const container = document.getElementById('job-feed-container');
  const emptyState = document.getElementById('empty-state');
  if (!container) return;

  if (jobs.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  container.innerHTML = jobs.map((job, idx) => {
    const isSaved = state.applications.some(a => a.url === job.url);
    const score = job.matchScore !== undefined ? job.matchScore : 50;
    const scoreClass = score >= 80 ? 'high' : (score >= 55 ? 'med' : 'low');

    // Matched skills highlight
    const matchedSet = new Set((job.matchedSkills || []).map(s => s.toLowerCase()));
    const tags = Array.isArray(job.tags) ? job.tags.slice(0, 5) : [];

    const isCurrentInspect = state.activeDrawerJob && state.activeDrawerJob.id === job.id;

    return `
      <div class="job-card ${isCurrentInspect ? 'is-active-inspect' : ''}" onclick="openDrawerByIndex(${idx})">
        <!-- 1. Left Avatar -->
        ${getCompanyAvatarHtml(job.company, job.url)}

        <!-- 2. Middle Role Metadata -->
        <div class="card-main-meta">
          <div class="card-title-row">
            <h4 class="card-title" title="${job.title}">${job.title}</h4>
            ${job.isNew ? '<span class="badge-new-dot" title="New unseen opportunity"></span>' : ''}
          </div>

          <div class="card-subtitle-row">
            <span>${job.company}</span>
            <span class="bullet-sep">•</span>
            <span>${job.location || 'Remote'}</span>
            ${job.remote ? '<span class="bullet-sep">•</span><span class="contract-pill">Remote</span>' : ''}
            <span class="bullet-sep">•</span>
            <span class="contract-pill">${job.experienceLevel || 'Stage / PFE'}</span>
          </div>

          <div class="card-skills-row">
            ${tags.map(t => `<span class="tech-pill ${matchedSet.has(t.toLowerCase()) ? 'matched' : ''}">${t}</span>`).join('')}
          </div>
        </div>

        <!-- 3. Right Score & Meta -->
        <div class="card-right-meta">
          <span class="match-score-pill ${scoreClass}">${score}% MATCH</span>
          <div class="card-time-sources">
            <span>${formatRelativeTime(job.publishedAt || job.fetchedAt)}</span>
            <span class="source-badge">${job.source}</span>
          </div>
          <div class="card-hover-actions" onclick="event.stopPropagation()">
            <button onclick="toggleTrackJobByIndex(${idx})" class="btn-action-icon" title="${isSaved ? 'Tracked in Pipeline' : 'Save to Pipeline'}">
              <i data-lucide="${isSaved ? 'check' : 'bookmark'}" style="width: 13px; height: 13px; color: ${isSaved ? 'var(--match-high-fg)' : 'currentColor'};"></i>
            </button>
            <button onclick="quickOpenPitch(${idx})" class="btn-action-icon" title="Generate AI Pitch">
              <i data-lucide="sparkles" style="width: 13px; height: 13px;"></i>
            </button>
            <a href="${job.url}" target="_blank" rel="noopener noreferrer" class="btn-action-icon" title="Open Original Posting">
              <i data-lucide="external-link" style="width: 13px; height: 13px;"></i>
            </a>
          </div>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

// Preset Quick Filters (Left Rail)
function applyPresetFilter(presetKey) {
  switchView('jobs');
  const kwInput = document.getElementById('cmd-search-input');
  const locSelect = document.getElementById('filter-location');
  const lvlSelect = document.getElementById('filter-level');

  if (presetKey === 'pfe') {
    kwInput.value = 'PFE';
    locSelect.value = 'Morocco';
    lvlSelect.value = 'internship';
  } else if (presetKey === 'fullstack') {
    kwInput.value = 'Full Stack React Node';
    locSelect.value = 'Worldwide';
    lvlSelect.value = 'entry';
  } else if (presetKey === 'cyber') {
    kwInput.value = 'Cybersecurity SOC';
    locSelect.value = 'Worldwide';
    lvlSelect.value = 'all';
  } else if (presetKey === 'ai') {
    kwInput.value = 'Machine Learning AI Python';
    locSelect.value = 'Worldwide';
    lvlSelect.value = 'all';
  } else if (presetKey === 'relocate') {
    kwInput.value = '';
    locSelect.value = 'Europe';
    lvlSelect.value = 'all';
  }

  triggerSearch();
}

function resetFiltersAndSearch() {
  document.getElementById('cmd-search-input').value = '';
  document.getElementById('filter-location').value = 'Worldwide';
  document.getElementById('filter-level').value = 'all';
  document.getElementById('filter-source').value = 'all';
  triggerSearch();
}

// ==================== RIGHT SLIDE-OVER INSPECTOR DRAWER ====================
function openDrawerByIndex(idx) {
  state.selectedIndex = idx;
  const job = state.jobs[idx];
  if (job) openDrawer(job);
}

function openDrawer(job) {
  state.activeDrawerJob = job;

  const drawer = document.getElementById('inspector-drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  if (drawer) drawer.classList.add('open');
  if (backdrop) backdrop.classList.add('open');

  // Highlight selected card
  document.querySelectorAll('.job-card').forEach((card, idx) => {
    card.classList.toggle('is-active-inspect', state.jobs[idx] && state.jobs[idx].id === job.id);
  });

  // Populate Header
  document.getElementById('drawer-job-title').textContent = job.title;
  document.getElementById('drawer-job-company-loc').textContent = `${job.company} • ${job.location || 'Remote'}`;
  document.getElementById('drawer-company-avatar').innerHTML = getCompanyAvatarHtml(job.company, job.url);

  // Apply button
  const applyLink = document.getElementById('drawer-apply-link');
  applyLink.href = job.url;
  applyLink.innerHTML = `<span>Apply on ${job.source}</span><i data-lucide="external-link" style="width: 13px; height: 13px;"></i>`;

  // Status dropdown
  const statusSelect = document.getElementById('drawer-status-select');
  const tracked = state.applications.find(a => a.url === job.url);
  statusSelect.value = tracked ? tracked.status : 'none';

  // Overview Tab details
  const score = job.matchScore !== undefined ? job.matchScore : 50;
  const gaugeEl = document.getElementById('drawer-match-gauge');
  gaugeEl.textContent = `${score}% Match Fit`;
  gaugeEl.style.color = score >= 80 ? 'var(--match-high-fg)' : (score >= 55 ? 'var(--match-med-fg)' : 'var(--text-muted)');

  const matchedBox = document.getElementById('drawer-matched-skills');
  const missingBox = document.getElementById('drawer-missing-skills');

  matchedBox.innerHTML = (job.matchedSkills && job.matchedSkills.length > 0)
    ? job.matchedSkills.map(s => `<span class="tech-pill matched">${s}</span>`).join('')
    : '<span style="font-size: 11px; color: var(--text-muted);">None detected from profile</span>';

  missingBox.innerHTML = (job.missingSkills && job.missingSkills.length > 0)
    ? job.missingSkills.map(s => `<span class="tech-pill">${s}</span>`).join('')
    : '<span style="font-size: 11px; color: var(--text-muted);">Profile covers all extracted core tags</span>';

  // Job description
  const descEl = document.getElementById('drawer-job-desc');
  descEl.textContent = job.description || 'Full description available directly on source portal. Click "Apply on Source" to view the complete posting.';

  // Default to overview tab
  switchDrawerTab('overview');

  if (window.lucide) lucide.createIcons();
}

function closeDrawer() {
  const drawer = document.getElementById('inspector-drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  if (drawer) drawer.classList.remove('open');
  if (backdrop) backdrop.classList.remove('open');
  state.activeDrawerJob = null;
  document.querySelectorAll('.job-card').forEach(card => card.classList.remove('is-active-inspect'));
}

function switchDrawerTab(tab) {
  const tabOverview = document.getElementById('drawer-tab-overview');
  const tabPitch = document.getElementById('drawer-tab-pitch');
  const contentOverview = document.getElementById('drawer-content-overview');
  const contentPitch = document.getElementById('drawer-content-pitch');

  tabOverview.classList.toggle('active', tab === 'overview');
  tabPitch.classList.toggle('active', tab === 'pitch');

  contentOverview.style.display = tab === 'overview' ? 'flex' : 'none';
  contentPitch.style.display = tab === 'pitch' ? 'flex' : 'none';

  if (tab === 'pitch') {
    generatePitchForDrawer();
  }
}

function quickOpenPitch(idx) {
  openDrawerByIndex(idx);
  switchDrawerTab('pitch');
}

// ==================== AI CO-PILOT STUDIO IN DRAWER ====================
function setPitchMode(mode) {
  state.activePitchMode = mode;
  ['letter', 'linkedin', 'cold', 'tips'].forEach(m => {
    const btn = document.getElementById(`ai-tab-${m}`);
    if (btn) btn.classList.toggle('active', m === mode);
  });
  renderCurrentPitchInDrawer();
}

async function generatePitchForDrawer() {
  if (!state.activeDrawerJob) return;

  const job = state.activeDrawerJob;
  const lang = document.getElementById('ai-lang-select').value;
  const textEl = document.getElementById('drawer-pitch-text');
  textEl.value = 'Generating tailored pitch with AI...';

  try {
    const res = await fetch('/api/ai/pitch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job,
        language: lang
      })
    });
    const data = await res.json();
    if (data.success) {
      state.pitchDataCache[job.id] = data;
      renderCurrentPitchInDrawer();
    } else {
      textEl.value = 'Failed to generate pitch. Please check connection.';
    }
  } catch (err) {
    textEl.value = 'Error generating pitch: ' + err.message;
  }
}

function renderCurrentPitchInDrawer() {
  if (!state.activeDrawerJob) return;
  const data = state.pitchDataCache[state.activeDrawerJob.id];
  if (!data) return;

  const textEl = document.getElementById('drawer-pitch-text');
  if (state.activePitchMode === 'letter') {
    textEl.value = data.coverLetter || '';
  } else if (state.activePitchMode === 'linkedin') {
    textEl.value = data.linkedinNote || '';
  } else if (state.activePitchMode === 'cold') {
    textEl.value = data.coldEmail || '';
  } else if (state.activePitchMode === 'tips') {
    textEl.value = (data.cvTips || []).map((tip, idx) => `[Tip ${idx + 1}] ${tip}`).join('\n\n');
  }
}

function copyDrawerPitch() {
  const textEl = document.getElementById('drawer-pitch-text');
  navigator.clipboard.writeText(textEl.value);
  showToast('Copied to clipboard', 'check');
}

function openDrawerMailto() {
  if (!state.activeDrawerJob) return;
  const subject = encodeURIComponent(`Application: ${state.activeDrawerJob.title} — ${state.profile?.fullName || ''}`);
  const body = encodeURIComponent(document.getElementById('drawer-pitch-text').value);
  window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
}

// ==================== KANBAN APPLICATION PIPELINE ====================
async function loadApplications() {
  try {
    const res = await fetch('/api/applications');
    const data = await res.json();
    if (data.success && data.applications) {
      state.applications = data.applications;
      updateTrackerCount();
      renderKanbanBoard();
    }
  } catch (e) {
    console.error('Failed to load applications:', e);
  }
}

function updateTrackerCount() {
  const badge = document.getElementById('rail-tracker-count');
  if (badge) badge.textContent = state.applications.length;

  // Check 7-day follow-up reminder
  const now = Date.now();
  const needFollowUp = state.applications.filter(a => {
    if (a.status !== 'Applied' && a.status !== 'Technical_Test') return false;
    const dateApplied = a.appliedAt || a.dateApplied;
    if (!dateApplied) return false;
    const days = (now - new Date(dateApplied).getTime()) / (1000 * 60 * 60 * 24);
    return days >= 7;
  });

  const banner = document.getElementById('followup-reminder-banner');
  const text = document.getElementById('followup-reminder-text');
  if (banner && text) {
    if (needFollowUp.length > 0) {
      banner.style.display = 'flex';
      text.innerHTML = `You have <strong>${needFollowUp.length} application(s)</strong> waiting over 7 days for a response (${needFollowUp.map(a => a.company).slice(0, 3).join(', ')}). Time to send a follow-up pitch!`;
    } else {
      banner.style.display = 'none';
    }
  }
}

const KANBAN_STAGES = [
  { key: 'Saved', label: 'Saved' },
  { key: 'Applied', label: 'Applied' },
  { key: 'Technical_Test', label: 'Tech Test' },
  { key: 'Interview', label: 'Interview' },
  { key: 'Offer', label: 'Offer' },
  { key: 'Rejected', label: 'Rejected' }
];

function renderKanbanBoard() {
  const board = document.getElementById('kanban-board');
  if (!board) return;

  board.innerHTML = KANBAN_STAGES.map(stage => {
    const stageApps = state.applications.filter(a => a.status === stage.key);
    return `
      <div class="kanban-column">
        <div class="kanban-col-header">
          <span class="kanban-col-label">${stage.label}</span>
          <span class="kanban-col-count">${stageApps.length}</span>
        </div>
        <div class="kanban-cards-stack">
          ${stageApps.length === 0 ? '<p style="font-size: 11px; color: var(--text-muted); text-align: center; padding: 24px 0;">No applications</p>' : ''}
          ${stageApps.map(app => renderKanbanCard(app, stage.key)).join('')}
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

function renderKanbanCard(app, currentStage) {
  const isStale = (currentStage === 'Applied' || currentStage === 'Technical_Test') && app.appliedAt &&
    ((Date.now() - new Date(app.appliedAt).getTime()) / (1000 * 60 * 60 * 24)) >= 7;

  return `
    <div class="kanban-job-card ${isStale ? 'followup-stale' : ''}">
      <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 6px;">
        <div>
          <h5 class="kanban-card-title">${app.title}</h5>
          <span class="kanban-card-company">${app.company} • ${app.location || 'Remote'}</span>
        </div>
        <button onclick="deleteApplication('${app.id}')" class="btn-action-icon" style="width: 20px; height: 20px;" title="Delete">
          <i data-lucide="trash-2" style="width: 12px; height: 12px;"></i>
        </button>
      </div>

      <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 4px; padding-top: 6px; border-top: 1px solid var(--border-subtle);">
        <select onchange="updateApplicationStatus('${app.id}', this.value)" class="filter-select" style="height: 24px; font-size: 11px; padding: 0 18px 0 6px;">
          ${KANBAN_STAGES.map(s => `<option value="${s.key}" ${s.key === currentStage ? 'selected' : ''}>${s.label}</option>`).join('')}
        </select>
        <span style="font-family: var(--font-mono); font-size: 10px; color: var(--text-muted);">${formatRelativeTime(app.appliedAt || app.dateAdded)}</span>
      </div>
    </div>
  `;
}

async function handleDrawerStatusChange(newStatus) {
  if (!state.activeDrawerJob) return;
  const job = state.activeDrawerJob;

  if (newStatus === 'none') {
    const existing = state.applications.find(a => a.url === job.url);
    if (existing) await deleteApplication(existing.id);
  } else {
    await saveApplicationRecord({
      jobId: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      url: job.url,
      source: job.source,
      status: newStatus
    });
  }
}

async function toggleTrackJobByIndex(idx) {
  const job = state.jobs[idx];
  if (job) toggleTrackJob(job);
}

async function toggleTrackJob(job) {
  const existing = state.applications.find(a => a.url === job.url);
  if (existing) {
    await deleteApplication(existing.id);
    showToast(`Removed from pipeline`, 'bookmark-x');
  } else {
    await saveApplicationRecord({
      jobId: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      url: job.url,
      source: job.source,
      status: 'Saved'
    });
    showToast(`Saved to pipeline`, 'bookmark-check');
  }
}

async function saveApplicationRecord(payload) {
  try {
    const res = await fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      await loadApplications();
      renderJobFeed(state.jobs);
    }
  } catch (e) {
    console.error('Failed to save application:', e);
  }
}

async function updateApplicationStatus(id, status) {
  try {
    await fetch(`/api/applications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    await loadApplications();
    showToast(`Moved to ${status}`, 'check');
  } catch (e) {
    console.error(e);
  }
}

async function deleteApplication(id) {
  try {
    await fetch(`/api/applications/${id}`, { method: 'DELETE' });
    await loadApplications();
    renderJobFeed(state.jobs);
  } catch (e) {
    console.error(e);
  }
}

// ==================== CV PDF UPLOAD & PARSER ====================
function setupCvDropzone() {
  const dropzone = document.getElementById('cv-dropzone');
  const fileInput = document.getElementById('cv-file-input');
  if (!dropzone || !fileInput) return;

  dropzone.addEventListener('click', () => fileInput.click());

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--accent-primary)';
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.style.borderColor = 'var(--border-strong)';
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--border-strong)';
    if (e.dataTransfer.files.length) {
      fileInput.files = e.dataTransfer.files;
      handleCvUpload({ target: fileInput });
    }
  });
}

async function handleCvUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const statusEl = document.getElementById('cv-upload-status');
  if (statusEl) statusEl.innerHTML = `<span style="color: var(--accent-primary);">Extracting skills with PDF parser...</span>`;

  const formData = new FormData();
  formData.append('cv', file);

  try {
    const res = await fetch('/api/profile/upload-cv', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (data.success) {
      if (statusEl) statusEl.innerHTML = `<span style="color: var(--match-high-fg);">✓ Parsed ${data.detectedSkills.length} skills successfully!</span>`;
      showToast(`Parsed ${data.detectedSkills.length} skills from resume`, 'file-check');
      await loadUserProfile();
      triggerSearch();
    } else {
      if (statusEl) statusEl.innerHTML = `<span style="color: var(--danger-fg);">${data.error || 'Upload failed'}</span>`;
    }
  } catch (err) {
    if (statusEl) statusEl.innerHTML = `<span style="color: var(--danger-fg);">Upload error: ${err.message}</span>`;
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
      document.getElementById('prof-school').value = data.profile.educationSummary || '';
      document.getElementById('prof-email').value = data.profile.email || '';
      document.getElementById('prof-phone').value = data.profile.phone || '';
      document.getElementById('prof-portfolio').value = data.profile.portfolioUrl || '';
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
        msg.style.display = 'inline';
        setTimeout(() => msg.style.display = 'none', 2000);
      }
      showToast('Profile updated', 'check');
      await loadUserProfile();
      triggerSearch();
    }
  } catch (err) {
    console.error('Save profile error:', err);
  }
}

// ==================== OBSERVABILITY & CUSTOM PROVIDERS ====================
async function loadProviderHealth() {
  try {
    const res = await fetch('/api/providers/health');
    const data = await res.json();
    if (data.success && data.health) {
      state.health = data.health;
      const pill = document.getElementById('rail-health-pill');
      if (pill) {
        const live = data.health.healthyCount || 19;
        const total = data.health.totalProvidersMonitored || 19;
        pill.textContent = `${live}/${total} Live`;
      }
    }
  } catch (e) {}
}

function renderHealthTable() {
  const tbody = document.getElementById('health-table-body');
  if (!tbody || !state.health) return;

  tbody.innerHTML = (state.health.providers || []).map(p => `
    <tr style="border-bottom: 1px solid var(--border-subtle);">
      <td style="padding: 10px 14px; font-weight: 500; color: var(--text-primary);">${p.name}</td>
      <td style="padding: 10px 14px;">
        <span class="match-score-pill ${p.status === 'ok' ? 'high' : 'low'}" style="font-size: 10px;">${p.status.toUpperCase()}</span>
      </td>
      <td style="padding: 10px 14px; font-family: var(--font-mono);">${p.jobsCount || 0}</td>
      <td style="padding: 10px 14px; font-family: var(--font-mono); color: var(--text-muted);">${p.latencyMs ? `${p.latencyMs}ms` : '<1s'}</td>
      <td style="padding: 10px 14px; color: var(--text-muted); font-size: 11px;">${p.errorMessage ? p.errorMessage.slice(0, 45) : 'None'}</td>
    </tr>
  `).join('');
}

async function loadCustomProviders() {
  try {
    const res = await fetch('/api/custom-providers');
    const data = await res.json();
    if (data.success && data.providers) {
      state.customProviders = data.providers;
      renderCustomProvidersList();
    }
  } catch (e) {}
}

function renderCustomProvidersList() {
  const container = document.getElementById('custom-providers-list');
  if (!container) return;

  if (state.customProviders.length === 0) {
    container.innerHTML = `<p style="font-size: 12px; color: var(--text-muted); padding: 8px 0;">No custom feeds added yet. Add an RSS XML or JSON endpoint.</p>`;
    return;
  }

  container.innerHTML = state.customProviders.map(p => `
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-radius: var(--radius-sm); background: var(--bg-canvas); border: 1px solid var(--border-subtle);">
      <div>
        <span style="font-size: 12.5px; font-weight: 500; color: var(--text-primary);">${p.name}</span>
        <span class="contract-pill" style="margin-left: 6px;">${p.type}</span>
        <p style="font-size: 11px; font-family: var(--font-mono); color: var(--text-muted); margin-top: 2px;">${p.url}</p>
      </div>
      <div style="display: flex; align-items: center; gap: 6px;">
        <button onclick="toggleCustomProvider('${p.id}')" class="btn-action-icon" style="width: auto; padding: 0 8px; font-size: 11px; height: 26px;">
          ${p.active ? 'Disable' : 'Enable'}
        </button>
        <button onclick="deleteCustomProvider('${p.id}')" class="btn-action-icon" style="width: 26px; height: 26px;">
          <i data-lucide="trash-2" style="width: 12px; height: 12px;"></i>
        </button>
      </div>
    </div>
  `).join('');

  if (window.lucide) lucide.createIcons();
}

async function handleAddFeedSubmit(e) {
  if (e) e.preventDefault();
  const name = document.getElementById('feed-name-input').value.trim();
  const url = document.getElementById('feed-url-input').value.trim();
  const type = document.getElementById('feed-type-select').value;

  try {
    const res = await fetch('/api/custom-providers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, url, type })
    });
    if (res.ok) {
      closeAddFeedModal();
      showToast(`Added feed "${name}"`, 'check');
      await loadCustomProviders();
      triggerSearch();
    }
  } catch (err) {
    showToast('Failed to add feed', 'alert-circle');
  }
}

async function toggleCustomProvider(id) {
  try {
    await fetch(`/api/custom-providers/${id}/toggle`, { method: 'PATCH' });
    await loadCustomProviders();
    triggerSearch();
  } catch (e) {}
}

async function deleteCustomProvider(id) {
  if (!confirm('Remove this custom provider?')) return;
  try {
    await fetch(`/api/custom-providers/${id}`, { method: 'DELETE' });
    await loadCustomProviders();
    triggerSearch();
  } catch (e) {}
}

// Quick Search from Directory
function searchDirectCompany(company) {
  switchView('jobs');
  document.getElementById('cmd-search-input').value = company;
  document.getElementById('filter-location').value = 'Morocco';
  document.getElementById('filter-source').value = 'all';
  triggerSearch();
}

// ==================== MODALS & TOAST STACK ====================
function openShortcutsModal() {
  document.getElementById('modal-shortcuts').classList.add('open');
}

function closeShortcutsModal(e) {
  if (e && e.target !== e.currentTarget && !e.target.closest('.drawer-close-btn')) return;
  document.getElementById('modal-shortcuts').classList.remove('open');
}

function openAddFeedModal() {
  document.getElementById('modal-add-feed').classList.add('open');
}

function closeAddFeedModal(e) {
  if (e && e.target !== e.currentTarget && !e.target.closest('.drawer-close-btn') && !e.target.closest('button[type="button"]')) return;
  document.getElementById('modal-add-feed').classList.remove('open');
}

function showToast(message, icon = 'info') {
  const stack = document.getElementById('toast-stack');
  if (!stack) return;

  const toast = document.createElement('div');
  toast.className = 'toast-item';
  toast.innerHTML = `
    <i data-lucide="${icon}" style="width: 15px; height: 15px; color: var(--accent-primary);"></i>
    <span>${message}</span>
  `;
  stack.appendChild(toast);

  if (window.lucide) lucide.createIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 160ms ease';
    setTimeout(() => toast.remove(), 180);
  }, 2600);
}
