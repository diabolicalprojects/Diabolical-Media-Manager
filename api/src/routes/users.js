const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// GET /api/users (admin only)
router.get('/', authenticateToken, authorizeRoles('admin'), async (req, res, next) => {
    try {
        const result = await db.query(
            'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC'
        );
        res.json({ users: result.rows });
    } catch (error) {
        next(error);
    }
});

// PUT /api/users/:id (admin only)
router.put('/:id', authenticateToken, authorizeRoles('admin'), async (req, res, next) => {
    try {
        const { name, email, role, password } = req.body;

        let query = 'UPDATE users SET name = COALESCE($1, name), email = COALESCE($2, email), role = COALESCE($3, role)';
        const params = [name, email, role];

        if (password) {
            const passwordHash = await bcrypt.hash(password, 12);
            query += ', password_hash = $4';
            params.push(passwordHash);
        }

        query += ` WHERE id = $${params.length + 1} RETURNING id, name, email, role, created_at`;
        params.push(req.params.id);

        const result = await db.query(query, params);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/users/:id (admin only)
router.delete('/:id', authenticateToken, authorizeRoles('admin'), async (req, res, next) => {
    try {
        if (req.user.id === req.params.id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING id', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'User deleted' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
