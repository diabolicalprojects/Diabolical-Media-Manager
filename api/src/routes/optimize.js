const router = require('express').Router();
const multer = require('multer');
const sharp = require('sharp');

// Protect against decompression DDoS by limiting file size to 20MB
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/webp',
            'image/gif',
            'image/tiff',
            'image/avif'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`File type ${file.mimetype} is not supported.`), false);
        }
    }
});

// POST /api/v1/optimize
router.post('/', (req, res, next) => {
    upload.single('image')(req, res, async (err) => {
        if (err) {
            // Handle Multer errors (like fileSize limit) or fileFilter rejection
            return res.status(422).json({ error: err.message });
        }

        try {
            if (!req.file) {
                return res.status(422).json({ error: 'No image file uploaded or parameter "image" is missing.' });
            }

            const originalBuffer = req.file.buffer;
            const originalSize = originalBuffer.length;

            // Extract quality and width from request body (Form-Data)
            const qualityInput = req.body.quality ? parseInt(req.body.quality, 10) : 80;
            const quality = (qualityInput >= 1 && qualityInput <= 100) ? qualityInput : 80;
            const width = req.body.width ? parseInt(req.body.width, 10) : null;

            // Pipeline processing
            let pipeline = sharp(originalBuffer);

            if (width && !isNaN(width)) {
                pipeline = pipeline.resize({
                    width: width,
                    withoutEnlargement: true // Avoid pixelation if original is smaller
                });
            }

            const optimizedBuffer = await pipeline
                .webp({
                    quality: quality,
                    effort: 4, // Optimal speed vs compression tradeoff
                    lossless: false
                })
                .toBuffer();

            const optimizedSize = optimizedBuffer.length;
            
            // Calculate saving percentage
            const savingPercent = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);
            
            // Set headers matching specifications
            res.set({
                'Content-Type': 'image/webp',
                'Cache-Control': 'public, max-age=31536000, immutable',
                'X-Optimizer-Saving': `${savingPercent}%`
            });

            return res.send(optimizedBuffer);

        } catch (error) {
            console.error('[Optimizer Error]', error.message);
            // Handle corrupt or invalid files cleanly as per spec section 6.3
            return res.status(422).json({ error: 'Invalid or corrupted image file.' });
        }
    });
});

module.exports = router;
