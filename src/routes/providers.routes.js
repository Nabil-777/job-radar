const express = require('express');
const { z } = require('zod');
const { db } = require('../db/database');

const router = express.Router();

const providerSchema = z.object({
  name: z.string().min(1, 'Provider name is required'),
  url: z.string().url('Must be a valid URL'),
  type: z.enum(['rss', 'json', 'html']).optional(),
  category: z.string().optional()
});

// GET /api/custom-providers
router.get('/', (req, res) => {
  try {
    const providers = db.prepare('SELECT * FROM custom_providers ORDER BY created_at DESC').all();
    const normalized = providers.map(p => ({
      id: p.id,
      name: p.name,
      url: p.url,
      type: p.type,
      category: p.category,
      active: p.enabled === 1,
      enabled: p.enabled === 1,
      lastStatus: p.last_status,
      lastFetchedAt: p.last_fetched_at,
      createdAt: p.created_at
    }));
    res.json({ success: true, providers: normalized });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/custom-providers
router.post('/', (req, res) => {
  try {
    const validated = providerSchema.parse(req.body);
    const id = `prov-${Date.now()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO custom_providers (id, name, url, type, category, enabled, created_at)
      VALUES (?, ?, ?, ?, ?, 1, ?)
    `).run(
      id,
      validated.name,
      validated.url,
      validated.type || 'rss',
      validated.category || 'all',
      now
    );

    const created = db.prepare('SELECT * FROM custom_providers WHERE id = ?').get(id);
    res.status(201).json({
      success: true,
      provider: {
        id: created.id,
        name: created.name,
        url: created.url,
        type: created.type,
        category: created.category,
        active: created.enabled === 1
      }
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: err.errors.map(e => e.message).join(', ') });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/custom-providers/:id/toggle
router.patch('/:id/toggle', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM custom_providers WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Provider not found' });
    }

    const newEnabled = existing.enabled === 1 ? 0 : 1;
    db.prepare('UPDATE custom_providers SET enabled = ? WHERE id = ?').run(newEnabled, id);

    res.json({ success: true, provider: { ...existing, enabled: newEnabled, active: newEnabled === 1 } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/custom-providers/:id
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const result = db.prepare('DELETE FROM custom_providers WHERE id = ?').run(id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Provider not found' });
    }
    res.json({ success: true, message: 'Provider deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/providers/health (Observability & Scraper Health Metrics)
router.get('/health', (req, res) => {
  try {
    const healthRows = db.prepare('SELECT * FROM provider_health ORDER BY provider_name ASC').all();
    const customCount = db.prepare('SELECT COUNT(*) as c FROM custom_providers WHERE enabled = 1').get().c;

    const summary = {
      totalProvidersMonitored: healthRows.length,
      activeCustomProviders: customCount,
      healthyCount: healthRows.filter(r => r.status === 'ok').length,
      degradedCount: healthRows.filter(r => r.status === 'degraded').length,
      failedCount: healthRows.filter(r => r.status === 'failed').length,
      providers: healthRows.map(r => ({
        name: r.provider_name,
        status: r.status,
        lastRunAt: r.last_run_at,
        jobsCount: r.jobs_count,
        latencyMs: r.latency_ms,
        errorMessage: r.error_message
      }))
    };

    res.json({ success: true, health: summary });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
