require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function seed() {
    try {
        console.log('[Seed] Seeding database...');

        // Create default admin user
        const passwordHash = await bcrypt.hash('admin123', 12);
        await pool.query(
            `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING`,
            ['Admin', 'admin@diabolicalservices.tech', passwordHash, 'admin']
        );

        console.log('[Seed] Default admin user created (email: admin@diabolicalservices.tech, password: admin123)');
        console.log('[Seed] Seeding completed');
    } catch (error) {
        console.error('[Seed] Error:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

seed();
