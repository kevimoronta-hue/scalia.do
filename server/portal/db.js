/* ==========================================================================
   Scalia Portal · database access (PostgreSQL)
     query(sql, params)  → rows
     one(sql, params)    → first row or null
     transaction(fn)     → fn(tx) inside BEGIN/COMMIT, ROLLBACK on error;
                           tx has the same query / one
   Production: the `pg` driver on the Vercel Postgres connection string
   (small pool: one per warm function instance).
   PORTAL_MOCK=1: PGlite, a real PostgreSQL compiled to WebAssembly, on a
   local folder. Same SQL, same migrations, same constraints: the local
   tests exercise the real queries.
   Repositories (server/portal/repositories/) are the only callers.
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const config = require('./config');

let backend = null;

function pgBackend() {
  const { Pool } = require('pg');
  const url = config.databaseUrl();
  if (!url) { const e = new Error('NOT_CONFIGURED'); e.code = 'NOT_CONFIGURED'; e.status = 503; throw e; }
  const pool = new Pool({ connectionString: url, max: 3, idleTimeoutMillis: 10000, connectionTimeoutMillis: 8000 });
  pool.on('error', e => console.error('[portal] db pool', e.code || e.message));
  return {
    async query(sql, params) { return (await pool.query(sql, params)).rows; },
    async transaction(fn) {
      const c = await pool.connect();
      try {
        await c.query('begin');
        const out = await fn({ query: async (s, p) => (await c.query(s, p)).rows });
        await c.query('commit');
        return out;
      } catch (e) {
        try { await c.query('rollback'); } catch (r) { /* connection gone */ }
        throw e;
      } finally { c.release(); }
    },
    async close() { await pool.end(); }
  };
}

// The package name is assembled so Vercel's bundler never ships PGlite in a
// production function (it is a devDependency, local tests only).
function pgliteBackend() {
  const dir = path.join(config.mockDir(), 'pgdata');
  fs.mkdirSync(dir, { recursive: true });
  const { PGlite } = require(['@electric-sql', 'pglite'].join('/'));
  const db = new PGlite(dir);
  let ready = null;
  let queue = Promise.resolve();
  // One connection: transactions are serialized so they never interleave.
  function serial(fn) { const p = queue.then(fn, fn); queue = p.catch(() => {}); return p; }
  const api = {
    async query(sql, params) { await ready; return (await db.query(sql, params)).rows; },
    async transaction(fn) {
      await ready;
      return serial(() => db.transaction(tx => fn({ query: async (s, p) => (await tx.query(s, p)).rows })));
    },
    async close() { await db.close(); }
  };
  ready = db.waitReady.then(() => require('./migrate').migrate({ query: (s, p) => db.query(s, p).then(r => r.rows), exec: s => db.exec(s) }));
  return api;
}

function get() {
  if (!backend) backend = config.mock() ? pgliteBackend() : pgBackend();
  return backend;
}

const query = (sql, params) => get().query(sql, params || []);
async function one(sql, params) { return (await query(sql, params))[0] || null; }
function transaction(fn) {
  return get().transaction(tx => fn({ query: (s, p) => tx.query(s, p || []), one: async (s, p) => (await tx.query(s, p || []))[0] || null }));
}
async function close() { if (backend) { const b = backend; backend = null; await b.close(); } }

// The object repositories receive: the pool, or a transaction.
const pool = { query, one };

module.exports = { query, one, transaction, close, pool };
