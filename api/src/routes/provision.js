const router = require('express').Router();
const crypto = require('crypto');
const db = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

/**
 * Setting up a whole client in one call.
 *
 * Another system — the booking product — creates a salon and needs her storage
 * to exist a second later: a client, two projects, and a key for each. Doing it
 * as five separate calls meant that when the third one failed there was a
 * client with one project, an orphan, and no way for the caller to know what to
 * undo. Half a client is worse than none: her photos go somewhere nobody looks.
 *
 * So it is one call, in one transaction, and it either all happened or none of
 * it did.
 *
 * Two projects and not one with subfolders because paths here are flat —
 * "<project>/<file>", no levels. The project is the only separation there is,
 * and these two need separating: the key that writes reference photos is used
 * by people who are not signed in, and must not be able to overwrite the
 * client's own pictures.
 */

function generateApiKey() {
    return (
        'dmm_' +
        crypto.randomBytes(24).toString('base64').replace(/[+/=]/g, '').slice(0, 32)
    );
}

function toSlug(value) {
    return String(value).toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

// POST /api/provision
router.post('/', authenticateToken, authorizeRoles('admin', 'service'), async (req, res, next) => {
    const { name, slug } = req.body;

    if (!name || !slug) {
        return res.status(400).json({ error: 'name and slug are required' });
    }

    const clientSlug = toSlug(slug);
    const mediaSlug = clientSlug;
    const referenceSlug = `${clientSlug}-referencias`;

    const connection = await db.pool.connect();

    try {
        await connection.query('BEGIN');

        /*
         * Idempotent from here down.
         *
         * The caller is an automation, and automations retry: a timeout on our
         * side looks identical to a failure, so the same request arrives twice.
         * Without this, the second attempt either fails on a unique constraint
         * or quietly creates a second client with the same name — and nobody
         * finds out until two salons are writing into folders nobody expected.
         *
         * Re-running returns what already exists instead, so a retry is safe
         * and the answer is always the same.
         */
        const existingClient = await connection.query(
            'SELECT * FROM clients WHERE slug = $1',
            [clientSlug]
        );

        const client = existingClient.rows[0]
            ? existingClient.rows[0]
            : (
                  await connection.query(
                      'INSERT INTO clients (name, slug) VALUES ($1, $2) RETURNING *',
                      [name, clientSlug]
                  )
              ).rows[0];

        const project = async (projectSlug, projectName) => {
            const existing = await connection.query(
                'SELECT * FROM projects WHERE client_id = $1 AND slug = $2',
                [client.id, projectSlug]
            );
            if (existing.rows[0]) return existing.rows[0];

            const created = await connection.query(
                'INSERT INTO projects (client_id, name, slug) VALUES ($1, $2, $3) RETURNING *',
                [client.id, projectName, projectSlug]
            );
            return created.rows[0];
        };

        const media = await project(mediaSlug, `${name} — media`);
        const references = await project(referenceSlug, `${name} — referencias`);

        /*
         * A key is only minted when the project has none.
         *
         * Handing back a fresh key on every retry would leave the caller holding
         * one while older ones stayed valid for ever, and the client would
         * accumulate live credentials nobody is using. Reusing the existing one
         * is what makes calling this twice the same as calling it once.
         */
        const keyFor = async (projectRow, keyName) => {
            const existing = await connection.query(
                `SELECT key FROM api_keys
                  WHERE project_id = $1 AND scope = 'project'
                  ORDER BY created_at ASC LIMIT 1`,
                [projectRow.id]
            );
            if (existing.rows[0]) return existing.rows[0].key;

            const created = await connection.query(
                `INSERT INTO api_keys (project_id, client_id, name, key, scope)
                 VALUES ($1, $2, $3, $4, 'project')
                 RETURNING key`,
                [projectRow.id, client.id, keyName, generateApiKey()]
            );
            return created.rows[0].key;
        };

        const mediaKey = await keyFor(media, `${name} — media`);
        const referenceKey = await keyFor(references, `${name} — referencias`);

        await connection.query('COMMIT');

        res.status(201).json({
            client: { id: client.id, name: client.name, slug: client.slug },
            projects: {
                media: { id: media.id, slug: media.slug, key: mediaKey },
                references: { id: references.id, slug: references.slug, key: referenceKey },
            },
        });
    } catch (error) {
        await connection.query('ROLLBACK').catch(() => {});
        next(error);
    } finally {
        connection.release();
    }
});

module.exports = router;
