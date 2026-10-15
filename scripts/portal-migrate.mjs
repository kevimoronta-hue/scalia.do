/* ==========================================================================
   Scalia Portal · apply the database migrations (server/portal/migrations)
     npm run portal:migrate
   Reads DATABASE_URL (or POSTGRES_URL) from the environment or .env.local
   (`vercel env pull .env.local` writes it). Each migration runs once, in a
   transaction, recorded in schema_migrations. Safe to run again.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
try {
  for (const line of fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])([\s\S]*)\1$/, '$2');
  }
} catch (e) { /* no .env.local */ }

const config = require('../server/portal/config.js');
const { migrate } = require('../server/portal/migrate.js');

if (config.mock()) {
  // The local test database migrates itself when it opens.
  const db = require('../server/portal/db.js');
  await db.query('select 1');
  console.log('Local test database ready (' + config.mockDir() + ')');
  await db.close();
} else {
  const url = config.migrationUrl();
  if (!url) { console.error('DATABASE_URL is missing (vercel env pull .env.local).'); process.exit(1); }
  const { Client } = require('pg');
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const applied = await migrate({ query: async (s, p) => (await client.query(s, p)).rows, exec: s => client.query(s) }, m => console.log(m));
    console.log(applied.length ? 'Done.' : 'Already up to date.');
  } finally { await client.end(); }
}
