/**
 * Strict Job Board Date Parser & Freshness Utility
 * Parses common job-board date formats (EN/FR, relative, unix, ISO, absolute)
 * NEVER falls back to new Date(). Returns null on parsing failure.
 */

const RELATIVE_EN = {
  h: 3600e3,
  hour: 3600e3,
  hours: 3600e3,
  d: 86400e3,
  day: 86400e3,
  days: 86400e3,
  w: 7 * 86400e3,
  week: 7 * 86400e3,
  weeks: 7 * 86400e3,
  mo: 30 * 86400e3,
  month: 30 * 86400e3,
  months: 30 * 86400e3,
  y: 365 * 86400e3,
  year: 365 * 86400e3,
  years: 365 * 86400e3
};

const RELATIVE_FR = {
  h: 3600e3,
  heure: 3600e3,
  heures: 3600e3,
  j: 86400e3,
  jour: 86400e3,
  jours: 86400e3,
  semaine: 7 * 86400e3,
  semaines: 7 * 86400e3,
  mois: 30 * 86400e3,
  an: 365 * 86400e3,
  ans: 365 * 86400e3,
  année: 365 * 86400e3,
  années: 365 * 86400e3
};

const FRENCH_MONTHS = {
  'janvier': 'January',
  'février': 'February',
  'fevrier': 'February',
  'mars': 'March',
  'avril': 'April',
  'mai': 'May',
  'juin': 'June',
  'juillet': 'July',
  'août': 'August',
  'aout': 'August',
  'septembre': 'September',
  'octobre': 'October',
  'novembre': 'November',
  'décembre': 'December',
  'decembre': 'December'
};

/**
 * Parses any job board raw date string/number/Date object
 *
 * @param {any} raw - Raw input date
 * @param {number|Date} [nowRef=Date.now()] - Reference timestamp for relative calculations
 * @returns {Date|null} Parsed Date object, or null if invalid/stale/future
 */
function parsePostedDate(raw, nowRef = Date.now()) {
  if (raw == null) return null;

  const now = typeof nowRef === 'number' ? nowRef : new Date(nowRef).getTime();

  // If already a Date object
  if (raw instanceof Date) {
    if (isNaN(raw.getTime())) return null;
    const diff = raw.getTime() - now;
    if (diff > 86400e3) return null; // Reject future (> 1 day)
    if (now - raw.getTime() > 20 * 365 * 86400e3) return null; // Reject > 20 years old
    return raw;
  }

  // If numeric unix timestamp
  if (typeof raw === 'number') {
    if (isNaN(raw) || raw <= 0) return null;
    const d = raw > 1e11 ? new Date(raw) : new Date(raw * 1000);
    if (isNaN(d.getTime())) return null;
    const diff = d.getTime() - now;
    if (diff > 86400e3) return null;
    if (now - d.getTime() > 20 * 365 * 86400e3) return null;
    return d;
  }

  let s = String(raw).trim().toLowerCase();
  if (!s || s === 'null' || s === 'undefined' || s === 'nan') return null;

  // Unix timestamp strings
  if (/^\d{10}$/.test(s)) {
    const d = new Date(Number(s) * 1000);
    return isNaN(d.getTime()) ? null : d;
  }
  if (/^\d{13}$/.test(s)) {
    const d = new Date(Number(s));
    return isNaN(d.getTime()) ? null : d;
  }

  // Relative French: "il y a 2 jours", "il y a 3 heures", "il y a 1 mois"
  const relFr = s.match(/il y a\s+(\d+)\s*(heure|heures|jour|jours|semaine|semaines|mois|an|ans|année|années|h|j)/i);
  if (relFr) {
    const n = Number(relFr[1]);
    const unit = relFr[2].toLowerCase();
    const ms = RELATIVE_FR[unit] || 0;
    if (ms) return new Date(now - n * ms);
  }

  // Relative English: "3 days ago", "2 hours ago", "1 month ago"
  const relEn = s.match(/(\d+)\s*(hour|hours|day|days|week|weeks|month|months|year|years)\s+ago/i);
  if (relEn) {
    const n = Number(relEn[1]);
    const unit = relEn[2].toLowerCase();
    const ms = RELATIVE_EN[unit] || 0;
    if (ms) return new Date(now - n * ms);
  }

  // Short relative: "2h ago", "3d ago", "1w ago", "2mo ago", "1y ago"
  const relShort = s.match(/(\d+)\s*(h|d|w|mo|y)\s+ago/i);
  if (relShort) {
    const n = Number(relShort[1]);
    const unit = relShort[2].toLowerCase();
    const ms = RELATIVE_EN[unit] || 0;
    if (ms) return new Date(now - n * ms);
  }

  // Immediate markers
  if (s === 'today' || s === "aujourd'hui" || s === 'just now' || s === "à l'instant" || s === 'recently') {
    return new Date(now);
  }
  if (s === 'yesterday' || s === 'hier') {
    return new Date(now - 86400e3);
  }

  // Format DD/MM/YYYY or DD-MM-YYYY (European / Moroccan formats e.g. "20/10/2022")
  const euMatch = s.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/);
  if (euMatch) {
    const day = Number(euMatch[1]);
    const month = Number(euMatch[2]) - 1;
    const year = Number(euMatch[3]);
    const d = new Date(Date.UTC(year, month, day));
    if (!isNaN(d.getTime())) {
      const diff = d.getTime() - now;
      if (diff > 86400e3) return null;
      if (now - d.getTime() > 20 * 365 * 86400e3) return null;
      return d;
    }
  }

  // Normalize French month names in text (e.g. "20 octobre 2022" -> "20 October 2022")
  let normalizedStr = s;
  for (const [fr, en] of Object.entries(FRENCH_MONTHS)) {
    if (normalizedStr.includes(fr)) {
      normalizedStr = normalizedStr.replace(new RegExp(`\\b${fr}\\b`, 'gi'), en);
      break;
    }
  }

  // Absolute parse via native parser (ISO, "Oct 20, 2022", "2026-10-24T12:00:00Z")
  const d = new Date(normalizedStr);
  if (!isNaN(d.getTime())) {
    const diff = d.getTime() - now;
    // Reject impossible future dates (> 1 day ahead)
    if (diff > 86400e3) return null;
    // Reject ancient dates (> 20 years old)
    if (now - d.getTime() > 20 * 365 * 86400e3) return null;
    return d;
  }

  return null;
}

