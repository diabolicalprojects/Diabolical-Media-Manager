const jwt = require('jsonwebtoken');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me';

async function authenticateToken(req, res, next) {
    let token = null;

    // Check Authorization header for Bearer or API Key
    const authHeader = req.headers['authorization'];
    if (authHeader) {
        token = authHeader.split(' ')[1];
    }
    
    // Also check for x-api-key header directly
    if (!token && req.headers['x-api-key']) {
        token = req.headers['x-api-key'];
    }

    if (!token) {
        return res.status(401).json({ error: 'Access token or API Key required' });
    }

    // Validate API Key
    if (token.startsWith('dmm_')) {
        try {
            const keyResult = await db.query(
                `SELECT ak.id, ak.client_id as explicit_client, ak.project_id, p.client_id as project_client, c.id as client_id 
                 FROM api_keys ak
                 LEFT JOIN projects p ON p.id = ak.project_id
                 LEFT JOIN clients c ON c.id = COALESCE(ak.client_id, p.client_id)
                 WHERE ak.key = $1`,
                 [token]
            );
            if (keyResult.rows.length === 0) {
                 return res.status(403).json({ error: 'Invalid API Key' });
            }
            
            const keyData = keyResult.rows[0];
            req.user = {
                role: 'api',
                client_id: keyData.client_id,
                project_id: keyData.project_id,
                api_key_id: keyData.id
            };
            
            // Update last_used_at async
            db.query('UPDATE api_keys SET last_used_at = NOW() WHERE id = $1', [keyData.id]).catch(console.error);
            return next();
        } catch (dbError) {
             console.error('[API Key Auth Error]', dbError);
             return res.status(500).json({ error: 'Authentication service unavailable' });
        }
    }

    // Validate JWT
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

function authorizeRoles(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
}

module.exports = { authenticateToken, authorizeRoles };
