/* ==========================================================================
   Scalia Portal · migrations runner
   Applies server/portal/migrations/NNN_name.sql in order, each one once,
   inside a transaction, and records it in schema_migrations. Used by
   scripts/portal-migrate.mjs (production database) and automatically by
   the local test database (PORTAL_MOCK=1).
   conn: { query(sql, params) → rows, exec(sql) } (exec: several statements).
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'migrations');

function files() {
  return fs.readdirSync(DIR).filter(f => /^\d{3}_[a-z0-9_]+\.sql$/.test(f)).sort();
}

async function migrate(conn, log) {
  await conn.exec('create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now())');
  const done = new Set((await conn.query('select version from schema_migrations')).map(r => r.version));
  const applied = [];
  for (const f of files()) {
    const version = f.replace(/\.sql$/, '');
    if (done.has(version)) continue;
    const sql = fs.readFileSync(path.join(DIR, f), 'utf8');
    try {
      await conn.exec('begin;\n' + sql + '\n;insert into schema_migrations (version) values (\'' + version + '\');\ncommit;');
    } catch (e) {
      try { await conn.exec('rollback;'); } catch (r) { /* nothing open */ }
      e.message = version + ': ' + e.message;
      throw e;
    }
    applied.push(version);
    if (log) log('applied ' + version);
  }
  return applied;
}

module.exports = { migrate, files };
