const router = require('express').Router();
const crypto = require('crypto');
const db = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Helper function to generate a secure random API key
function generateApiKey() {
    return 'dmm_' + crypto.randomBytes(24).toString('base64').replace(/[+/=]/g, '').slice(0, 32);
}

// GET /api/keys/project/:project_id
router.get('/project/:project_id', authenticateToken, async (req, res, next) => {
    try {
        const { project_id } = req.params;

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
        const result = await db.query('DELETE FROM api_keys WHERE id = $1 RETURNING id', [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'API key not found' });
        }

        res.json({ message: 'API key revoked successfully' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
