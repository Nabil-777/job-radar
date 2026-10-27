const { z } = require('zod');
const { logger } = require('../utils/logger');

/**
 * Zod schema defining application environment specifications
 */
const envSchema = z.object({
  NODE_ENV: z.preprocess(
    (val) => (val === undefined || val === '' ? 'development' : String(val).trim()),
    z.enum(['development', 'production', 'test'], {
      message: 'NODE_ENV must be one of: development, production, test'
    })
  ).default('development'),

  PORT: z.preprocess(
    (val) => {
      if (val === undefined || val === '') return 4000;
      const parsed = Number(val);
      return Number.isNaN(parsed) ? val : parsed;
    },
    z.number({
      message: 'PORT must be a valid positive integer (e.g. 4000)'
    }).int('PORT must be an integer').positive('PORT must be a positive integer')
  ).default(4000),

  JWT_SECRET: z.preprocess(
    (val) => (val === undefined || val === null ? '' : String(val).trim()),
    z.string().min(32, 'FATAL: JWT_SECRET must be set and ≥32 chars.')
  ),

  CORS_ORIGINS: z.preprocess(
    (val) => (val === undefined || val === '' ? 'http://localhost:4000' : String(val).trim()),
    z.string().default('http://localhost:4000')
  ),

  GEMINI_API_KEY: z.string().optional().default(''),
  GROQ_API_KEY: z.string().optional().default(''),
  OPENAI_API_KEY: z.string().optional().default(''),
  OLLAMA_URL: z.string().optional().default(''),

  TELEGRAM_BOT_TOKEN: z.string().optional().default(''),
  TELEGRAM_CHAT_ID: z.string().optional().default(''),
  DISCORD_WEBHOOK_URL: z.string().optional().default(''),
  RADAR_CRON_SCHEDULE: z.string().optional().default('0 */2 * * *')
});

/**
 * Inspect AI provider configurations and log warning if none are supplied
 */
function checkAiProviderWarning(parsedEnv) {
  const hasAiKey = Boolean(
    (parsedEnv.GEMINI_API_KEY && parsedEnv.GEMINI_API_KEY.trim()) ||
    (parsedEnv.GROQ_API_KEY && parsedEnv.GROQ_API_KEY.trim()) ||
    (parsedEnv.OPENAI_API_KEY && parsedEnv.OPENAI_API_KEY.trim()) ||
    (parsedEnv.OLLAMA_URL && parsedEnv.OLLAMA_URL.trim())
  );

  if (!hasAiKey) {
    const warningMsg = 'No AI API keys configured (GEMINI_API_KEY, GROQ_API_KEY, OPENAI_API_KEY, OLLAMA_URL). AI pitch & tailored CV generation will use deterministic template fallback.';
    if (parsedEnv.NODE_ENV !== 'test') {
      logger.warn(warningMsg);
    }
    return false;
  }
  return true;
}

/**
 * Validate environment variables and fail fast on invalid configuration
 *
 * @param {Record<string, any>} [customEnv=process.env]
 * @param {Object} [options={ exitOnError: true }]
 * @returns {Record<string, any>} Validated and normalized environment variables
 */
function validateEnv(customEnv = process.env, options = { exitOnError: true }) {
  const result = envSchema.safeParse(customEnv);

  if (!result.success) {
    const issues = result.error.issues || result.error.errors || [];
    console.error('\n======================================================');
    console.error('❌ FATAL: Environment Configuration Validation Failed');
    console.error('======================================================');

    issues.forEach((issue) => {
      const field = issue.path.join('.') || 'CONFIGURATION';
      console.error(` • [${field}] ${issue.message}`);

      if (field === 'JWT_SECRET') {
        console.error('   FATAL: JWT_SECRET must be set and ≥32 chars.');
        console.error('   👉 Hint: Generate a secure secret using: openssl rand -hex 32');
      } else if (field === 'NODE_ENV') {
        console.error('   👉 Hint: Value must be one of: development, production, test');
      } else if (field === 'PORT') {
        console.error('   👉 Hint: Port must be a valid positive integer (default: 4000)');
      }
    });

    console.error('======================================================\n');

    if (options.exitOnError) {
      process.exit(1);
    }

    const error = new Error(`Environment validation failed with ${issues.length} error(s)`);
    error.issues = issues;
    throw error;
  }

  checkAiProviderWarning(result.data);
  return result.data;
}

module.exports = {
  envSchema,
  validateEnv,
  checkAiProviderWarning
};
