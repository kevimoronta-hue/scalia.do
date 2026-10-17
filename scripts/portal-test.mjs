/* ==========================================================================
   Scalia Portal · end-to-end tests (HTTP), on the local test backend:
   a real PostgreSQL (PGlite) with the real migrations, local private
   files, emails as .eml. Nothing external, a fresh empty database.
     npm run portal:test
   ========================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'scalia-portal-test-'));
process.env.PORTAL_MOCK = '1';
process.env.PORTAL_MOCK_DIR = DIR;
delete process.env.VERCEL; delete process.env.VERCEL_ENV;
const require = createRequire(import.meta.url);
const db = require('../server/portal/db.js');
const auth = require('../server/portal/auth.js');
const users = require('../server/portal/repositories/users.js');
const projects = require('../server/portal/repositories/projects.js');
const handlers = { portal: require('../api/portal.js'), 'portal-admin': require('../api/portal-admin.js') };
const middleware = (await import('data:text/javascript,' + encodeURIComponent(fs.readFileSync(path.join(ROOT, 'middleware.js'), 'utf8')))).default;

// The API exactly as Vercel runs it (req.query, Node req/res).
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://local');
  const m = url.pathname.match(/^\/api\/(portal|portal-admin)\/?$/);
  if (!m) { res.statusCode = 404; return res.end(); }
  req.query = Object.fromEntries(url.searchParams);
  try { await handlers[m[1]](req, res); } catch (e) { console.error(e); res.statusCode = 500; res.end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const B = 'http://127.0.0.1:' + server.address().port, O = { Origin: 'http://localhost:3001' };

const jar = () => ({ c: {} });
async function req(j, method, url, body, extra = {}) {
  const h = { ...extra };
  const ck = Object.entries(j.c).map(([k, v]) => k + '=' + v).join('; ');
  if (ck) h.Cookie = ck;
  if (body !== undefined && !(body instanceof Buffer)) { h['Content-Type'] = 'application/json'; body = JSON.stringify(body); }
  const r = await fetch((url.startsWith('http') ? '' : B) + url, { method, headers: h, body, redirect: 'manual' });
  for (const s of r.headers.getSetCookie()) {
    const [kv] = s.split(';'); const i = kv.indexOf('='); const k = kv.slice(0, i), v = kv.slice(i + 1);
    if (/Max-Age=0/.test(s)) delete j.c[k]; else j.c[k] = v;
  }
  const t = await r.text(); let d = null; try { d = JSON.parse(t); } catch { d = t.slice(0, 80); }
  return { s: r.status, d, loc: r.headers.get('location'), setCookie: r.headers.getSetCookie().join(' | ') };
}
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL ' + m); } if (c && process.env.VERBOSE) console.log('PASS ' + m); };
const section = t => console.log('\n· ' + t);

// Links from the .eml files written by the local backend.
function mails() {
  return fs.readdirSync(DIR).filter(f => f.endsWith('.eml')).sort().map(f => {
    const raw = fs.readFileSync(path.join(DIR, f), 'utf8');
    const parts = raw.split(/\r\n--alt_/);
    const text = parts.map(p => { const m = p.split('\r\n\r\n'); return /text\/plain/.test(m[0]) ? Buffer.from(m.slice(1).join('').replace(/\s/g, ''), 'base64').toString('utf8') : ''; }).join('');
    return { to: (raw.match(/^To: (.*)$/m) || [])[1], subject: (raw.match(/^Subject: (.*)$/m) || [])[1], text };
  });
}
const lastToken = to => { const m = mails().filter(x => x.to === to).pop(); const t = m && m.text.match(/[?&]token=([A-Za-z0-9_-]{43})/); return t && t[1]; };

/* ------------------------------------------------------------- bootstrap */
section('bootstrap + admin sign-in');
const adminToken = await db.transaction(async tx => {
  const u = await users.create(tx, { email: 'admin@scalia.test', role: 'admin', preferred_locale: 'fr', first_name: 'Scalia', last_name: 'Admin' });
  return auth.issueToken(tx, u.id, 'invite', null);
});
ok(await users.adminExists(db.pool), 'first admin created (bootstrap)');
const A = jar();
let r = await req(A, 'POST', '/api/portal/?a=accept', { token: adminToken, password: 'Admin-Test-2026' }, O);
ok(r.s === 200 && r.d.role === 'admin' && A.c.scalia_ps, 'admin chooses password through the one-time link');
ok(/HttpOnly/.test(r.setCookie) && /SameSite=Lax/.test(r.setCookie) && /Path=\//.test(r.setCookie) && /Max-Age=43200/.test(r.setCookie), 'session cookie: HttpOnly, SameSite=Lax, Path=/, 12 hours');
await req(A, 'POST', '/api/portal/?a=logout', {}, O);
r = await req(A, 'POST', '/api/portal/?a=login', { email: 'admin@scalia.test', password: 'Admin-Test-2026' }, O);
ok(r.s === 200 && r.d.role === 'admin', 'admin login');
r = await req(jar(), 'POST', '/api/portal/?a=login', { email: 'admin@scalia.test', password: 'wrong-password' }, O);
ok(r.s === 400 && r.d.error === 'INVALID_CREDENTIALS', 'wrong password refused');
r = await req(jar(), 'POST', '/api/portal/?a=login', { email: 'nobody@scalia.test', password: 'whatever-123' }, O);
ok(r.s === 400 && r.d.error === 'INVALID_CREDENTIALS', 'unknown email: same answer as a wrong password');

section('clients, projects, progress');
let c = await req(A, 'POST', '/api/portal-admin/?a=client-create', { company: 'Top Advertising', contactName: 'Ana Pérez', email: 'ana@top.test', phone: '+18095551234', locale: 'es', gender: 'f' }, O);
const cA = c.d;
const cB = (await req(A, 'POST', '/api/portal-admin/?a=client-create', { company: 'Client B', contactName: 'Bob Brown', email: 'bob@b.test', locale: 'en' }, O)).d;
ok(cA.id && cB.id && cA.mailSent, 'two clients created, invitation sent');
r = await req(A, 'POST', '/api/portal-admin/?a=client-create', { company: 'X', contactName: 'X', email: 'ANA@top.test', locale: 'es' }, O);
ok(r.d.error === 'EMAIL_EXISTS', 'duplicate email refused (case-insensitive)');
r = await req(A, 'POST', '/api/portal-admin/?a=client-create', { company: 'X', contactName: 'X', email: 'not-an-email', locale: 'es' }, O);
ok(r.d.error === 'INVALID' && r.d.field === 'email', 'invalid email refused');
r = await req(A, 'POST', '/api/portal-admin/?a=client-create', { company: 'X', contactName: 'X', email: 'x@x.test', locale: 'es', gender: 'x' }, O);
ok(r.d.error === 'INVALID' && r.d.field === 'gender', 'unknown salutation refused');
ok((await req(A, 'GET', '/api/portal-admin/?a=clients')).d.clients.find(x => x.id === cB.id).contacts[0].gender === '', 'salutation not given: neutral');
const team = (await req(A, 'GET', '/api/portal-admin/?a=clients')).d.team;
const pA = (await req(A, 'POST', '/api/portal-admin/?a=project-create', { organizationId: cA.id, name: 'Rediseño web', type: 'Sitio web', currency: 'EUR', totalAmount: '700', startDate: '2026-10-01', estimatedDeliveryDate: '2026-11-20', contactId: team[0].id, preferredLocale: 'es' }, O)).d;
const pB = (await req(A, 'POST', '/api/portal-admin/?a=project-create', { organizationId: cB.id, name: 'B secret project', currency: 'USD', totalAmount: '1200' }, O)).d;
ok(pA.id && pB.id && pA.total_amount === 700, 'projects created with their 5 stages');
r = await req(A, 'POST', '/api/portal-admin/?a=project-create', { organizationId: cA.id, name: 'x', totalAmount: '-5' }, O);
ok(r.d.error === 'INVALID', 'negative amount refused');
r = await req(A, 'POST', '/api/portal-admin/?a=project-create', { organizationId: cA.id, name: 'x', totalAmount: '10', contactId: cA.userId }, O);
ok(r.d.error === 'INVALID' && r.d.field === 'contactId', 'a client cannot be set as Scalia contact');
await req(A, 'POST', '/api/portal-admin/?a=stage-update', { projectId: pA.id, stage: 'brief', status: 'completed' }, O);
await req(A, 'POST', '/api/portal-admin/?a=stage-update', { projectId: pA.id, stage: 'mockup', status: 'completed' }, O);
r = await req(A, 'POST', '/api/portal-admin/?a=quick-update', { projectId: pA.id, stage: 'development', stageStatus: 'in_progress', progress: 70, update: 'Homepage finalizada.', nextStep: 'Integración mobile.' }, O);
ok(r.s === 200 && r.d.stage.progress === 54 && r.d.stage.currentStage === 'development', 'quick update: 2 stages done + 70 % = 54 %');
r = await req(A, 'POST', '/api/portal-admin/?a=stage-update', { projectId: pA.id, stage: 'review', progress: 101 }, O);
ok(r.d.error === 'INVALID', 'progress above 100 refused');
r = await req(A, 'POST', '/api/portal-admin/?a=stage-update', { projectId: pA.id, stage: 'design', progress: 10 }, O);
ok(r.d.error === 'INVALID', 'unknown stage refused');

section('payments (integer cents)');
await req(A, 'POST', '/api/portal-admin/?a=payment-add', { projectId: pA.id, label: 'Anticipo', amount: '350', status: 'paid', paidAt: '2026-10-12' }, O);
await req(A, 'POST', '/api/portal-admin/?a=payment-add', { projectId: pA.id, label: 'Saldo', amount: '350', status: 'pending' }, O);
r = await req(A, 'POST', '/api/portal-admin/?a=payment-add', { projectId: pA.id, label: 'x', amount: '10.999', status: 'paid' }, O);
ok(r.d.error === 'INVALID', 'more than 2 decimals refused');
r = await req(A, 'POST', '/api/portal-admin/?a=payment-add', { projectId: pA.id, label: 'x', amount: '10', currency: 'USD', status: 'paid' }, O);
ok(r.d.error === 'INVALID' && r.d.field === 'currency', 'payment in another currency refused');
r = await req(A, 'POST', '/api/portal-admin/?a=project-update', { id: pA.id, fields: { currency: 'USD' } }, O);
ok(r.d.error === 'CURRENCY_LOCKED', 'currency locked after a payment');
for (const a of ['100.10', '200,20']) await req(A, 'POST', '/api/portal-admin/?a=payment-add', { projectId: pB.id, label: 'Part', amount: a, status: 'paid' }, O);
let pr = (await req(A, 'GET', '/api/portal-admin/?a=project&id=' + pB.id)).d;
ok(pr.money.paid === 300.3 && pr.money.remaining === 899.7 && pr.money.state === 'partial', '100.10 + 200,20 = 300.30 exactly; remaining 899.70');
await req(A, 'POST', '/api/portal-admin/?a=payment-add', { projectId: pB.id, label: 'Extra', amount: '2000', status: 'paid' }, O);
pr = (await req(A, 'GET', '/api/portal-admin/?a=project&id=' + pB.id)).d;
ok(pr.money.remaining === 0 && pr.money.state === 'paid', 'overpaid: remaining = max(total − paid, 0)');
const dbRow = await db.one('select total_amount_minor, (select sum(amount_minor) from payments where project_id = $1) as s from projects where id = $1', [pB.id]);
ok(Number(dbRow.total_amount_minor) === 120000 && Number(dbRow.s) === 230030, 'stored in cents (bigint)');

await req(A, 'POST', '/api/portal-admin/?a=action-add', { projectId: pA.id, title: 'Enviar el logo en HD' }, O);
await req(A, 'POST', '/api/portal-admin/?a=update-add', { projectId: pA.id, content: 'Interne : client hésite sur la palette', visibleToClient: false }, O);

section('documents (private storage)');
async function upload(pid, name, content, cat, vis, typeOverride) {
  const u = await req(A, 'POST', '/api/portal-admin/?a=document-upload-url', { projectId: pid, fileName: name, size: content.length }, O);
  if (u.s !== 200) return { u };
  const headers = { ...u.d.headers }; if (typeOverride) headers['x-content-type'] = typeOverride;
  const put = await fetch(B + u.d.uploadUrl, { method: 'PUT', headers, body: content });
  const d = (await req(A, 'POST', '/api/portal-admin/?a=document-add', { projectId: pid, path: u.d.path, title: name, category: cat, visibleToClient: vis }, O)).d;
  return { u, put: put.status, d };
}
const contract = await upload(pA.id, 'Contrato Top.pdf', Buffer.from('%PDF-1.4 contract A'), 'contract', true);
const internal = await upload(pA.id, 'interne.pdf', Buffer.from('%PDF internal'), 'other', false);
const docB = await upload(pB.id, 'B-contract.pdf', Buffer.from('%PDF B'), 'contract', true);
ok(contract.put === 200 && contract.d.id && internal.d.id && docB.d.id, '3 documents uploaded through signed one-time URLs');
ok(/^projects\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/Contrato-Top\.pdf$/.test(contract.u.d.path) && contract.d.file_name === 'Contrato-Top.pdf' && contract.d.mime_type === 'application/pdf', 'server-chosen path, sanitized file name, server-decided type');
r = await req(A, 'POST', '/api/portal-admin/?a=document-upload-url', { projectId: pA.id, fileName: 'setup.exe', size: 100 }, O);
ok(r.d.error === 'FILE_TYPE', '.exe refused');
r = await req(A, 'POST', '/api/portal-admin/?a=document-upload-url', { projectId: pA.id, fileName: 'page.html', size: 100 }, O);
ok(r.d.error === 'FILE_TYPE', '.html refused');
r = await req(A, 'POST', '/api/portal-admin/?a=document-upload-url', { projectId: pA.id, fileName: 'big.pdf', size: 60 * 1024 * 1024 }, O);
ok(r.d.error === 'FILE_TOO_LARGE', 'over 50 MB refused');
const spoof = await upload(pA.id, 'x.pdf', Buffer.from('MZ fake'), 'other', true, 'application/x-msdownload');
ok(spoof.put === 400 && spoof.d && spoof.d.error === 'UPLOAD_MISSING', 'upload with another type than signed: refused');
const u2 = (await req(A, 'POST', '/api/portal-admin/?a=document-upload-url', { projectId: pA.id, fileName: 'y.pdf', size: 5 }, O)).d;
ok((await fetch(B + u2.uploadUrl, { method: 'PUT', headers: u2.headers, body: Buffer.from('too long content') })).status === 400, 'upload bigger than declared: refused');
r = await req(A, 'POST', '/api/portal-admin/?a=document-add', { projectId: pB.id, path: contract.u.d.path, title: 'steal' }, O);
ok(r.d.error === 'INVALID', 'a file path of project A cannot be attached to project B');

section('client invitation');
const tA = lastToken('ana@top.test');
ok(tA && mails().find(m => m.to === 'ana@top.test').text.includes('/portal/welcome/?token='), 'invitation email has a /portal/welcome/?token= link');
const stored = await db.query('select token_hash from auth_tokens where token_hash = $1 or token_hash = $2', [tA, auth.sha256(tA)]);
ok(stored.length === 1 && stored[0].token_hash === auth.sha256(tA), 'only the SHA-256 of the token is stored');
r = await req(jar(), 'POST', '/api/portal/?a=token-info', { token: tA }, O);
ok(r.s === 200 && r.d.type === 'invite' && r.d.name === 'Ana' && r.d.gender === 'f' && r.d.locale === 'es', 'token-info: name, salutation and language for the welcome page');
const CA = jar();
r = await req(CA, 'POST', '/api/portal/?a=accept', { token: tA, password: 'short' }, O);
ok(r.d.error === 'PASSWORD_WEAK', 'password under 10 characters refused');
r = await req(CA, 'POST', '/api/portal/?a=accept', { token: tA, password: '1234567890' }, O);
ok(r.d.error === 'PASSWORD_WEAK', 'obvious password refused');
r = await req(CA, 'POST', '/api/portal/?a=accept', { token: tA, password: 'ana@top.test' }, O);
ok(r.d.error === 'PASSWORD_WEAK', 'password = email refused');
r = await req(CA, 'POST', '/api/portal/?a=accept', { token: tA, password: 'AnaTop-2026-pw' }, O);
ok(r.s === 200 && r.d.role === 'client' && CA.c.scalia_ps, 'client sets own password and is signed in');
const welcomes = () => mails().filter(m => m.to === 'ana@top.test' && /portal Scalia/.test(m.subject || ''));
const wA = welcomes();
ok(wA.length === 1 && wA[0].subject === 'Bienvenida a tu portal Scalia' && wA[0].text.startsWith('¡Bienvenida, Ana!'), 'welcome email after the invitation: Spanish, feminine');
ok(wA[0].text.includes('/portal/?lang=es') && !/token=/.test(wA[0].text) && wA[0].text.includes('ana@top.test'), 'welcome email: portal link, sign-in email, no token');
ok(!mails().some(m => m.to === 'admin@scalia.test' && /portail Scalia|portal Scalia/.test(m.subject || '')), 'no welcome email for an admin');
r = await req(jar(), 'POST', '/api/portal/?a=accept', { token: tA, password: 'Another-pass-2026' }, O);
ok(r.d.error === 'LINK_INVALID', 'invitation link: one use only');
const hashRow = await db.one('select password_hash from users where email = $1', ['ana@top.test']);
ok(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/.test(hashRow.password_hash) && !hashRow.password_hash.includes('AnaTop'), 'password stored as Argon2id hash');
const sessRow = await db.one('select count(*)::int as n from sessions where token_hash = $1', [CA.c.scalia_ps]);
ok(sessRow.n === 0, 'raw session value never stored');

section('sessions');
const oldCookie = { c: { ...CA.c } };
await req(CA, 'POST', '/api/portal/?a=logout', {}, O);
ok(!CA.c.scalia_ps, 'logout expires the cookie');
r = await req(oldCookie, 'GET', '/api/portal/?a=me');
ok(r.s === 401, 'logout deletes the session server-side (old cookie refused)');
r = await req(CA, 'POST', '/api/portal/?a=login', { email: 'ana@top.test', password: 'AnaTop-2026-pw' }, O);
ok(r.s === 200 && r.d.role === 'client', 'client login');
const exp = jar(); await req(exp, 'POST', '/api/portal/?a=login', { email: 'ana@top.test', password: 'AnaTop-2026-pw' }, O);
await db.query("update sessions set expires_at = now() - interval '1 second' where token_hash = $1", [auth.sha256(exp.c.scalia_ps)]);
r = await req(exp, 'GET', '/api/portal/?a=me');
ok(r.s === 401, 'expired session refused');
r = await req(jar(), 'GET', '/api/portal/?a=me', undefined, { Cookie: 'scalia_ps=forged-value' });
ok(r.s === 401, 'forged cookie refused');

section('client view');
const me = (await req(CA, 'GET', '/api/portal/?a=me')).d; const cv = me.current;
ok(cv.project.name === 'Rediseño web' && cv.company === 'Top Advertising', 'client sees own project');
ok(cv.progress === 54 && cv.project.currentStage === 'development', 'progress + current stage');
ok(cv.payments.total === 700 && cv.payments.paid === 350 && cv.payments.remaining === 350, 'total / paid / remaining');
ok(cv.latestUpdate.content === 'Homepage finalizada.' && cv.project.nextStep === 'Integración mobile.', 'latest update + next step');
ok(!JSON.stringify(me).includes('Interne') && !JSON.stringify(me).includes('interne.pdf'), 'internal update and document hidden');
ok(cv.contract && cv.contract.title === 'Contrato Top.pdf' && cv.actions.length === 1 && cv.contact.name === 'Scalia Admin', 'contract, action required, Scalia contact');
ok(me.projects.length === 1 && !JSON.stringify(me).includes('B secret'), 'no trace of client B');
ok(!JSON.stringify(me).includes('password_hash') && !JSON.stringify(me).includes('blob_pathname'), 'no hash or storage path in the client payload');

section('isolation and documents');
r = await req(CA, 'GET', '/api/portal/?a=file&id=' + contract.d.id);
ok(r.s === 302, 'client gets a short-lived link to own contract');
const dl = await fetch(B + r.loc); ok((await dl.text()).includes('contract A'), 'the link serves the file');
ok((await fetch(B + r.loc)).status === 404, 'the download link works once');
r = await req(CA, 'GET', '/api/portal/?a=file&id=' + internal.d.id); ok(r.s === 404 && r.d.error === 'NOT_FOUND', 'internal document: 404 (not 403)');
r = await req(CA, 'GET', '/api/portal/?a=file&id=' + docB.d.id); ok(r.s === 404, 'client B document: 404');
r = await req(CA, 'GET', '/api/portal/?a=file&id=00000000-0000-4000-8000-000000000000'); ok(r.s === 404, 'unknown document: same 404');
r = await req(CA, 'GET', '/api/portal/?a=me&project=' + pB.id); ok(r.d.current.project.id === pA.id, '?project=<B id> still shows own project only');
for (const a of ['overview', 'clients', 'project&id=' + pB.id]) { r = await req(CA, 'GET', '/api/portal-admin/?a=' + a); ok(r.s === 403, 'client → admin GET ' + a.split('&')[0] + ': 403'); }
for (const [a, b] of [['stage-update', { projectId: pA.id, stage: 'development', progress: 100 }], ['payment-add', { projectId: pA.id, label: 'x', amount: 1, status: 'paid' }], ['client-create', { company: 'h', contactName: 'h', email: 'h@h.test' }], ['document-upload-url', { projectId: pA.id, fileName: 'x.pdf', size: 10 }], ['document-delete', { id: docB.d.id }]]) {
  r = await req(CA, 'POST', '/api/portal-admin/?a=' + a, b, O); ok(r.s === 403, 'client → admin POST ' + a + ': 403');
}
r = await req(A, 'POST', '/api/portal-admin/?a=stage-update', { projectId: pA.id, stage: 'review', progress: 10 }); ok(r.s === 403, 'POST without Origin: 403');
r = await req(A, 'POST', '/api/portal-admin/?a=stage-update', { projectId: pA.id, stage: 'review', progress: 10 }, { Origin: 'https://evil.test' }); ok(r.s === 403, 'POST from another site: 403');
r = await req(CA, 'POST', '/api/portal/?a=logout', {}, { Origin: 'https://evil.test' }); ok(r.s === 403, 'cross-site logout refused');
r = await req(jar(), 'GET', '/api/portal/?a=me'); ok(r.s === 401, 'no session: 401');
r = await req(jar(), 'GET', '/api/portal-admin/?a=overview'); ok(r.s === 401, 'no session, admin API: 401');
r = await req(jar(), 'GET', '/api/portal/?a=file&id=' + contract.d.id); ok(r.s === 401, 'no session, file: 401');
const page = (p, cookie) => middleware(new Request('http://localhost' + p, { headers: cookie ? { cookie } : {} }));
let mw = page('/admin/'); ok(mw && mw.status === 307 && mw.headers.get('location').includes('/portal/login/?next=%2Fadmin%2F'), 'no session: /admin/ → sign-in');
mw = page('/portal/'); ok(mw && mw.status === 307, 'no session: /portal/ → sign-in');
mw = page('/portal/login/'); ok(!mw || mw.status !== 307, 'sign-in page public');
mw = page('/portal/welcome/'); ok(!mw || mw.status !== 307, 'welcome page public');

section('expired, reused and replaced links');
const cC = (await req(A, 'POST', '/api/portal-admin/?a=client-create', { company: 'Client C', contactName: 'Carla', email: 'carla@c.test', locale: 'fr' }, O)).d;
const tC1 = lastToken('carla@c.test');
await db.query("update auth_tokens set expires_at = now() - interval '1 second' where token_hash = $1", [auth.sha256(tC1)]);
r = await req(jar(), 'POST', '/api/portal/?a=token-info', { token: tC1 }, O); ok(r.d.error === 'LINK_INVALID', 'expired invitation refused');
r = await req(A, 'POST', '/api/portal-admin/?a=invite-resend', { userId: cC.userId }, O); ok(r.d.sent === 'invite', 'resend invitation (inactive account)');
const tC2 = lastToken('carla@c.test');
ok(tC2 && tC2 !== tC1, 'resend creates a NEW token');
r = await req(A, 'POST', '/api/portal-admin/?a=invite-resend', { userId: cC.userId }, O);
const tC3 = lastToken('carla@c.test');
r = await req(jar(), 'POST', '/api/portal/?a=token-info', { token: tC2 }, O); ok(r.d.error === 'LINK_INVALID', 'previous invitation cancelled by the new one');
r = await req(jar(), 'POST', '/api/portal/?a=token-info', { token: tC3 }, O); ok(r.s === 200, 'latest invitation valid');

section('password reset');
const other = jar(); await req(other, 'POST', '/api/portal/?a=login', { email: 'ana@top.test', password: 'AnaTop-2026-pw' }, O);
r = await req(jar(), 'POST', '/api/portal/?a=forgot', { email: 'ana@top.test', locale: 'es' }, O); ok(r.s === 200, 'forgot password');
let t0 = Date.now();
r = await req(jar(), 'POST', '/api/portal/?a=forgot', { email: 'nobody@nowhere.test', locale: 'en' }, O); ok(r.s === 200 && r.d.ok, 'forgot: same answer for an unknown email');
ok(Date.now() - t0 >= 1450, 'forgot: unknown address answers no faster (no timing hint)');
const tR = lastToken('ana@top.test');
const resetRow = await db.one("select type, extract(epoch from (expires_at - created_at))::int as ttl from auth_tokens where token_hash = $1", [auth.sha256(tR)]);
ok(resetRow.type === 'reset' && resetRow.ttl === 3600, 'reset link valid 1 hour');
ok(mails().filter(m => m.to === 'ana@top.test').pop().text.includes('1 hora'), 'reset email in the client language (ES)');
const R = jar();
r = await req(R, 'POST', '/api/portal/?a=accept', { token: tR, password: 'AnaNew-2026-pw' }, O); ok(r.s === 200, 'new password set through the reset link');
ok(welcomes().length === 1, 'new password through a reset: no second welcome email');
r = await req(jar(), 'POST', '/api/portal/?a=accept', { token: tR, password: 'AnaNew-2026-pw2' }, O); ok(r.d.error === 'LINK_INVALID', 'reset link reused: refused');
r = await req(other, 'GET', '/api/portal/?a=me'); ok(r.s === 401, 'reset signs every other session out');
r = await req(CA, 'GET', '/api/portal/?a=me'); ok(r.s === 401, 'reset signs the earlier session out too');
r = await req(jar(), 'POST', '/api/portal/?a=login', { email: 'ana@top.test', password: 'AnaTop-2026-pw' }, O); ok(r.d.error === 'INVALID_CREDENTIALS', 'old password no longer works');
r = await req(CA, 'POST', '/api/portal/?a=login', { email: 'ana@top.test', password: 'AnaNew-2026-pw' }, O); ok(r.s === 200, 'new password works');

section('audit fixes');
// Internal errors (database, Google…) never reach the browser with their code.
const { router } = require('../server/portal/api.js');
const errSrv = http.createServer((rq, rs) => { rq.query = { a: 'boom' }; router({ boom: { method: 'GET', async run() { const e = new Error('connect ECONNREFUSED'); e.code = 'ECONNREFUSED'; throw e; } } })(rq, rs); });
await new Promise(res => errSrv.listen(0, '127.0.0.1', res));
const quiet = console.error; console.error = () => {};
r = await fetch('http://127.0.0.1:' + errSrv.address().port + '/').then(async x => ({ s: x.status, d: await x.json() }));
console.error = quiet; errSrv.close();
ok(r.s === 500 && r.d.error === 'SERVER_ERROR', 'database / provider failure → 500 SERVER_ERROR (internal code hidden, logged)');
r = await req(A, 'POST', '/api/portal-admin/?a=project-update', { id: pB.id, fields: { startDate: '2026-02-31' } }, O);
ok(r.s === 400 && r.d.error === 'INVALID' && r.d.field === 'startDate', 'impossible date (31 February) → 400 INVALID, not 500');
const devBefore = (await req(A, 'GET', '/api/portal-admin/?a=project&id=' + pB.id)).d.stages.find(s => s.stage_key === 'mockup');
r = await req(A, 'POST', '/api/portal-admin/?a=quick-update', { projectId: pB.id, stage: 'mockup', stageStatus: 'in_progress', progress: 60, update: 'x'.repeat(2001), nextStep: 'n' }, O);
const devAfter = (await req(A, 'GET', '/api/portal-admin/?a=project&id=' + pB.id)).d.stages.find(s => s.stage_key === 'mockup');
ok(r.s === 400 && r.d.error === 'TOO_LONG' && devAfter.progress === devBefore.progress && devAfter.status === devBefore.status, 'quick update with an invalid field changes nothing');
const adminRow = await users.byEmail(db.pool, 'admin@scalia.test');
r = await req(A, 'POST', '/api/portal-admin/?a=client-update', { id: cB.id, company: 'Client B', contact: { userId: adminRow.id, name: 'Hijacked', phone: '', locale: 'es' } }, O);
ok(r.s === 404 && users.fullName(await users.byId(db.pool, adminRow.id)) === 'Scalia Admin', 'client update cannot edit an admin');
const anaId = (await users.byEmail(db.pool, 'ana@top.test')).id;
r = await req(A, 'POST', '/api/portal-admin/?a=client-update', { id: cB.id, company: 'Client B', contact: { userId: anaId, name: 'Wrong Org', phone: '', locale: 'es' } }, O);
ok(r.s === 404 && users.fullName(await users.byId(db.pool, anaId)) === 'Ana Pérez', 'client update cannot edit a contact of another organization');
r = await req(A, 'POST', '/api/portal-admin/?a=client-update', { id: cB.id, company: 'Client B', contact: { userId: cB.userId, name: 'Bob Brown', phone: '+1 809 555 0000', locale: 'en', gender: 'm' } }, O);
ok(r.s === 200 && (await users.byId(db.pool, cB.userId)).phone === '+1 809 555 0000', 'client update still edits its own contact');
ok((await users.byId(db.pool, cB.userId)).gender === 'm', 'admin sets the salutation of a contact');
const cD = (await req(A, 'POST', '/api/portal-admin/?a=client-create', { company: 'Client D', contactName: 'Dana', email: 'dana@d.test', locale: 'en' }, O)).d;
const tD1 = lastToken('dana@d.test');
t0 = Date.now();
r = await req(jar(), 'POST', '/api/portal/?a=forgot', { email: 'dana@d.test', locale: 'en' }, O);
const tD2 = lastToken('dana@d.test');
ok(r.s === 200 && tD2 && tD2 !== tD1, 'forgot password, invited but never activated → a new invitation is sent');
ok((await req(jar(), 'POST', '/api/portal/?a=token-info', { token: tD2 }, O)).d.type === 'invite', '…of type invitation (choose a password)');
ok(Date.now() - t0 >= 1450, 'forgot: same minimum answer time when the address exists');
r = await req(A, 'POST', '/api/portal-admin/?a=payment-add', { projectId: pB.id, label: 'Today', amount: '1', status: 'paid' }, O);
const tzToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santo_Domingo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
ok(r.d.paid_at === tzToday, 'default payment date = today in Scalia\'s time zone (' + tzToday + ')');
const twice = jar();
await req(twice, 'POST', '/api/portal/?a=login', { email: 'admin@scalia.test', password: 'Admin-Test-2026' }, O);
const firstCookie = { c: { ...twice.c } };
await req(twice, 'POST', '/api/portal/?a=login', { email: 'admin@scalia.test', password: 'Admin-Test-2026' }, O);
ok((await req(firstCookie, 'GET', '/api/portal-admin/?a=me')).s === 401 && (await req(twice, 'GET', '/api/portal-admin/?a=me')).s === 200, 'a new sign-in deletes the session the browser had');
const storage = require('../server/portal/storage.js');
const extra = await upload(pB.id, 'temp.pdf', Buffer.from('%PDF temp'), 'other', true);
const realRemove = storage.store().remove;
storage.store().remove = async () => { throw new Error('blob store down'); };
console.error = () => {};
r = await req(A, 'POST', '/api/portal-admin/?a=document-delete', { id: extra.d.id }, O);
console.error = quiet; storage.store().remove = realRemove;
ok(r.s === 200 && !(await db.one('select 1 as x from documents where id = $1', [extra.d.id])), 'document deleted even if the file store fails (logged)');
await db.query("insert into rate_limits (key, window_start, hits) values ('old:key', now() - interval '3 days', 1)");
await db.query("update auth_tokens set expires_at = now() - interval '40 days' where token_hash = $1", [auth.sha256(tD1)]);
await require('../server/portal/repositories/auth.js').purgeExpired(db.pool);
ok(!(await db.one("select 1 as x from rate_limits where key = 'old:key'")) && !(await db.one('select 1 as x from auth_tokens where token_hash = $1', [auth.sha256(tD1)])), 'housekeeping removes old rate-limit windows and old links');
const config = require('../server/portal/config.js');
const saved = { m: process.env.PORTAL_MOCK, d: process.env.DATABASE_URL, b: process.env.BLOB_READ_WRITE_TOKEN };
delete process.env.PORTAL_MOCK; process.env.DATABASE_URL = 'postgres://user@db.example/x'; delete process.env.BLOB_READ_WRITE_TOKEN;
const withDbOnly = config.configured();
process.env.PORTAL_MOCK = saved.m; if (saved.d === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = saved.d;
ok(withDbOnly === true, 'portal works with the database alone (Blob only needed for documents)');

section('rate limits');
let last;
for (let i = 0; i < 9; i++) last = await req(jar(), 'POST', '/api/portal/?a=login', { email: 'bob@b.test', password: 'guess-' + i + '-xxxx' }, O);
ok(last.s === 429 && last.d.error === 'RATE_LIMITED', 'login: 9th wrong attempt on one address → 429');
for (let i = 0; i < 4; i++) last = await req(jar(), 'POST', '/api/portal/?a=forgot', { email: 'carla@c.test', locale: 'fr' }, O);
ok(last.s === 429, 'forgot password limited');

section('admin');
r = await req(A, 'POST', '/api/portal-admin/?a=invite-resend', { userId: (await users.byEmail(db.pool, 'ana@top.test')).id }, O); ok(r.d.sent === 'reset', 'resend for an activated client → new-password link');
r = await req(A, 'POST', '/api/portal-admin/?a=document-delete', { id: internal.d.id }, O); ok(r.s === 200, 'admin deletes a document');
const adm = (await req(A, 'GET', '/api/portal/?a=me&project=' + pB.id)).d; ok(adm.admin && adm.current.project.id === pB.id && adm.projects.length === 1, 'admin preview of client B');
const ov = (await req(A, 'GET', '/api/portal-admin/?a=overview')).d.projects; ok(ov.length === 2 && ov.find(p => p.id === pA.id).progress === 54, 'overview');
r = await req(A, 'POST', '/api/portal-admin/?a=project-update', { id: pA.id, fields: { totalAmount: '1 250,50', priceReason: 'Option blog + traduction' } }, O);
ok(r.s === 200 && r.d.total_amount === 1250.5, 'admin changes the project price (options)');
const priceNote = (await projects.updates(db.pool, pA.id, true, 5)).find(u => u.content.startsWith('Prix du projet'));
ok(priceNote && !priceNote.visible_to_client && priceNote.content.includes('→ 1 250,50 EUR · Option blog + traduction'), 'price change kept in the internal history with its reason');
r = await req(A, 'POST', '/api/portal-admin/?a=project-update', { id: pA.id, fields: { totalAmount: '0', priceReason: '' } }, O);
ok(r.s === 200 && r.d.total_amount === 0, 'price can go down to 0 (offered)');
await req(A, 'POST', '/api/portal-admin/?a=project-update', { id: pA.id, fields: { totalAmount: '700' } }, O);
r = await req(A, 'POST', '/api/portal-admin/?a=project-update', { id: pA.id, fields: { status: 'completed' } }, O); ok(r.d.status === 'completed', 'close project');
const audit = await db.one('select updated_by from projects where id = $1', [pA.id]);
ok(audit.updated_by === (await users.byEmail(db.pool, 'admin@scalia.test')).id, 'updated_by recorded');
r = await req(A, 'POST', '/api/portal-admin/?a=profile-update', { name: 'Scalia Admin', title: 'Chef de projet', whatsapp: '555' }, O);
ok(r.d.error === 'INVALID' && r.d.field === 'whatsapp', 'WhatsApp number too short refused');
r = await req(A, 'POST', '/api/portal-admin/?a=profile-update', { name: 'Scalia Admin', title: 'Chef de projet', whatsapp: '(809) 555-1234' }, O);
ok(r.s === 200 && r.d.whatsapp === '+18095551234' && r.d.title === 'Chef de projet', 'admin profile: Dominican number gets +1');
r = await req(A, 'POST', '/api/portal-admin/?a=profile-update', { name: 'Scalia Admin', title: 'Chef de projet', whatsapp: '+33 6 12 34 56 78' }, O);
ok(r.d.whatsapp === '+33612345678' && (await req(A, 'GET', '/api/portal-admin/?a=me')).d.whatsapp === '+33612345678', 'admin profile: international number kept, read back by me');
const viewA = (await req(R, 'GET', '/api/portal/?a=me&project=' + pA.id)).d.current;
ok(viewA.contact.whatsapp === '+33612345678' && viewA.contact.title === 'Chef de projet', 'client sees the WhatsApp and role of their Scalia contact');
ok((await req(A, 'GET', '/api/portal-admin/?a=clients')).d.team.every(t => typeof t.whatsapp === 'boolean'), 'team list says who has WhatsApp, not the number');
section('inactivity');
const age = (j, min) => db.query("update sessions set last_used_at = now() - make_interval(mins => $2) where token_hash = $1", [auth.sha256(j.c.scalia_ps), min]);
const IC = jar(); await req(IC, 'POST', '/api/portal/?a=login', { email: 'ana@top.test', password: 'AnaNew-2026-pw' }, O);
r = await req(IC, 'GET', '/api/portal/?a=ping'); ok(r.s === 200 && r.d.idleSeconds === 3600, 'ping: client idle limit is 1 hour');
await age(IC, 50); ok((await req(IC, 'GET', '/api/portal/?a=ping')).s === 200, 'client inactive 50 min: still signed in (and the ping renews it)');
await age(IC, 61); r = await req(IC, 'GET', '/api/portal/?a=me'); ok(r.s === 401, 'client inactive 61 min: signed out');
ok((await db.one('select count(*)::int as n from sessions where token_hash = $1', [auth.sha256(IC.c.scalia_ps)])).n === 0, 'idle session deleted from the database');
const IA = jar(); await req(IA, 'POST', '/api/portal/?a=login', { email: 'admin@scalia.test', password: 'Admin-Test-2026' }, O);
r = await req(IA, 'GET', '/api/portal/?a=ping'); ok(r.d.idleSeconds === 1800, 'ping: admin idle limit is 30 minutes');
await age(IA, 31); ok((await req(IA, 'GET', '/api/portal-admin/?a=me')).s === 401, 'admin inactive 31 min: signed out');
ok((await req(jar(), 'GET', '/api/portal/?a=ping')).s === 401, 'ping without a session: 401');

await db.transaction(async tx => ok(await users.adminExists(tx), 'bootstrap would now refuse (an admin exists)'));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
server.close();
await db.close();
fs.rmSync(DIR, { recursive: true, force: true });
process.exit(fail ? 1 : 0);
