const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { execSync } = require('node:child_process');
const path = require('node:path');
const { validateEnv, envSchema, checkAiProviderWarning } = require('../src/config/validate-env');

const ROOT_DIR = path.resolve(__dirname, '..');
const VALID_JWT_SECRET = 'a'.repeat(32); // 32 characters

describe('TASK 15 (P3): Environment Validation', () => {
  it('passes validation with clean defaults and valid 32-character JWT_SECRET', () => {
    const rawEnv = {
      JWT_SECRET: VALID_JWT_SECRET
    };

    const validated = validateEnv(rawEnv, { exitOnError: false });
    assert.equal(validated.JWT_SECRET, VALID_JWT_SECRET);
    assert.equal(validated.PORT, 4000);
    assert.equal(validated.NODE_ENV, 'development');
    assert.equal(validated.CORS_ORIGINS, 'http://localhost:4000');
  });

  it('coerces valid PORT string and preserves valid NODE_ENV', () => {
    const rawEnv = {
      JWT_SECRET: VALID_JWT_SECRET,
      PORT: '8080',
      NODE_ENV: 'production'
    };

    const validated = validateEnv(rawEnv, { exitOnError: false });
    assert.equal(validated.PORT, 8080);
    assert.equal(validated.NODE_ENV, 'production');
  });

  it('throws or exits when JWT_SECRET is completely missing', () => {
    let failed = false;
    try {
      validateEnv({}, { exitOnError: false });
    } catch (err) {
      failed = true;
      assert.ok(err.issues, 'Error must contain validation issues');
      const jwtIssue = err.issues.find(i => i.path.includes('JWT_SECRET'));
      assert.ok(jwtIssue, 'Must flag missing JWT_SECRET');
      assert.match(jwtIssue.message, /JWT_SECRET must be set and ≥32 chars/);
    }
    assert.ok(failed, 'Should throw error when JWT_SECRET is missing');
  });

  it('throws or exits when JWT_SECRET is shorter than 32 characters', () => {
    let failed = false;
    try {
      validateEnv({ JWT_SECRET: 'only-20-chars-secret' }, { exitOnError: false });
    } catch (err) {
      failed = true;
      const jwtIssue = err.issues.find(i => i.path.includes('JWT_SECRET'));
      assert.ok(jwtIssue, 'Must flag short JWT_SECRET');
      assert.match(jwtIssue.message, /JWT_SECRET must be set and ≥32 chars/);
    }
    assert.ok(failed, 'Should throw error when JWT_SECRET < 32 chars');
  });

  it('rejects invalid NODE_ENV values with clear hint', () => {
    let failed = false;
    try {
      validateEnv({
        JWT_SECRET: VALID_JWT_SECRET,
        NODE_ENV: 'staging'
      }, { exitOnError: false });
    } catch (err) {
      failed = true;
      const envIssue = err.issues.find(i => i.path.includes('NODE_ENV'));
      assert.ok(envIssue, 'Must flag invalid NODE_ENV');
      assert.match(envIssue.message, /NODE_ENV must be one of: development, production, test/);
    }
    assert.ok(failed, 'Should throw error when NODE_ENV is invalid');
  });

  it('rejects non-numeric or negative PORT values', () => {
    let nonNumericFailed = false;
    try {
      validateEnv({
        JWT_SECRET: VALID_JWT_SECRET,
        PORT: 'not-a-number'
      }, { exitOnError: false });
    } catch (err) {
      nonNumericFailed = true;
      const portIssue = err.issues.find(i => i.path.includes('PORT'));
      assert.ok(portIssue, 'Must flag non-numeric PORT');
    }
    assert.ok(nonNumericFailed, 'Should reject non-numeric PORT');

    let negativeFailed = false;
    try {
      validateEnv({
        JWT_SECRET: VALID_JWT_SECRET,
        PORT: '-500'
      }, { exitOnError: false });
    } catch (err) {
      negativeFailed = true;
      const portIssue = err.issues.find(i => i.path.includes('PORT'));
      assert.ok(portIssue, 'Must flag negative PORT');
    }
    assert.ok(negativeFailed, 'Should reject negative PORT');
  });

  it('logs a WARN when all AI provider keys are missing but does not crash', () => {
    const rawEnv = {
      JWT_SECRET: VALID_JWT_SECRET,
      NODE_ENV: 'development',
      GEMINI_API_KEY: '',
      GROQ_API_KEY: '',
      OPENAI_API_KEY: '',
      OLLAMA_URL: ''
    };

    // checkAiProviderWarning returns false when all AI keys are absent
    const hasAi = checkAiProviderWarning(rawEnv);
    assert.equal(hasAi, false, 'Should detect absence of AI keys');

    // validateEnv should not crash or throw
    const validated = validateEnv(rawEnv, { exitOnError: false });
    assert.ok(validated);
    assert.equal(validated.JWT_SECRET, VALID_JWT_SECRET);
  });

  it('detects when an AI key (e.g. GEMINI_API_KEY) is supplied', () => {
    const rawEnv = {
      JWT_SECRET: VALID_JWT_SECRET,
      GEMINI_API_KEY: 'AIzaSyTestApiKey1234567890'
    };

    const hasAi = checkAiProviderWarning(rawEnv);
    assert.equal(hasAi, true, 'Should detect presence of valid Gemini key');
  });

  it('Acceptance: starting server or process with no JWT_SECRET prints error and exits with code 1', () => {
    let exitedWithOne = false;
    try {
      execSync('node -e "require(\'./src/config/validate-env\').validateEnv({});"', {
        cwd: ROOT_DIR,
        stdio: 'pipe',
        env: { ...process.env, JWT_SECRET: '' }
      });
    } catch (err) {
      exitedWithOne = (err.status === 1);
      const stderr = err.stderr ? err.stderr.toString() : '';
      assert.match(stderr, /FATAL: JWT_SECRET must be set and ≥32 chars/);
    }
    assert.ok(exitedWithOne, 'Missing JWT_SECRET must exit process with code 1');
  });

  it('Acceptance: starting server or process with JWT_SECRET=\"short\" prints validation error and exits with code 1', () => {
    let exitedWithOne = false;
    try {
      execSync('node -e "require(\'./src/config/validate-env\').validateEnv({ JWT_SECRET: \'short\' });"', {
        cwd: ROOT_DIR,
        stdio: 'pipe',
        env: { ...process.env, JWT_SECRET: 'short' }
      });
    } catch (err) {
      exitedWithOne = (err.status === 1);
      const stderr = err.stderr ? err.stderr.toString() : '';
      assert.match(stderr, /FATAL: JWT_SECRET must be set and ≥32 chars/);
    }
    assert.ok(exitedWithOne, 'Short JWT_SECRET must exit process with code 1');
  });
});
