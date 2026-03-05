const router = require('express').Router();
const db = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// GET /api/projects
router.get('/', authenticateToken, async (req, res, next) => {
    try {
        const { client_id } = req.query;
        let query = `
      SELECT p.*, c.name as client_name, c.slug as client_slug
      FROM projects p
      JOIN clients c ON p.client_id = c.id
    `;
        const params = [];

        if (client_id) {
            query += ' WHERE p.client_id = $1';
            params.push(client_id);
        }

        query += ' ORDER BY p.created_at DESC';
        const result = await db.query(query, params);
        res.json({ projects: result.rows });
    } catch (error) {
        next(error);
    }
});

// GET /api/projects/:id
router.get('/:id', authenticateToken, async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT p.*, c.name as client_name, c.slug as client_slug
       FROM projects p
       JOIN clients c ON p.client_id = c.id
       WHERE p.id = $1`,
            [req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }
        res.json({ project: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

// POST /api/projects
router.post('/', authenticateToken, authorizeRoles('admin', 'editor'), async (req, res, next) => {
    try {
        const { client_id, name, slug } = req.body;
        if (!client_id || !name || !slug) {
            return res.status(400).json({ error: 'client_id, name, and slug are required' });
        }

        const projectSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');

        const result = await db.query(
            'INSERT INTO projects (client_id, name, slug) VALUES ($1, $2, $3) RETURNING *',
            [client_id, name, projectSlug]
        );

        res.status(201).json({ project: result.rows[0] });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Project slug already exists for this client' });
        }
        next(error);
    }
});

// DELETE /api/projects/:id
router.delete('/:id', authenticateToken, authorizeRoles('admin'), async (req, res, next) => {
    try {
        const result = await db.query('DELETE FROM projects WHERE id = $1 RETURNING id', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }
        res.json({ message: 'Project deleted' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
