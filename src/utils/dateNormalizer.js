/**
 * Normalizes French and English relative dates into ISO-8601 timestamps
 */
function normalizeDate(rawDate) {
  if (!rawDate || typeof rawDate !== 'string') {
    return new Date().toISOString();
  }

  const str = rawDate.trim().toLowerCase();
  const now = new Date();

  // French: Aujourd'hui / À l'instant
  if (str.includes("aujourd'hui") || str.includes('instant') || str.includes('just now') || str.includes('recently')) {
    return now.toISOString();
  }

  // French: Hier / Yesterday
  if (str.includes('hier') || str.includes('yesterday')) {
    now.setDate(now.getDate() - 1);
    return now.toISOString();
  }

  // Relative hours: "il y a 3 heures", "3 hours ago", "3h ago"
  const hoursMatch = str.match(/(?:il y a\s+)?(\d+)\s*(?:heure|hour|h)/);
  if (hoursMatch) {
    const h = parseInt(hoursMatch[1], 10);
    now.setHours(now.getHours() - h);
    return now.toISOString();
  }

  // Relative days: "il y a 4 jours", "4 days ago", "4d ago"
  const daysMatch = str.match(/(?:il y a\s+)?(\d+)\s*(?:jour|day|d)/);
  if (daysMatch) {
    const d = parseInt(daysMatch[1], 10);
    now.setDate(now.getDate() - d);
    return now.toISOString();
  }

  // Relative weeks: "il y a 2 semaines", "2 weeks ago", "2w ago"
  const weeksMatch = str.match(/(?:il y a\s+)?(\d+)\s*(?:semaine|week|w)/);
  if (weeksMatch) {
    const w = parseInt(weeksMatch[1], 10);
    now.setDate(now.getDate() - (w * 7));
    return now.toISOString();
  }

  // Relative months: "il y a 1 mois", "1 month ago"
  const monthsMatch = str.match(/(?:il y a\s+)?(\d+)\s*(?:mois|month)/);
  if (monthsMatch) {
    const m = parseInt(monthsMatch[1], 10);
    now.setMonth(now.getMonth() - m);
    return now.toISOString();
  }

  // Try standard parse e.g. "2026-10-24" or "Oct 24, 2026"
  const parsed = Date.parse(rawDate);
  if (!isNaN(parsed)) {
    return new Date(parsed).toISOString();
  }

  return now.toISOString();
}

/**
 * Formats ISO string into friendly relative string (e.g. "2h ago", "Hier", "3d ago")
 */
function toRelativeTime(isoString) {
  if (!isoString) return 'Recently';
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo ago`;
}

module.exports = {
  normalizeDate,
  toRelativeTime
};
