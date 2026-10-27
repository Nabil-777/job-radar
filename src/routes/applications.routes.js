const express = require('express');
const { z } = require('zod');
const { db } = require('../db/database');

const router = express.Router();

const applicationSchema = z.object({
  id: z.string().optional(),
  job_id: z.string().optional(),
  jobId: z.string().optional(),
  title: z.string().optional(),
  job_title: z.string().optional(),
  company: z.string().min(1, 'Company is required'),
  location: z.string().optional(),
  url: z.string().url('Invalid URL').or(z.string().min(1)),
  source: z.string().optional(),
  status: z.enum(['Saved', 'Applied', 'Technical_Test', 'Interview', 'Offer', 'Rejected']).optional(),
  notes: z.string().optional(),
  applied_at: z.string().optional(),
  follow_up_at: z.string().optional(),
  cover_letter: z.string().optional()
});

// GET /api/applications
router.get('/', (req, res) => {
  try {
    const apps = db.prepare('SELECT * FROM applications ORDER BY updated_at DESC').all();
    // Normalize properties for backwards compatibility
    const normalized = apps.map(a => ({
      id: a.id,
      jobId: a.job_id,
      title: a.job_title,
      company: a.company,
      location: a.location,
      url: a.url,
      source: a.source,
      status: a.status,
      notes: a.notes,
      appliedAt: a.applied_at,
      followUpAt: a.follow_up_at,
      dateApplied: a.applied_at,
      dateAdded: a.created_at,
      updatedAt: a.updated_at
    }));
    res.json({ success: true, applications: normalized });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/applications
router.post('/', (req, res) => {
  try {
    const validated = applicationSchema.parse(req.body);
    const id = validated.id || `app-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const jobTitle = validated.job_title || validated.title || 'Untitled Role';
    const now = new Date().toISOString();

    const insert = db.prepare(`
      INSERT INTO applications (
        id, job_id, job_title, company, location, url, source, status, notes, applied_at, follow_up_at, cover_letter, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(
      id,
      validated.job_id || validated.jobId || null,
      jobTitle,
      validated.company,
      validated.location || 'Morocco / Remote',
      validated.url,
      validated.source || 'Direct',
      validated.status || 'Saved',
      validated.notes || '',
      validated.applied_at || (validated.status === 'Applied' ? now : null),
      validated.follow_up_at || null,
      validated.cover_letter || null,
      now,
      now
    );

    const created = db.prepare('SELECT * FROM applications WHERE id = ?').get(id);
    res.status(201).json({
      success: true,
      application: {
        id: created.id,
        title: created.job_title,
        company: created.company,
        location: created.location,
        url: created.url,
        source: created.source,
        status: created.status,
        notes: created.notes,
        dateAdded: created.created_at,
        dateApplied: created.applied_at,
        followUpAt: created.follow_up_at
      }
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: err.errors.map(e => e.message).join(', ') });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/applications/:id
router.patch('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM applications WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }

    const { status, notes, follow_up_at, applied_at, cover_letter } = req.body;
    const now = new Date().toISOString();

    let newAppliedAt = existing.applied_at;
    if (status === 'Applied' && !existing.applied_at) {
      newAppliedAt = now;
    } else if (applied_at !== undefined) {
      newAppliedAt = applied_at;
    }

    db.prepare(`
      UPDATE applications SET
        status = COALESCE(?, status),
        notes = COALESCE(?, notes),
        follow_up_at = COALESCE(?, follow_up_at),
        applied_at = ?,
        cover_letter = COALESCE(?, cover_letter),
        updated_at = ?
      WHERE id = ?
    `).run(
      status || null,
      notes !== undefined ? notes : null,
      follow_up_at !== undefined ? follow_up_at : null,
      newAppliedAt,
      cover_letter !== undefined ? cover_letter : null,
      now,
      id
    );

    const updated = db.prepare('SELECT * FROM applications WHERE id = ?').get(id);
    res.json({
      success: true,
      application: {
        id: updated.id,
        title: updated.job_title,
        company: updated.company,
        location: updated.location,
        url: updated.url,
        source: updated.source,
        status: updated.status,
        notes: updated.notes,
        dateAdded: updated.created_at,
        dateApplied: updated.applied_at,
        followUpAt: updated.follow_up_at
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/applications/:id
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const result = db.prepare('DELETE FROM applications WHERE id = ?').run(id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }
    res.json({ success: true, message: 'Application deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/export/applications (CSV Export)
router.get('/export/csv', (req, res) => {
  try {
    const apps = db.prepare('SELECT * FROM applications ORDER BY created_at DESC').all();
    const headers = ['Title', 'Company', 'Location', 'Status', 'Date Added', 'Date Applied', 'URL', 'Notes'];
    const rows = apps.map(a => [
      `"${(a.job_title || '').replace(/"/g, '""')}"`,
      `"${(a.company || '').replace(/"/g, '""')}"`,
      `"${(a.location || '').replace(/"/g, '""')}"`,
      `"${(a.status || '').replace(/"/g, '""')}"`,
      `"${(a.created_at || '').replace(/"/g, '""')}"`,
      `"${(a.applied_at || '').replace(/"/g, '""')}"`,
      `"${(a.url || '').replace(/"/g, '""')}"`,
      `"${(a.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="jobradar_applications.csv"');
    res.send(csvContent);
  } catch (err) {
    res.status(500).send('Error generating applications CSV: ' + err.message);
  }
});

module.exports = router;
