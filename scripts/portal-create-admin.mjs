/* ==========================================================================
   Scalia Portal · create the FIRST admin (bootstrap, one time)
     npm run portal:create-admin -- --email you@scalia.do --name "First Last" [--locale fr]
   Refuses as soon as an admin exists: no permanent back door. No password
   is passed or stored here: the script prints a one-time link (24 h) where
   the admin chooses their own password. More admins: see PORTAL.md.
   Uses DATABASE_URL from the environment or .env.local; PORTAL_MOCK=1 for
   the local test database (stop the local server first: one process at a
   time on that database).
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

const args = {};
for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const email = String(args.email || '').trim().toLowerCase();
const name = String(args.name || '').trim();
const locale = ['es', 'fr', 'en'].includes(args.locale) ? args.locale : 'fr';
if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email) || !name) {
  console.error('Usage: npm run portal:create-admin -- --email you@scalia.do --name "First Last" [--locale fr|es|en]');
  process.exit(1);
}

const db = require('../server/portal/db.js');
const auth = require('../server/portal/auth.js');
const users = require('../server/portal/repositories/users.js');
const site = (process.env.PORTAL_SITE_URL || (process.env.PORTAL_MOCK === '1' ? 'http://localhost:3001' : 'https://scalia.do')).replace(/\/+$/, '');

try {
  const token = await db.transaction(async tx => {
    if (await users.adminExists(tx)) throw new Error('An admin already exists: bootstrap is closed. Add admins as described in PORTAL.md.');
    if (await users.byEmail(tx, email)) throw new Error('This email already has an account.');
    const parts = name.split(/\s+/);
    const u = await users.create(tx, { email, role: 'admin', preferred_locale: locale, first_name: parts.shift(), last_name: parts.join(' ') });
    return auth.issueToken(tx, u.id, 'invite', null);
  });
  console.log('\nAdmin created (inactive until the password is chosen).');
  console.log('Open this link within 24 h to choose the password:\n\n  ' + site + '/portal/welcome/?token=' + token + '&lang=' + locale + '\n');
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await db.close();
}
