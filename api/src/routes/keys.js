const router = require('express').Router();
const crypto = require('crypto');
const db = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Helper function to generate a secure random API key
function generateApiKey(prefix = 'dmm_') {
    return prefix + crypto.randomBytes(24).toString('base64').replace(/[+/=]/g, '').slice(0, 32);
}

/**
 * Whether this caller may touch this project's keys.
 *
 * Every route below used to require only that the caller was authenticated,
 * and an authenticated caller includes every project key ever issued. So one
 * client's key could list — in full, values and all — the keys of every other
 * client's projects, and mint new ones for them. Reading a key is enough to
 * take over that project's storage for good.
 *
 * People with an admin login and service keys manage keys. A project key gets
 * its own project and nothing else.
 */
function maySeeProject(user, projectId) {
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'editor' || user.role === 'service') return true;
    return user.role === 'api' && user.project_id === projectId;
}

// GET /api/keys/project/:project_id
router.get('/project/:project_id', authenticateToken, async (req, res, next) => {
    try {
        const { project_id } = req.params;

        if (!maySeeProject(req.user, project_id)) {
            // Same answer as a project that does not exist: telling a caller
            // that one exists but is not theirs confirms what to aim at next.
            return res.status(404).json({ error: 'Project not found' });
        }

        // Verify project belongs to client (optional based on auth, but simple for now)
        const result = await db.query(
            `SELECT id, name, key, created_at, last_used_at 
             FROM api_keys 
             WHERE project_id = $1 
             ORDER BY created_at DESC`,
            [project_id]
        );

        // Hide part of the key for security if needed, but since it's the owner let's show it fully or masked
        // Best practice is to only show the full key once, but for simplicity here we return it.
        res.json({ keys: result.rows });
    } catch (error) {
        next(error);
    }
});

// POST /api/keys/project/:project_id
router.post('/project/:project_id', authenticateToken, async (req, res, next) => {
    try {
        const { project_id } = req.params;
        const { name } = req.body;

        if (!maySeeProject(req.user, project_id)) {
            return res.status(404).json({ error: 'Project not found' });
        }

        if (!name) {
            return res.status(400).json({ error: 'Key name is required' });
        }

        // Check if project exists
        const projectResult = await db.query('SELECT client_id FROM projects WHERE id = $1', [project_id]);
        if (projectResult.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const client_id = projectResult.rows[0].client_id;
        const newKey = generateApiKey();

        const result = await db.query(
            `INSERT INTO api_keys (project_id, client_id, name, key)
             VALUES ($1, $2, $3, $4)
             RETURNING id, name, key, created_at`,
            [project_id, client_id, name, newKey]
        );

        res.status(201).json({ key: result.rows[0] });
    } catch (error) {
        if (error.constraint === 'api_keys_key_key') {
            return res.status(500).json({ error: 'Key collision, please try again' });
        }
        next(error);
    }
});

// DELETE /api/keys/:id
router.delete('/:id', authenticateToken, async (req, res, next) => {
    try {
        const target = await db.query('SELECT project_id FROM api_keys WHERE id = $1', [
            req.params.id,
        ]);
        if (target.rows.length === 0) {
            return res.status(404).json({ error: 'API key not found' });
        }
        if (!maySeeProject(req.user, target.rows[0].project_id)) {
            return res.status(404).json({ error: 'API key not found' });
        }

        const result = await db.query('DELETE FROM api_keys WHERE id = $1 RETURNING id', [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'API key not found' });
        }

        res.json({ message: 'API key revoked successfully' });
    } catch (error) {
        next(error);
    }
});

/*
 * Service keys: for another system, not a person.
 *
 * Only an admin issues one, and only ever sees its value once — the list below
 * deliberately does not return it. A key that can be read back out of a listing
 * is a key that leaks every time somebody opens the wrong screen.
 */

// POST /api/keys/service
router.post('/service', authenticateToken, authorizeRoles('admin'), async (req, res, next) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Key name is required' });
        }

        const result = await db.query(
            `INSERT INTO api_keys (name, key, scope)
             VALUES ($1, $2, 'service')
             RETURNING id, name, key, created_at`,
            [name, generateApiKey('dmms_')]
        );

        res.status(201).json({ key: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

// GET /api/keys/service
router.get('/service', authenticateToken, authorizeRoles('admin'), async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT id, name, created_at, last_used_at
               FROM api_keys WHERE scope = 'service'
              ORDER BY created_at DESC`
        );
        res.json({ keys: result.rows });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/keys/service/:id
router.delete('/service/:id', authenticateToken, authorizeRoles('admin'), async (req, res, next) => {
    try {
        const result = await db.query(
            `DELETE FROM api_keys WHERE id = $1 AND scope = 'service' RETURNING id`,
            [req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Service key not found' });
        }
        res.json({ message: 'Service key revoked successfully' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
