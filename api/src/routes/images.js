const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const sharp = require('sharp');
const db = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const STORAGE_PATH = process.env.STORAGE_PATH || '/storage';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 52428800; // 50MB

// Multer configuration
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif', 'image/svg+xml', 'image/tiff'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`File type ${file.mimetype} not allowed`), false);
        }
    },
});

// Helper: calculate SHA256 hash
function calculateHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

// Helper: slugify filename
function slugify(filename) {
    const ext = path.extname(filename);
    const baseName = path.basename(filename, ext);
    return baseName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

// Helper: ensure directory exists
function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

// POST /api/images/upload
router.post('/upload', authenticateToken, authorizeRoles('admin', 'editor'), upload.array('images', 20), async (req, res, next) => {
    try {
        const { client_id, project_id, domain_id } = req.body;

        if (!client_id) {
            return res.status(400).json({ error: 'client_id is required' });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        // Get client slug
        const clientResult = await db.query('SELECT slug FROM clients WHERE id = $1', [client_id]);
        if (clientResult.rows.length === 0) {
            return res.status(404).json({ error: 'Client not found' });
        }
        const clientSlug = clientResult.rows[0].slug;

        // Get domain if provided
        let domainName = 'general';
        if (domain_id) {
            const domainResult = await db.query('SELECT domain FROM domains WHERE id = $1', [domain_id]);
            if (domainResult.rows.length > 0) {
                domainName = domainResult.rows[0].domain;
            }
        }

        const uploaded = [];
        const duplicates = [];

        for (const file of req.files) {
            const hash = calculateHash(file.buffer);

            // Check for duplicate
            const existingImage = await db.query('SELECT * FROM images WHERE hash = $1', [hash]);
            if (existingImage.rows.length > 0) {
                duplicates.push({
                    filename: file.originalname,
                    existing: existingImage.rows[0],
                });
                continue;
            }

            // Get image metadata
            let metadata = {};
            try {
                metadata = await sharp(file.buffer).metadata();
            } catch (e) {
                // SVG or unsupported format for metadata
                metadata = { width: null, height: null, format: path.extname(file.originalname).slice(1) };
            }

            const slug = slugify(file.originalname);
            const originalDir = path.join(STORAGE_PATH, 'clients', clientSlug, domainName, 'original');
            const optimizedDir = path.join(STORAGE_PATH, 'clients', clientSlug, domainName, 'optimized');
            ensureDir(originalDir);
            ensureDir(optimizedDir);

            // Save original
            const ext = path.extname(file.originalname);
            const filename = `${slug}${ext}`;
            const filePath = path.join(originalDir, filename);
            fs.writeFileSync(filePath, file.buffer);

            // Generate optimized versions (Phase 3 pipeline)
            const sizes = [1920, 1280, 768, 480];
            const formats = ['webp', 'avif'];

            for (const format of formats) {
                try {
                    // Full-size optimized
                    await sharp(file.buffer)
                        .toFormat(format, { quality: 80 })
                        .toFile(path.join(optimizedDir, `${slug}.${format}`));

                    // Responsive sizes
                    for (const size of sizes) {
                        if (metadata.width && metadata.width >= size) {
                            await sharp(file.buffer)
                                .resize(size)
                                .toFormat(format, { quality: 80 })
                                .toFile(path.join(optimizedDir, `${slug}-${size}.${format}`));
                        }
                    }
                } catch (e) {
                    console.warn(`[Optimize] Could not generate ${format} for ${filename}:`, e.message);
                }
            }

            // Store in database
            const relativePath = path.join('clients', clientSlug, domainName, 'original', filename);
            const result = await db.query(
                `INSERT INTO images (client_id, project_id, domain_id, filename, slug, path, hash, size, width, height, format)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
                [client_id, project_id || null, domain_id || null, filename, slug, relativePath, hash, file.size, metadata.width, metadata.height, metadata.format]
            );

            uploaded.push(result.rows[0]);
        }

        res.status(201).json({
            uploaded,
            duplicates,
            summary: {
                total: req.files.length,
                uploaded: uploaded.length,
                duplicates: duplicates.length,
            },
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/images
router.get('/', authenticateToken, async (req, res, next) => {
    try {
        const { client_id, project_id, domain_id, page = 1, limit = 50 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = `
      SELECT i.*, c.name as client_name, c.slug as client_slug,
             p.name as project_name,
             COALESCE(
               json_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL),
               '[]'
             ) as tags
      FROM images i
      JOIN clients c ON i.client_id = c.id
      LEFT JOIN projects p ON i.project_id = p.id
      LEFT JOIN image_tags it ON i.id = it.image_id
      LEFT JOIN tags t ON it.tag_id = t.id
    `;

        const conditions = [];
        const params = [];
        let paramIndex = 1;

        if (client_id) {
            conditions.push(`i.client_id = $${paramIndex++}`);
            params.push(client_id);
        }
        if (project_id) {
            conditions.push(`i.project_id = $${paramIndex++}`);
            params.push(project_id);
        }
        if (domain_id) {
            conditions.push(`i.domain_id = $${paramIndex++}`);
            params.push(domain_id);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ` GROUP BY i.id, c.name, c.slug, p.name ORDER BY i.created_at DESC`;
        query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(parseInt(limit), offset);

        const result = await db.query(query, params);

        // Get total count
        let countQuery = 'SELECT COUNT(*) FROM images i';
        if (conditions.length > 0) {
            countQuery += ' WHERE ' + conditions.join(' AND ');
        }
        const countResult = await db.query(countQuery, params.slice(0, conditions.length));
        const total = parseInt(countResult.rows[0].count);

        res.json({
            images: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/images/search
router.get('/search', authenticateToken, async (req, res, next) => {
    try {
        const { q, page = 1, limit = 50 } = req.query;
        if (!q) {
            return res.status(400).json({ error: 'Search query (q) is required' });
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const searchTerm = `%${q}%`;

        const result = await db.query(
            `SELECT i.*, c.name as client_name, c.slug as client_slug, p.name as project_name
       FROM images i
       JOIN clients c ON i.client_id = c.id
       LEFT JOIN projects p ON i.project_id = p.id
       WHERE i.filename ILIKE $1 
          OR i.slug ILIKE $1
          OR c.name ILIKE $1
          OR p.name ILIKE $1
       ORDER BY i.created_at DESC
       LIMIT $2 OFFSET $3`,
            [searchTerm, parseInt(limit), offset]
        );

        res.json({ images: result.rows, query: q });
    } catch (error) {
        next(error);
    }
});

// GET /api/images/:id
router.get('/:id', authenticateToken, async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT i.*, c.name as client_name, c.slug as client_slug,
              p.name as project_name,
              COALESCE(
                json_agg(json_build_object('id', t.id, 'name', t.name)) FILTER (WHERE t.id IS NOT NULL),
                '[]'
              ) as tags
       FROM images i
       JOIN clients c ON i.client_id = c.id
       LEFT JOIN projects p ON i.project_id = p.id
       LEFT JOIN image_tags it ON i.id = it.image_id
       LEFT JOIN tags t ON it.tag_id = t.id
       WHERE i.id = $1
       GROUP BY i.id, c.name, c.slug, p.name`,
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Image not found' });
        }

        res.json({ image: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/images/:id
router.delete('/:id', authenticateToken, authorizeRoles('admin'), async (req, res, next) => {
    try {
        // Get image info before deleting
        const imageResult = await db.query('SELECT * FROM images WHERE id = $1', [req.params.id]);
        if (imageResult.rows.length === 0) {
            return res.status(404).json({ error: 'Image not found' });
        }

        const image = imageResult.rows[0];

        // Delete original file
        const originalPath = path.join(STORAGE_PATH, image.path);
        if (fs.existsSync(originalPath)) {
            fs.unlinkSync(originalPath);
        }

        // Delete optimized files
        const dir = path.dirname(path.join(STORAGE_PATH, image.path)).replace('/original', '/optimized');
        if (fs.existsSync(dir)) {
            const optimizedFiles = fs.readdirSync(dir).filter(f => f.startsWith(image.slug));
            for (const file of optimizedFiles) {
                fs.unlinkSync(path.join(dir, file));
            }
        }

        // Delete from database
        await db.query('DELETE FROM images WHERE id = $1', [req.params.id]);

        res.json({ message: 'Image deleted' });
    } catch (error) {
        next(error);
    }
});

// POST /api/images/:id/tags
router.post('/:id/tags', authenticateToken, authorizeRoles('admin', 'editor'), async (req, res, next) => {
    try {
        const { tags } = req.body;
        if (!tags || !Array.isArray(tags)) {
            return res.status(400).json({ error: 'tags array is required' });
        }

        for (const tagName of tags) {
            // Create tag if not exists
            const tagResult = await db.query(
                'INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = $1 RETURNING id',
                [tagName.toLowerCase()]
            );
            const tagId = tagResult.rows[0].id;

            // Link tag to image
            await db.query(
                'INSERT INTO image_tags (image_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [req.params.id, tagId]
            );
        }

        res.json({ message: 'Tags added' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
