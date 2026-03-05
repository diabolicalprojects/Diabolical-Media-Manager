const router = require('express').Router();
const db = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// GET /api/clients
router.get('/', authenticateToken, async (req, res, next) => {
    try {
        const result = await db.query('SELECT * FROM clients ORDER BY created_at DESC');
        res.json({ clients: result.rows });
    } catch (error) {
        next(error);
    }
});

// GET /api/clients/:id
router.get('/:id', authenticateToken, async (req, res, next) => {
    try {
        const result = await db.query('SELECT * FROM clients WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Client not found' });
        }
        res.json({ client: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

// POST /api/clients
router.post('/', authenticateToken, authorizeRoles('admin'), async (req, res, next) => {
    try {
        const { name, slug } = req.body;
        if (!name || !slug) {
            return res.status(400).json({ error: 'Name and slug are required' });
        }

        const clientSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');

        const result = await db.query(
            'INSERT INTO clients (name, slug) VALUES ($1, $2) RETURNING *',
            [name, clientSlug]
        );

        res.status(201).json({ client: result.rows[0] });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Client slug already exists' });
        }
        next(error);
    }
});

// PUT /api/clients/:id
router.put('/:id', authenticateToken, authorizeRoles('admin'), async (req, res, next) => {
    try {
        const { name } = req.body;
        const result = await db.query(
            'UPDATE clients SET name = COALESCE($1, name) WHERE id = $2 RETURNING *',
            [name, req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Client not found' });
        }
        res.json({ client: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/clients/:id
router.delete('/:id', authenticateToken, authorizeRoles('admin'), async (req, res, next) => {
    try {
        const result = await db.query('DELETE FROM clients WHERE id = $1 RETURNING id', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Client not found' });
        }
        res.json({ message: 'Client deleted' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
