/* ==========================================================================
   Scalia · email reliability tests: applications sent once per submission
   (mail_events in Postgres), booking Message-IDs, no double send.
   Local only: test calendar + test "provider" (emails written as .eml),
   real PostgreSQL (PGlite) with the real migrations, fresh folders.
     npm run mail:test
   ========================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'scalia-mail-test-'));
const MAILDIR = path.join(TMP, 'mail');
Object.assign(process.env, { BOOKING_MOCK: '1', BOOKING_MOCK_DIR: MAILDIR, PORTAL_MOCK: '1', PORTAL_MOCK_DIR: path.join(TMP, 'db') });
for (const k of ['VERCEL', 'VERCEL_ENV', 'RESEND_API_KEY', 'DATABASE_URL', 'POSTGRES_URL']) delete process.env[k];
const require = createRequire(import.meta.url);
const db = require('../server/portal/db.js');
const events = require('../server/mail-events.js');
const mail = require('../server/mail.js');
const routes = { apply: require('../api/apply.js'), book: require('../api/book.js'), availability: require('../api/availability.js') };
const noise = console.log; console.log = (...a) => { if (!/^\[(mail|apply)\]/.test(String(a[0]))) noise(...a); };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://local');
  const m = url.pathname.match(/^\/api\/(apply|book|availability)\/?$/);
  if (!m) { res.statusCode = 404; return res.end(); }
  req.query = Object.fromEntries(url.searchParams);
  try { await routes[m[1]](req, res); } catch (e) { console.error(e); res.statusCode = 500; res.end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const B = 'http://127.0.0.1:' + server.address().port, ORIGIN = 'http://localhost:3001';

let pass = 0, fail = 0, ipN = 0;
const ok = (c, m) => { if (c) { pass++; if (process.env.VERBOSE) noise('PASS ' + m); } else { fail++; noise('FAIL ' + m); } };
const section = t => noise('\n· ' + t);

// The emails written by the test provider.
function mails() {
  return fs.existsSync(MAILDIR) ? fs.readdirSync(MAILDIR).filter(f => f.endsWith('.eml')).sort().map(f => {
    const raw = fs.readFileSync(path.join(MAILDIR, f), 'utf8');
    return { to: (raw.match(/^To: (.*)$/m) || [])[1], id: (raw.match(/^Message-ID: (.*)$/m) || [])[1], subject: (raw.match(/^Subject: (.*)$/m) || [])[1] };
  }) : [];
}
const failProvider = who => { fs.mkdirSync(MAILDIR, { recursive: true }); fs.writeFileSync(path.join(MAILDIR, 'mail-fail'), who || ''); };
const healProvider = () => { try { fs.unlinkSync(path.join(MAILDIR, 'mail-fail')); } catch (e) {} };

const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF');
function application(email, sid) {
  const fd = new FormData();
  const v = { firstName: 'Ana', lastName: 'Test', email, phone: '+33612345671', country: 'FR', city: 'Metz', role: 'Développeur', locale: 'fr', consent: '1', elapsed: '20000', website: '', linkedin: '', portfolio: '' };
  for (const k in v) fd.append(k, v[k]);
  for (let i = 1; i <= 12; i++) fd.append('q' + i, 'A');
  fd.append('cv', new Blob([PDF], { type: 'application/pdf' }), 'cv.pdf');
  if (sid) fd.append('submissionId', sid);
  return fd;
}
// Each request from its own address: the per-IP limit is not under test.
async function post(email, sid, signal) {
  const r = await fetch(B + '/api/apply/', { method: 'POST', headers: { Origin: ORIGIN, 'X-Forwarded-For': '10.9.0.' + (++ipN) }, body: application(email, sid), signal });
  return { s: r.status, d: await r.json().catch(() => ({})) };
}
const row = key => db.one('select status, attempts, provider, provider_message_id from mail_events where event_key = $1', [key]);
const uuid = () => crypto.randomUUID();
const wait = ms => new Promise(r => setTimeout(r, ms));

/* ------------------------------------------------------------ applications */
section('application: normal');
const s1 = uuid();
let n0 = mails().length;
let r = await post('normal@example.test', s1);
let got = mails().slice(n0);
ok(r.s === 201 && r.d.ok && !r.d.duplicate, '1 POST → 201');
ok(got.length === 2 && got.filter(m => m.to === 'contact@scalia.do').length === 1 && got.filter(m => m.to === 'normal@example.test').length === 1, '1 admin email + 1 candidate email');
ok(got.find(m => m.to === 'contact@scalia.do').id === '<apply-' + s1 + '-admin@scalia.do>' && got.find(m => m.to === 'normal@example.test').id === '<apply-' + s1 + '-candidate@scalia.do>', 'deterministic Message-IDs apply-<id>-admin / -candidate');
let ra = await row('apply:' + s1 + ':admin'), rc = await row('apply:' + s1 + ':candidate');
ok(ra.status === 'completed' && rc.status === 'completed' && ra.provider === 'mock' && ra.provider_message_id, 'mail_events: both completed, provider id recorded');

