const { db } = require('../db/database');

class ScraperHealthService {
  constructor(options = {}) {
    this.maxFailures = options.maxFailures || 3;
    this.cooldownMs = options.cooldownMs || (Number(process.env.SCRAPER_COOLDOWN_MS) || 6 * 60 * 60 * 1000);
    this.providers = new Map();
    this.initFromDatabase();
  }

  initFromDatabase() {
    try {
      const rows = db.prepare('SELECT * FROM provider_health').all();
      for (const row of rows) {
        this.providers.set(row.provider_name, {
          providerName: row.provider_name,
          lastSuccess: row.status === 'ok' ? row.last_run_at : null,
          lastFailure: row.status !== 'ok' ? row.last_run_at : null,
          consecutiveFailures: row.status === 'degraded' ? this.maxFailures : (row.status === 'failed' ? 1 : 0),
          avgDurationMs: row.latency_ms || 0,
          totalRuns: row.last_run_at ? 1 : 0,
          status: row.status || 'ok',
          circuitOpenUntil: row.status === 'degraded' ? Date.now() + this.cooldownMs : null,
          lastErrorMessage: row.error_message || null
        });
      }
    } catch (e) {
      // In case database isn't ready or table doesn't exist
    }
  }

  getProviderState(name) {
    if (!this.providers.has(name)) {
      this.providers.set(name, {
        providerName: name,
        lastSuccess: null,
        lastFailure: null,
        consecutiveFailures: 0,
        avgDurationMs: 0,
        totalRuns: 0,
        status: 'ok',
        circuitOpenUntil: null,
        lastErrorMessage: null
      });
    }
    return this.providers.get(name);
  }

  shouldExecute(name) {
    const state = this.getProviderState(name);
    if (state.circuitOpenUntil) {
      if (Date.now() < state.circuitOpenUntil) {
        // Circuit open: skip execution
        return false;
      }
      // Cooldown expired: trial run (auto-recovery)
      state.circuitOpenUntil = null;
      state.status = 'ok';
    }
    return true;
  }

  recordSuccess(name, durationMs, jobsCount = 0) {
    const state = this.getProviderState(name);
    state.lastSuccess = new Date().toISOString();
    state.consecutiveFailures = 0;
    state.circuitOpenUntil = null;
    state.status = 'ok';
    state.lastErrorMessage = null;
    state.totalRuns += 1;
    state.avgDurationMs = state.totalRuns === 1
      ? durationMs
      : Math.round(((state.avgDurationMs * (state.totalRuns - 1)) + durationMs) / state.totalRuns);
    return state;
  }

  recordFailure(name, durationMs, error) {
    const state = this.getProviderState(name);
    state.lastFailure = new Date().toISOString();
    state.consecutiveFailures += 1;
    state.lastErrorMessage = error ? (error.message || String(error)) : 'Unknown error';
    state.totalRuns += 1;
    state.avgDurationMs = state.totalRuns === 1
      ? durationMs
      : Math.round(((state.avgDurationMs * (state.totalRuns - 1)) + durationMs) / state.totalRuns);

    if (state.consecutiveFailures >= this.maxFailures) {
      state.status = 'degraded';
      state.circuitOpenUntil = Date.now() + this.cooldownMs;
      console.warn(`[CircuitBreaker] WARN: Provider "${name}" tripped circuit breaker after ${state.consecutiveFailures} consecutive failures. Skipping for 6 hours.`);
    }

    return state;
  }

  getHealthMatrix() {
    const matrix = {};
    for (const [name, state] of this.providers.entries()) {
      const isCircuitOpen = Boolean(state.circuitOpenUntil && Date.now() < state.circuitOpenUntil);
      matrix[name] = {
        providerName: name,
        lastSuccess: state.lastSuccess,
        lastFailure: state.lastFailure,
        consecutiveFailures: state.consecutiveFailures,
        avgDurationMs: state.avgDurationMs,
        status: isCircuitOpen ? 'degraded' : state.status,
        circuitOpen: isCircuitOpen,
        circuitOpenUntil: state.circuitOpenUntil ? new Date(state.circuitOpenUntil).toISOString() : null,
        lastErrorMessage: state.lastErrorMessage
      };
    }
    return matrix;
  }

  reset() {
    this.providers.clear();
  }
}

const defaultScraperHealthService = new ScraperHealthService();

module.exports = {
  ScraperHealthService,
  scraperHealthService: defaultScraperHealthService
};
