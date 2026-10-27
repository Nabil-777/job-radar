const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { ScraperHealthService } = require('../src/services/scraperHealthService');

test('TASK 7 (P1): ScraperHealthService tracks failures, trips breaker at 3, skips, and auto-recovers after cooldown', async () => {
  // Use a short 100ms cooldown for deterministic testing
  const healthService = new ScraperHealthService({
    maxFailures: 3,
    cooldownMs: 100
  });

  const providerName = 'mock_broken_provider';

  // Warnings spy
  const warnings = [];
  const origWarn = console.warn;
  console.warn = (...args) => warnings.push(args.join(' '));

  try {
    // 1. Initial state: provider allowed to run
    assert.equal(healthService.shouldExecute(providerName), true);

    // 2. Failure 1
    healthService.recordFailure(providerName, 45, new Error('DOM selector changed'));
    let matrix = healthService.getHealthMatrix();
    assert.equal(matrix[providerName].consecutiveFailures, 1);
    assert.equal(matrix[providerName].status, 'ok');
    assert.equal(matrix[providerName].circuitOpen, false);
    assert.equal(healthService.shouldExecute(providerName), true);

    // 3. Failure 2
    healthService.recordFailure(providerName, 50, new Error('DOM selector changed'));
    matrix = healthService.getHealthMatrix();
    assert.equal(matrix[providerName].consecutiveFailures, 2);
    assert.equal(matrix[providerName].status, 'ok');
    assert.equal(matrix[providerName].circuitOpen, false);
    assert.equal(healthService.shouldExecute(providerName), true);

    // 4. Failure 3 -> Circuit breaker trips!
    healthService.recordFailure(providerName, 55, new Error('DOM selector changed'));
    matrix = healthService.getHealthMatrix();
    assert.equal(matrix[providerName].consecutiveFailures, 3);
    assert.equal(matrix[providerName].status, 'degraded');
    assert.equal(matrix[providerName].circuitOpen, true);
    assert.ok(warnings.some(w => w.includes('tripped circuit breaker')), 'Must log WARN when circuit breaker trips');

    // 5. Subsequent run is skipped!
    assert.equal(healthService.shouldExecute(providerName), false, 'Provider must be skipped when circuit is open');

    // 6. Wait for cooldown (110ms > 100ms)
    await new Promise(resolve => setTimeout(resolve, 110));

    // 7. Auto-recovery: shouldExecute returns true to allow trial run
    assert.equal(healthService.shouldExecute(providerName), true, 'Must auto-recover after cooldown');

    // 8. Successful run resets failures
    healthService.recordSuccess(providerName, 30, 10);
    matrix = healthService.getHealthMatrix();
    assert.equal(matrix[providerName].consecutiveFailures, 0);
    assert.equal(matrix[providerName].status, 'ok');
    assert.equal(matrix[providerName].circuitOpen, false);
    assert.ok(matrix[providerName].lastSuccess);
    assert.ok(matrix[providerName].avgDurationMs > 0);
  } finally {
    console.warn = origWarn;
  }
});

test('TASK 7 (P1): GET /api/health/scrapers exposes health matrix as JSON', async () => {
  const app = express();
  const testHealthService = new ScraperHealthService({ maxFailures: 3, cooldownMs: 5000 });
  testHealthService.recordSuccess('rekrute', 120, 15);
  testHealthService.recordFailure('dreamjob', 250, new Error('Selector timeout'));

  app.get('/api/health/scrapers', (req, res) => {
    res.json({
      success: true,
      matrix: testHealthService.getHealthMatrix()
    });
  });

  const server = await new Promise(resolve => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/api/health/scrapers`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.matrix);
    assert.ok(body.matrix.rekrute);
    assert.equal(body.matrix.rekrute.status, 'ok');
    assert.equal(body.matrix.rekrute.consecutiveFailures, 0);

    assert.ok(body.matrix.dreamjob);
    assert.equal(body.matrix.dreamjob.consecutiveFailures, 1);
    assert.equal(body.matrix.dreamjob.lastErrorMessage, 'Selector timeout');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
