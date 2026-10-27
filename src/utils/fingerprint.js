/**
 * Normalizes text to a clean slug
 */
function slugify(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]+/g, '-') // replace non-alphanumeric with hyphen
    .replace(/^-+|-+$/g, ''); // trim hyphens
}

/**
 * Normalizes company names by stripping common suffixes
 */
function normalizeCompany(company) {
  if (!company) return 'unknown';
  let clean = company
    .replace(/\b(inc|corp|corporation|llc|ltd|sarl|sa|au|group|groupe|technologies|solutions)\b/gi, '')
    .trim();
  return slugify(clean) || slugify(company);
}

/**
 * Generates a normalized cross-platform job fingerprint
 */
function generateFingerprint(job) {
  if (!job) return '';
  const comp = normalizeCompany(job.company);
  const title = slugify(
    (job.title || '')
      .replace(/[\(（\[].*?[\)）\]]/g, '') // remove parentheses/brackets
      .replace(/\b(h\/f|f\/h|m\/f|f\/m)\b/gi, '')
  );
  const loc = slugify((job.location || '').split(',')[0]);
  return `${comp}::${title}::${loc}`;
}

module.exports = {
  slugify,
  normalizeCompany,
  generateFingerprint
};
