const router = require('express').Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// GET /api/tags
router.get('/', authenticateToken, async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT t.*, COUNT(it.image_id) as image_count
       FROM tags t
       LEFT JOIN image_tags it ON t.id = it.tag_id
       GROUP BY t.id
       ORDER BY t.name`
        );
        res.json({ tags: result.rows });
    } catch (error) {
        next(error);
    }
});

// POST /api/tags
router.post('/', authenticateToken, async (req, res, next) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Tag name is required' });
        }

        const result = await db.query(
            'INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = $1 RETURNING *',
            [name.toLowerCase()]
        );

        res.status(201).json({ tag: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/tags/:id
router.delete('/:id', authenticateToken, async (req, res, next) => {
    try {
        const result = await db.query('DELETE FROM tags WHERE id = $1 RETURNING id', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Tag not found' });
        }
        res.json({ message: 'Tag deleted' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