section('application: same submissionId again');
n0 = mails().length;
r = await post('normal@example.test', s1);
ok(r.s === 201 && r.d.ok && r.d.duplicate === true, 'second POST → success (duplicate)');
ok(mails().length === n0, 'no new email');

section('application: response lost, then retry');
const s2 = uuid();
n0 = mails().length;
// The answer is lost: the browser drops the connection as soon as the
// response starts, without reading it (the server has finished by then).
const ctrl = new AbortController();
const lostRes = await fetch(B + '/api/apply/', { method: 'POST', headers: { Origin: ORIGIN, 'X-Forwarded-For': '10.9.0.' + (++ipN) }, body: application('lost@example.test', s2), signal: ctrl.signal });
ctrl.abort();
const lostBody = await lostRes.text().then(() => 'read', e => e.name);
ok(lostBody === 'AbortError', 'first answer never read by the browser');
for (let i = 0; i < 40 && (await db.one('select count(*)::int as n from mail_events where event_key like $1 and status = $2', ['apply:' + s2 + ':%', 'completed'])).n < 2; i++) await wait(100);
ok(mails().length - n0 === 2, 'the server still sent both emails');
r = await post('lost@example.test', s2);
ok(r.s === 201 && r.d.duplicate === true, 'retry with the same id → success');
ok(mails().length - n0 === 2, 'retry sent nothing');

section('application: two simultaneous requests, same id');
const s3 = uuid();
n0 = mails().length;
const both = await Promise.all([post('race@example.test', s3), post('race@example.test', s3)]);
const codes = both.map(x => x.s).sort().join(',');
ok(both.every(x => x.d.ok) && (codes === '201,202' || codes === '201,201'), 'both answer success (' + codes + ')');
ok(both.filter(x => !x.d.duplicate && !x.d.pending).length === 1, 'exactly one request did the sending');
await wait(300);
ok(mails().length - n0 === 2, 'only 1 admin + 1 candidate email');
ok((await row('apply:' + s3 + ':admin')).attempts === 1, 'one claim (attempts = 1)');

section('application: new submissionId');
n0 = mails().length;
r = await post('normal@example.test', uuid());
ok(r.s === 201 && !r.d.duplicate && mails().length - n0 === 2, 'new id → normal send (2 emails)');

section('application: provider refuses before sending');
const s4 = uuid();
failProvider();
n0 = mails().length;
r = await post('retry@example.test', s4);
ok(r.s === 503 && mails().length === n0, 'provider error → 503, nothing sent');
ok((await row('apply:' + s4 + ':admin')).status === 'failed' && !(await row('apply:' + s4 + ':candidate')), 'admin event failed, candidate never attempted');
healProvider();
r = await post('retry@example.test', s4);
ra = await row('apply:' + s4 + ':admin');
ok(r.s === 201 && !r.d.duplicate && mails().length - n0 === 2 && ra.status === 'completed' && ra.attempts === 2, 'retry (same id) sends once: completed, attempts = 2');

section('application: admin email sent, receipt refused, retry');
const s5 = uuid();
failProvider('\r\nTo: receipt@example.test');   // the candidate's receipt only, not Scalia's email
n0 = mails().length;
r = await post('receipt@example.test', s5);
got = mails().slice(n0);
ok(r.s === 201 && got.length === 1 && got[0].to === 'contact@scalia.do', 'admin sent, receipt failed → still 201');
ok((await row('apply:' + s5 + ':admin')).status === 'completed' && (await row('apply:' + s5 + ':candidate')).status === 'failed', 'admin completed, candidate failed');
healProvider();
r = await post('receipt@example.test', s5);
got = mails().slice(n0);
ok(r.s === 201 && got.length === 2 && got.filter(m => m.to === 'contact@scalia.do').length === 1, 'retry: the admin email is NOT sent again, only the receipt');

section('application: email maybe sent (timeout), retry');
const s6 = uuid();
await db.query("insert into mail_events (event_key, event_type, recipient, status) values ($1, 'application_admin', 'contact@scalia.do', 'processing')", ['apply:' + s6 + ':admin']);
n0 = mails().length;
r = await post('pending@example.test', s6);
ok(r.s === 202 && r.d.ok && r.d.pending && mails().length === n0, '"processing" → 202 received, nothing sent');

