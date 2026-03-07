require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const db = require('./config/database');
const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const projectRoutes = require('./routes/projects');
const domainRoutes = require('./routes/domains');
const imageRoutes = require('./routes/images');
const tagRoutes = require('./routes/tags');
const userRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure storage directories exist
const storagePath = process.env.STORAGE_PATH || '/storage';
const dirs = [
    path.join(storagePath, 'clients'),
    path.join(storagePath, 'cache'),
];
dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'diabolical-media-manager-api', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/domains', domainRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/users', userRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('[API Error]', err.stack);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
});

// Serve static files for CDN
app.use('/', express.static(path.join(storagePath, 'clients'), {
    maxAge: '30d',
    immutable: true
}));

// Route for dynamic transformations if file not found statically
app.use('/:client/:filename', async (req, res, next) => {
    // Basic fallback or custom image transformer
    res.status(404).json({ error: 'Endpoint not found or file does not exist' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`[API] Diabolical Media Manager API running on port ${PORT}`);
});

module.exports = app;
