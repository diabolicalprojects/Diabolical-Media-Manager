const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, name: user.name },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        res.json({
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role },
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/auth/register (admin only, but first user can self-register)
router.post('/register', async (req, res, next) => {
    try {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }

        const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const userRole = role && ['admin', 'editor', 'viewer'].includes(role) ? role : 'viewer';

        const result = await db.query(
            'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at',
            [name, email, passwordHash, userRole]
        );

        res.status(201).json({ user: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
