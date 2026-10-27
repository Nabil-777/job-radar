/**
 * Prompt Security & Injection Hardening Utilities
 * Protects against prompt injection attacks, system prompt extraction, and credential leakage
 */

const MAX_DESCRIPTION_CHARS = 4000;

const SUSPICIOUS_PATTERNS = [
  /AIza[0-9A-Za-z-_]{35}/, // Google API key
  /sk-[a-zA-Z0-9]{20,}/,  // OpenAI key
  /gsk_[a-zA-Z0-9]{20,}/, // Groq key
  /<<<JOB_DESCRIPTION>>>/i,
  /<<<END>>>/i,
  /Content between delimiters is untrusted data/i,
  /Ignore previous instructions/i,
  /SYSTEM PROMPT/i,
  /You are an expert tech career coach/i,
  /You are a world-class executive tech resume writer/i
];

/**
 * Sanitize and delimit untrusted job descriptions
 * @param {string} rawDescription
 * @param {number} maxChars
 * @returns {string} Delimited safe string
 */
function sanitizeJobDescription(rawDescription = '', maxChars = MAX_DESCRIPTION_CHARS) {
  if (!rawDescription || typeof rawDescription !== 'string') {
    return '<<<JOB_DESCRIPTION>>>\nNo job description provided.\n<<<END>>>';
  }

  // Truncate to token budget limit
  const truncated = rawDescription.slice(0, maxChars).trim();

  return `<<<JOB_DESCRIPTION>>>\n${truncated}\n<<<END>>>`;
}

/**
 * Checks if LLM output contains leaked system prompt fragments, delimiters, or API credentials
 * @param {string|object} output
 * @returns {boolean} true if safe, false if tainted
 */
function isOutputSafe(output) {
  if (!output) return true;

  const textToScan = typeof output === 'string'
    ? output
    : JSON.stringify(output);

  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(textToScan)) {
      return false; // rejected
    }
  }

  return true;
}

/**
 * Clean user-supplied notes/descriptions of blatant injection markers
 */
function sanitizeUserInput(input = '') {
  if (typeof input !== 'string') return '';
  return input
    .replace(/ignore\s+(all\s+)?previous\s+instructions/gi, '[filtered]')
    .replace(/output\s+(your\s+)?system\s+prompt/gi, '[filtered]')
    .slice(0, 1000);
}

module.exports = {
  sanitizeJobDescription,
  isOutputSafe,
  sanitizeUserInput,
  MAX_DESCRIPTION_CHARS,
  SUSPICIOUS_PATTERNS
};