section('application: page without submissionId (cached old page)');
n0 = mails().length;
r = await post('legacy@example.test', null);
ok(r.s === 201 && mails().length - n0 === 2, 'still accepted and sent (no deduplication possible)');

/* -------------------------------------------------------------- once() */
section('mail_events: provider accepted, then recording fails');
const realMark = events.mark;
let sends = 0;
events.mark = async () => { throw new Error('db write failed'); };
let o = await events.once({ key: 'unit:mark-fails', type: 'application_admin', recipient: 'x@y.z' }, async () => { sends++; return { provider: 'mock', id: '1' }; });
events.mark = realMark;
ok(o.status === 'completed' && sends === 1 && (await row('unit:mark-fails')).status === 'processing', 'email sent, row left "processing"');
o = await events.once({ key: 'unit:mark-fails', type: 'application_admin', recipient: 'x@y.z' }, async () => { sends++; return {}; });
ok(o.status === 'duplicate' && sends === 1, 'retry does NOT send it again');

section('mail_events: no answer from the provider (timeout)');
sends = 0;
await events.once({ key: 'unit:timeout', type: 'application_admin', recipient: '' }, async () => { sends++; const e = new Error('google_timeout'); e.code = 'TIMEOUT'; throw e; }).catch(() => {});
ok((await row('unit:timeout')).status === 'processing', 'timeout leaves "processing" (maybe sent)');
o = await events.once({ key: 'unit:timeout', type: 'application_admin', recipient: '' }, async () => { sends++; return {}; });
ok(o.status === 'duplicate' && sends === 1, 'never resent automatically');

section('mail_events: database unreachable / not configured');
const realClaim = events.claim;
events.claim = async () => { throw Object.assign(new Error('connection refused'), { code: 'ECONNREFUSED' }); };
sends = 0;
o = await events.once({ key: 'unit:db-down', type: 'application_admin', recipient: '' }, async () => { sends++; return { provider: 'mock' }; });
events.claim = realClaim;
ok(o.status === 'sent' && sends === 1, 'database down: the email still leaves (fail open, logged)');
delete process.env.PORTAL_MOCK;
sends = 0;
o = await events.once({ key: 'unit:no-db', type: 'application_admin', recipient: '' }, async () => { sends++; return { provider: 'mock' }; });
process.env.PORTAL_MOCK = '1';
ok(o.status === 'sent' && sends === 1, 'no database configured: sent as before');

/* ---------------------------------------------------------------- booking */
section('booking');
const avail = await (await fetch(B + '/api/availability/?tz=Europe%2FParis')).json();
const slot = avail.slots[2];
const body = JSON.stringify({ start: slot, timezone: 'Europe/Paris', locale: 'fr', name: 'Booking Test', email: 'booking@example.test', phone: '+33612345670', company: '', message: '', phoneDial: '', projectTypes: ['landing_page'], website: '', elapsed: 5000 });
const book = ip => fetch(B + '/api/book/', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: ORIGIN, 'X-Forwarded-For': ip }, body }).then(async x => ({ s: x.status, d: await x.json() }));
n0 = mails().length;
const pair = await Promise.all([book('10.8.0.1'), book('10.8.0.2')]);
await wait(200);
got = mails().slice(n0);
ok(pair.map(x => x.s).sort().join(',') === '201,409', 'two identical bookings at once: one 201, one 409 (slot lock kept)');
ok(got.length === 2, 'two emails only (client + Scalia)');
const cid = (got.find(m => m.to === 'booking@example.test') || {}).id, aid = (got.find(m => m.to === 'contact@scalia.do') || {}).id;
const ev = cid && cid.match(/^<booking-(.+)-client@scalia\.do>$/);
ok(ev && aid === '<booking-' + ev[1] + '-admin@scalia.do>', 'client / admin Message-IDs: same event id, distinct roles');
ok(mail.messageId('booking', ev && ev[1], 'client') === cid && mail.messageId('booking', ev && ev[1], 'client') === mail.messageId('booking', ev && ev[1], 'client'), 'Message-ID stable for the same event');
ok(got.find(m => m.to === 'booking@example.test').subject && /scalia\.ics/.test(fs.readFileSync(path.join(MAILDIR, fs.readdirSync(MAILDIR).filter(f => f.endsWith('.eml')).sort().slice(n0).find(f => fs.readFileSync(path.join(MAILDIR, f), 'utf8').match(/^To: booking@example\.test$/m))), 'utf8')), 'client email keeps its .ics');

noise('\n' + pass + ' passed, ' + fail + ' failed');
server.close();
await db.close();
fs.rmSync(TMP, { recursive: true, force: true });
process.exit(fail ? 1 : 0);
