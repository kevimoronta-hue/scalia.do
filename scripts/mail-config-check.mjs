/* ==========================================================================
   Scalia · email configuration check (read-only, nothing is sent)
     npm run mail:check
   Reads the environment or .env.local (`vercel env pull .env.local` brings
   the production values). Prints which provider sends what, the sender and
   notification addresses, and, when a database is reachable, the recent
   mail_events (statuses, rows stuck in "processing").
   Secrets are never printed: only configured / missing.
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

const has = k => (process.env[k] ? 'configured' : 'missing');
const { BOOKING } = require('../server/config.js');
const resend = !!process.env.RESEND_API_KEY;
const google = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY ? 'service account' : process.env.GOOGLE_REFRESH_TOKEN ? 'oauth' : 'missing';

console.log('\nProviders');
console.log('  RESEND_API_KEY          ' + has('RESEND_API_KEY'));
console.log('  Google credentials      ' + google + (process.env.GOOGLE_IMPERSONATE ? ' (acting as ' + process.env.GOOGLE_IMPERSONATE + ')' : ''));
console.log('  booking / receipts      ' + (resend ? 'Resend' : 'Gmail'));
console.log('  applications (CV)       ' + (resend ? 'Resend' : 'Gmail (upload endpoint)'));
console.log('  portal emails           ' + (resend ? 'Resend' : 'Gmail'));
console.log('\nAddresses');
console.log('  BOOKING_FROM            ' + BOOKING.fromEmail + (process.env.BOOKING_FROM ? '' : ' (default)'));
console.log('  BOOKING_NOTIFY          ' + BOOKING.notifyEmail + (process.env.BOOKING_NOTIFY ? '' : ' (default)'));
if (BOOKING.fromEmail.toLowerCase() === BOOKING.notifyEmail.toLowerCase()) {
  console.log('  ! same address: Scalia notices are self-sent (one email, copies in Sent and Inbox).');
  console.log('    If duplicates persist, check in Google Admin whether ' + BOOKING.notifyEmail + ' is an alias, a group or forwarded.');
}

console.log('\nDeduplication (mail_events)');
const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
console.log('  database                ' + (dbUrl ? 'configured' : process.env.PORTAL_MOCK === '1' ? 'local test database' : 'missing (emails sent without deduplication)'));
let portalDb = null;
try { portalDb = require('../server/portal/db.js'); } catch (e) { console.log('  database layer not installed yet (comes with the client portal)'); }
if (portalDb && (dbUrl || process.env.PORTAL_MOCK === '1')) {
  const db = portalDb;
  try {
    const rows = await db.query("select event_type, status, count(*)::int as n from mail_events where created_at > now() - interval '30 days' group by 1, 2 order by 1, 2");
    if (!rows.length) console.log('  no email recorded in the last 30 days');
    rows.forEach(r => console.log('  ' + (r.event_type + ' ').padEnd(24) + (r.status + ' ').padEnd(12) + r.n));
    const stuck = await db.query("select event_key, event_type, updated_at from mail_events where status = 'processing' and updated_at < now() - interval '15 minutes' order by updated_at desc limit 20");
    if (stuck.length) {
      console.log('\n  Sent without confirmation (timeout): check the mailbox, then mark them by hand.');
      stuck.forEach(r => console.log('  ' + r.event_type + '  ' + r.event_key.replace(/([0-9a-f]{8})-[0-9a-f-]{27}/i, '$1…') + '  ' + new Date(r.updated_at).toISOString()));
    }
  } catch (e) {
    console.log('  could not read mail_events (' + (e.code || e.message) + '): run npm run portal:migrate');
  } finally { await db.close(); }
}
console.log('');
