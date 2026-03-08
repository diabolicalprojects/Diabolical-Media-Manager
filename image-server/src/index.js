require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 4002;
const STORAGE_PATH = process.env.STORAGE_PATH || '/storage';
const CACHE_PATH = path.join(STORAGE_PATH, 'cache');

// Database connection
const pool = process.env.DATABASE_URL ? new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
}) : null;

if (pool) {
    pool.on('error', (err) => {
        console.error('[CDN DB] Error:', err);
    });
}

// ----- CORS: allow any origin to consume CDN assets -----
app.use(cors({
    origin: '*',
    methods: ['GET', 'HEAD', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Range'],
    exposedHeaders: ['Content-Length', 'Content-Type', 'X-CDN', 'X-Cache'],
    maxAge: 86400, // preflight cache 24h
}));

// Ensure cache directory
if (!fs.existsSync(CACHE_PATH)) {
    fs.mkdirSync(CACHE_PATH, { recursive: true });
}

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'diabolical-cdn' });
});

// CDN route: /:clientSlug/:path*
// Example: /famux/blog/banner.webp?w=600&format=webp
app.get('/:clientSlug/*', async (req, res) => {
    try {
        const clientSlug = req.params.clientSlug;
        const imagePath = req.params[0]; // everything after clientSlug
        const { w, h, format, q } = req.query;

        const width = w ? parseInt(w) : null;
        const height = h ? parseInt(h) : null;
        const quality = q ? parseInt(q) : 80;

        // API Key Validation
        const apiKey = req.query.api_key || req.headers['x-api-key'];
        
        if (pool) {
            // Only validate if a DB connection is provided
            if (!apiKey) {
                return res.status(401).json({ error: 'API key is required' });
            }

            // Verify API Key
            const hasProject = imagePath.includes('/');
            let isValid = false;

            try {
                // If the path relates to a project, let's just validate if the API key exists
                // and gets the correct client_id/project_id
                const keyResult = await pool.query(
                    `SELECT ak.id, ak.client_id, ak.project_id, c.slug as client_slug
                     FROM api_keys ak
                     JOIN clients c ON c.id = COALESCE(ak.client_id, (SELECT client_id FROM projects WHERE id = ak.project_id))
                     WHERE ak.key = $1`,
                    [apiKey]
                );

                if (keyResult.rows.length === 0) {
                    return res.status(403).json({ error: 'Invalid API key' });
                }

                const keyData = keyResult.rows[0];
                
                // Verify the key belongs to the requested clientSlug
                if (keyData.client_slug !== clientSlug) {
                    return res.status(403).json({ error: 'API key does not have access to this client' });
                }

                // If project_id is tied to the key, we should ideally verify the domain. For now, basic validation is fine.
                isValid = true;

                // Update last_used_at async
                pool.query('UPDATE api_keys SET last_used_at = NOW() WHERE id = $1', [keyData.id]).catch(console.error);
                
            } catch (dbError) {
                console.error('[CDN DB Query Error]', dbError);
                return res.status(500).json({ error: 'Authentication service unavailable' });
            }
        }

        // Determine source file
        const originalPath = path.join(STORAGE_PATH, 'clients', clientSlug);

        // Try optimized first, then original
        let sourcePath = null;
        const possiblePaths = [
            path.join(originalPath, imagePath),
            path.join(originalPath, 'general', 'original', imagePath),
            path.join(originalPath, 'general', 'optimized', imagePath),
        ];

        // Also search domain subdirectories
        if (fs.existsSync(originalPath)) {
            const subdirs = fs.readdirSync(originalPath, { withFileTypes: true })
                .filter(d => d.isDirectory())
                .map(d => d.name);

            for (const subdir of subdirs) {
                possiblePaths.push(path.join(originalPath, subdir, 'original', imagePath));
                possiblePaths.push(path.join(originalPath, subdir, 'optimized', imagePath));
            }
        }

        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                sourcePath = p;
                break;
            }
        }

        if (!sourcePath) {
            return res.status(404).json({ error: 'Image not found' });
        }

        // Check if transformation needed
        const needsTransformation = width || height || format;

        if (!needsTransformation) {
            // Serve directly with cache headers
            res.set({
                'Cache-Control': 'public, max-age=31536000',
                'X-CDN': 'diabolical-media-manager',
            });
            return res.sendFile(sourcePath);
        }

        // Generate cache key
        const cacheKey = `${clientSlug}-${imagePath.replace(/[/\\]/g, '-')}-w${width || 'auto'}-h${height || 'auto'}-${format || 'original'}-q${quality}`;
        const outputFormat = format || path.extname(sourcePath).slice(1);
        const cachePath = path.join(CACHE_PATH, `${cacheKey}.${outputFormat}`);

        // Check cache
        if (fs.existsSync(cachePath)) {
            res.set({
                'Cache-Control': 'public, max-age=31536000',
                'X-CDN': 'diabolical-media-manager',
                'X-Cache': 'HIT',
            });
            return res.sendFile(cachePath);
        }

        // Generate on-the-fly
        let pipeline = sharp(sourcePath);

        if (width || height) {
            pipeline = pipeline.resize(width, height, {
                fit: 'inside',
                withoutEnlargement: true,
            });
        }

        if (format) {
            const formatOptions = { quality };
            pipeline = pipeline.toFormat(format, formatOptions);
        }

        const outputBuffer = await pipeline.toBuffer();

        // Save to cache
        fs.writeFileSync(cachePath, outputBuffer);

        // Determine content type
        const contentTypes = {
            webp: 'image/webp',
            avif: 'image/avif',
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            png: 'image/png',
            gif: 'image/gif',
            tiff: 'image/tiff',
        };

        res.set({
            'Content-Type': contentTypes[outputFormat] || 'application/octet-stream',
            'Cache-Control': 'public, max-age=31536000',
            'X-CDN': 'diabolical-media-manager',
            'X-Cache': 'MISS',
        });

        res.send(outputBuffer);
    } catch (error) {
        console.error('[CDN Error]', error.message);
        res.status(500).json({ error: 'Failed to process image' });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CDN] Diabolical CDN server running on port ${PORT}`);
});

module.exports = app;
