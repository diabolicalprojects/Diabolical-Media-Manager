const router = require('express').Router();
const db = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// GET /api/domains
router.get('/', authenticateToken, async (req, res, next) => {
    try {
        const { project_id } = req.query;
        let query = `
      SELECT d.*, p.name as project_name, c.name as client_name
      FROM domains d
      JOIN projects p ON d.project_id = p.id
      JOIN clients c ON p.client_id = c.id
    `;
        const params = [];

        if (project_id) {
            query += ' WHERE d.project_id = $1';
            params.push(project_id);
        }

        query += ' ORDER BY d.created_at DESC';
        const result = await db.query(query, params);
        res.json({ domains: result.rows });
    } catch (error) {
        next(error);
    }
});

// POST /api/domains
router.post('/', authenticateToken, authorizeRoles('admin', 'editor'), async (req, res, next) => {
    try {
        const { project_id, domain } = req.body;
        if (!project_id || !domain) {
            return res.status(400).json({ error: 'project_id and domain are required' });
        }

        const result = await db.query(
            'INSERT INTO domains (project_id, domain) VALUES ($1, $2) RETURNING *',
            [project_id, domain]
        );

        res.status(201).json({ domain: result.rows[0] });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Domain already exists for this project' });
        }
        next(error);
    }
});

// DELETE /api/domains/:id
router.delete('/:id', authenticateToken, authorizeRoles('admin'), async (req, res, next) => {
    try {
        const result = await db.query('DELETE FROM domains WHERE id = $1 RETURNING id', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Domain not found' });
        }
        res.json({ message: 'Domain deleted' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
