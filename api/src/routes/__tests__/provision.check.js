/**
 * Checks that provisioning a client twice is the same as doing it once.
 *
 * The caller is an automation, and automations retry: a timeout on our side is
 * indistinguishable from a failure, so the same request arrives again. The
 * dangerous outcome is not an error — it is a second client with the same name,
 * or a second key while the first stays valid, with nobody aware either
 * happened.
 *
 * Run with: npm run check:provision
 */
const path = require('path');
const Module = require('module');

let fallos = 0;
const check = (nombre, ok, detalle) => {
    if (!ok) fallos++;
    console.log(`${ok ? 'PASS ' : 'FALLA'}  ${nombre} — ${detalle}`);
};

/**
 * A database that answers from a table of rows held in memory.
 *
 * Only the shapes this route actually asks for. Enough to tell "it inserted"
 * from "it found what was already there", which is the whole question.
 */
function fakeDb(existing = {}) {
    const state = {
        clients: existing.clients ? [...existing.clients] : [],
        projects: existing.projects ? [...existing.projects] : [],
        keys: existing.keys ? [...existing.keys] : [],
    };
    const log = [];
    let id = 0;
    const nextId = () => `id-${++id}`;

    const query = async (text, params = []) => {
        const sql = text.replace(/\s+/g, ' ').trim();
        log.push(sql.split(' ').slice(0, 3).join(' '));

        if (/^BEGIN|^COMMIT|^ROLLBACK/.test(sql)) return { rows: [] };

        if (sql.startsWith('SELECT * FROM clients WHERE slug')) {
            return { rows: state.clients.filter(c => c.slug === params[0]) };
        }
        if (sql.startsWith('INSERT INTO clients')) {
            const row = { id: nextId(), name: params[0], slug: params[1] };
            state.clients.push(row);
            return { rows: [row] };
        }
        if (sql.startsWith('SELECT * FROM projects WHERE client_id')) {
            return {
                rows: state.projects.filter(
                    p => p.client_id === params[0] && p.slug === params[1]
                ),
            };
        }
        if (sql.startsWith('INSERT INTO projects')) {
            const row = { id: nextId(), client_id: params[0], name: params[1], slug: params[2] };
            state.projects.push(row);
            return { rows: [row] };
        }
        if (sql.startsWith('SELECT key FROM api_keys')) {
            return { rows: state.keys.filter(k => k.project_id === params[0]) };
        }
        if (sql.startsWith('INSERT INTO api_keys')) {
            const row = { project_id: params[0], client_id: params[1], key: params[3] };
            state.keys.push(row);
            return { rows: [row] };
        }

        throw new Error(`La prueba no sabe responder a: ${sql.slice(0, 70)}`);
    };

    return {
        state,
        log,
        query,
        pool: { connect: async () => ({ query, release() {} }) },
    };
}

/** Loads the route with our fake database in place of the real one. */
function loadRoute(db) {
    const dbPath = require.resolve('../../config/database');
    const authPath = require.resolve('../../middleware/auth');
    for (const p of [dbPath, authPath, require.resolve('../provision')]) delete require.cache[p];

    require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: db };
    require.cache[authPath] = {
        id: authPath,
        filename: authPath,
        loaded: true,
        exports: {
            authenticateToken: (req, _res, next) => next(),
            authorizeRoles: () => (_req, _res, next) => next(),
        },
    };
    return require('../provision');
}

/** Runs POST / through the router and captures the response. */
function call(router, body) {
    return new Promise((resolve, reject) => {
        const layer = router.stack.find(l => l.route && l.route.path === '/');
        const handler = layer.route.stack[layer.route.stack.length - 1].handle;

        const req = { body, user: { role: 'service' } };
        const res = {
            statusCode: 200,
            status(code) {
                this.statusCode = code;
                return this;
            },
            json(payload) {
                resolve({ status: this.statusCode, body: payload });
            },
        };
        handler(req, res, error => reject(error ?? new Error('next() sin error')));
    });
}