/**
 * Format Date into user-facing relative label
 *
 * @param {Date|string|null} date
 * @param {number} [now=Date.now()]
 * @returns {string} e.g. "2 days ago", "1mo ago", "Date unknown"
 */
function formatPostedDateLabel(date, now = Date.now()) {
  if (!date) return 'Date unknown';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return 'Date unknown';

  const diffMs = now - d.getTime();
  if (diffMs < 0) return 'Just now';

  const diffHours = Math.floor(diffMs / 3600e3);
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffMs / 86400e3);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return months === 1 ? '1 month ago' : `${months} months ago`;
  }

  const years = Math.floor(diffDays / 365);
  return years === 1 ? '1 year ago' : `${years} years ago`;
}

/**
 * Evaluates whether a job posting is fresh (<= 7 days old)
 */
function isFreshPosting(date, now = Date.now()) {
  if (!date) return false;
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return false;
  const diff = now - d.getTime();
  return diff >= 0 && diff < 7 * 86400e3;
}

/**
 * Staleness cutoff filter at ingestion
 * Rejects jobs older than MAX_JOB_AGE_DAYS (default 90 days) or jobs with null postedAt
 *
 * @param {Object} job
 * @param {number} [maxAgeDays=90]
 * @returns {boolean} true if acceptable for ingestion, false if stale or undated
 */
const DEFAULT_MAX_AGE_DAYS = Number(process.env.MAX_JOB_AGE_DAYS ?? 90);

function shouldIngest(job, maxAgeDays = DEFAULT_MAX_AGE_DAYS) {
  if (!job) return false;
  const rawDate = job.postedAt || job.datePosted || job.published_at || job.publishedAt;
  if (!rawDate) return false;

  const dateObj = rawDate instanceof Date ? rawDate : new Date(rawDate);
  if (isNaN(dateObj.getTime())) return false;

  const maxAgeMs = maxAgeDays * 86400e3;
  if (Date.now() - dateObj.getTime() > maxAgeMs) {
    return false; // too old
  }
  return true;
}

module.exports = {
  parsePostedDate,
  formatPostedDateLabel,
  isFreshPosting,
  shouldIngest
};