(async () => {
    // ── Primera vez ──────────────────────────────────────────────────────────
    const db = fakeDb();
    const router = loadRoute(db);
    const primera = await call(router, { name: 'Salón de Ana', slug: 'ana' });

    check('crea la clienta', db.state.clients.length === 1, db.state.clients[0]?.slug);
    check(
        'crea exactamente dos proyectos',
        db.state.projects.length === 2,
        db.state.projects.map(p => p.slug).join(' y ')
    );
    check(
        'la carpeta de referencias es un proyecto aparte',
        db.state.projects[1].slug === 'ana-referencias',
        db.state.projects[1].slug
    );
    check('crea una clave por proyecto', db.state.keys.length === 2, `${db.state.keys.length} claves`);
    check(
        'las dos claves son distintas',
        db.state.keys[0].key !== db.state.keys[1].key,
        'no se repite'
    );
    check('responde 201', primera.status === 201, String(primera.status));
    check(
        'devuelve el valor de cada clave, no un objeto',
        typeof primera.body.projects.media.key === 'string' &&
            typeof primera.body.projects.references.key === 'string',
        typeof primera.body.projects.media.key
    );
    check('cierra la transacción', db.log.includes('COMMIT'), 'COMMIT');

    // ── Segunda vez, mismo salón ─────────────────────────────────────────────
    const segunda = await call(router, { name: 'Salón de Ana', slug: 'ana' });

    check('reintentar no duplica la clienta', db.state.clients.length === 1, '1 clienta');
    check('reintentar no duplica proyectos', db.state.projects.length === 2, '2 proyectos');
    check('reintentar no emite claves nuevas', db.state.keys.length === 2, '2 claves');
    check(
        'y devuelve exactamente lo mismo',
        JSON.stringify(primera.body) === JSON.stringify(segunda.body),
        'idéntico'
    );

    // ── El slug se limpia ────────────────────────────────────────────────────
    const db2 = fakeDb();
    const r2 = loadRoute(db2);
    const raro = await call(r2, { name: 'Uñas & Más', slug: 'Uñas & Más' });
    check(
        'un nombre con espacios y símbolos sale como slug válido',
        /^[a-z0-9-]+$/.test(raro.body.client.slug),
        raro.body.client.slug
    );
    check(
        'y la de referencias hereda ese slug',
        raro.body.projects.references.slug === `${raro.body.client.slug}-referencias`,
        raro.body.projects.references.slug
    );

    // ── Falta un campo ───────────────────────────────────────────────────────
    const db3 = fakeDb();
    const r3 = loadRoute(db3);
    const sinSlug = await call(r3, { name: 'Sin slug' });
    check('sin slug se rechaza', sinSlug.status === 400, String(sinSlug.status));
    check('y no toca la base de datos', db3.state.clients.length === 0, 'nada creado');

    // ── Algo falla a mitad ───────────────────────────────────────────────────
    const db4 = fakeDb();
    const original = db4.pool.connect;
    db4.pool.connect = async () => {
        const conexion = await original();
        let inserts = 0;
        const query = conexion.query;
        return {
            query: async (text, params) => {
                if (/INSERT INTO projects/.test(text) && ++inserts === 2) {
                    throw new Error('caída simulada al crear el segundo proyecto');
                }
                return query(text, params);
            },
            release() {},
        };
    };
    const r4 = loadRoute(db4);
    let falló = false;
    await call(r4, { name: 'Rota', slug: 'rota' }).catch(() => {
        falló = true;
    });
    check('una caída a mitad propaga el error', falló, 'no devuelve 201 fingido');
    check('y deshace la transacción', db4.log.includes('ROLLBACK'), 'ROLLBACK');

    console.log(fallos === 0 ? '\nTodo correcto.' : `\n${fallos} comprobación(es) fallida(s).`);
    process.exit(fallos === 0 ? 0 : 1);
})().catch(error => {
    console.error('La prueba reventó:', error);
    process.exit(1);
});
