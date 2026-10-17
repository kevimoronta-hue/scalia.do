/* ==========================================================================
   Scalia Portal · business functions: the ONLY way portal data changes.
   The admin API calls them today; a Scalia agent will call the same ones
   later ("move Top Advertising's development to 70 %", "record a 350 €
   payment"), never SQL.
   Admin functions take ctx = { user, admin } (server/portal/session.js)
   and check the role themselves. Client reads are scoped in the SQL to
   the organizations the user belongs to (repositories *ForUser): another
   client's project or document simply does not exist (NOT_FOUND).
   Errors carry .code (FORBIDDEN, NOT_FOUND, INVALID, EMAIL_EXISTS…) and
   .field for a form field.
   Money: integer minor units in the database, decimals in and out of here.
   ========================================================================== */
'use strict';
const crypto = require('crypto');
const S = require('./stages');
const db = require('./db');
const auth = require('./auth');
const storage = require('./storage');
const portalMail = require('./mail');
const mailEvents = require('../mail-events');
const { messageId } = require('../mail');
const users = require('./repositories/users');
const orgs = require('./repositories/organizations');
const projects = require('./repositories/projects');
const payments = require('./repositories/payments');
const documents = require('./repositories/documents');
const authRepo = require('./repositories/auth');
const { portalError } = require('./errors');

const q = db.pool;
const TZ = require('../config').BOOKING.timezone;

const err = portalError;
function assertAdmin(ctx) {
  if (!ctx || !ctx.user) throw err('UNAUTHENTICATED');
  if (!ctx.admin) throw err('FORBIDDEN');
}
function assertUser(ctx) { if (!ctx || !ctx.user) throw err('UNAUTHENTICATED'); }

/* ----------------------------------------------------------- validation */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@<>()",;:]{1,64}@[A-Za-z0-9.-]{1,253}\.[A-Za-z]{2,24}$/;
function id(v, field) { if (typeof v !== 'string' || !UUID.test(v)) throw err('INVALID', field || 'id'); return v.toLowerCase(); }
function line(v, max, field, required) {
  if (v == null) v = '';
  if (typeof v !== 'string') throw err('INVALID', field);
  const s = v.replace(/[\u0000-\u001F\u007F\u2028\u2029]/g, ' ').replace(/\s+/g, ' ').trim();
  if (s.length > max) throw err('TOO_LONG', field);
  if (required && !s) throw err('REQUIRED', field);
  return s;
}
function text(v, max, field, required) {
  if (v == null) v = '';
  if (typeof v !== 'string') throw err('INVALID', field);
  const s = v.replace(/[\u0000-\u0009\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/\r\n?/g, '\n').trim();
  if (s.length > max) throw err('TOO_LONG', field);
  if (required && !s) throw err('REQUIRED', field);
  return s;
}
function oneOf(v, list, field) { if (!list.includes(v)) throw err('INVALID', field); return v; }
// Salutation (users.gender): '' neutral, m, f.
const gender = v => oneOf(v == null ? '' : String(v), ['', 'm', 'f'], 'gender');
// A real calendar day (2026-02-31 is refused, not rolled over).
function date(v, field) {
  if (v == null || v === '') return null;
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw err('INVALID', field);
  const d = new Date(v + 'T00:00:00Z');
  if (isNaN(d) || d.toISOString().slice(0, 10) !== v) throw err('INVALID', field);
  return v;
}
// Today in Scalia's time zone (BOOKING_TIMEZONE), as YYYY-MM-DD.
function today() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
// "700", "700.50", "700,5" → 70000 / 70050 / 70050 (integer cents, no float math).
function minor(v, field, allowZero) {
  const s = typeof v === 'number' ? String(v) : String(v == null ? '' : v).replace(/\s/g, '').replace(',', '.');
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(s)) throw err('INVALID', field);
  const parts = s.split('.');
  const n = Number(parts[0]) * 100 + Number(((parts[1] || '') + '00').slice(0, 2));
  if (!allowZero && n === 0) throw err('INVALID', field);
  return n;
}
const major = n => Number(n || 0) / 100;
function int(v, min, max, field) {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw err('INVALID', field);
  return n;
}
function bool(v) { return v === true || v === 'true' || v === 1 || v === '1'; }
function langs(v) {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.filter(x => typeof x === 'string').map(x => x.trim().toLowerCase()).filter(x => /^[a-z]{2}$/.test(x)))].slice(0, 8);
}
function email(v) {
  const e = line(v, 254, 'email', true).toLowerCase();
  if (!EMAIL.test(e)) throw err('INVALID', 'email');
  return e;
}
function splitName(full) {
  const parts = full.split(' ');
  return { first_name: parts.shift().slice(0, 80), last_name: parts.join(' ').slice(0, 120) };
}

/* ---------------------------------------------------------------- money */
function moneyOf(project, list) {
  const total = Number(project.total_amount_minor) || 0;
  const paid = list.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount_minor), 0);
  const m = { currency: project.currency, total: major(total), paid: major(paid), remaining: major(Math.max(0, total - paid)) };
  m.state = m.total > 0 && m.remaining === 0 ? 'paid' : m.paid > 0 ? 'partial' : 'unpaid';
  return m;
}
const paymentOut = x => ({ id: x.id, project_id: x.project_id, label: x.label, amount: major(x.amount_minor), currency: x.currency, status: x.status, paid_at: x.paid_at, notes: x.notes, created_at: x.created_at, updated_at: x.updated_at });
function projectOut(p) {
  const out = Object.assign({}, p, { total_amount: major(p.total_amount_minor) });
  delete out.total_amount_minor;
  return out;
}
const contactOut = u => u ? { id: u.id, full_name: users.fullName(u), title: u.title, email: u.email, whatsapp: u.whatsapp, phone: u.phone } : null;

/* ----------------------------------------------------------- client view */
async function bundle(project, includeInternal) {
  const [org, stages, updates, pays, docs, actions, contact] = await Promise.all([
    orgs.byId(q, project.organization_id),
    projects.stages(q, project.id),
    projects.updates(q, project.id, includeInternal, 30),
    payments.list(q, project.id),
    documents.list(q, project.id, includeInternal),
    projects.actions(q, project.id, false),
    project.contact_id ? users.byId(q, project.contact_id) : null
  ]);
  return { project, organization: org, stages: S.ordered(stages), updates, payments: pays, documents: docs, actions, contact };
}

function clientView(b) {
  const p = b.project;
  const m = moneyOf(p, b.payments);
  const visibleDocs = b.documents.filter(x => x.visible_to_client);
  const doc = x => ({ id: x.id, title: x.title, category: x.category, fileName: x.file_name, size: Number(x.size_bytes) || 0, createdAt: x.created_at });
  const contract = visibleDocs.find(x => x.category === 'contract') || null;
  const visibleUpdates = b.updates.filter(u => u.visible_to_client);
  const c = contactOut(b.contact);
  return {
    project: {
      id: p.id, name: p.name, type: p.type, status: p.status, locale: p.preferred_locale,
      startDate: p.start_date, estimatedDeliveryDate: p.estimated_delivery_date, domain: p.domain,
      languages: p.languages || [], currentStage: S.current(b.stages), nextStep: p.next_step, updatedAt: p.updated_at
    },
    company: b.organization ? b.organization.name : '',
    progress: S.overall(b.stages),
    stages: b.stages.map(s => ({ key: s.stage_key, status: s.status, progress: s.status === 'completed' ? 100 : s.status === 'upcoming' ? 0 : s.progress, note: s.note, updatedAt: s.updated_at })),
    latestUpdate: visibleUpdates[0] ? { content: visibleUpdates[0].content, createdAt: visibleUpdates[0].created_at } : null,
    updates: visibleUpdates.slice(0, 6).map(u => ({ content: u.content, createdAt: u.created_at })),
    actions: b.actions.filter(a => a.status === 'open').map(a => ({ id: a.id, title: a.title, description: a.description, kind: a.kind, createdAt: a.created_at })),
    payments: Object.assign(m, { items: b.payments.map(x => ({ id: x.id, label: x.label, amount: major(x.amount_minor), currency: x.currency, status: x.status, paidAt: x.paid_at })) }),
    contract: contract ? doc(contract) : null,
    documents: visibleDocs.filter(x => x !== contract).map(doc),
    contact: c ? { name: c.full_name, title: c.title, email: c.email, whatsapp: c.whatsapp || c.phone } : null
  };
}
const profileView = u => u ? { name: users.fullName(u), email: u.email, locale: u.preferred_locale, role: u.role } : null;

// The signed-in client's projects (their organizations only), and the one to show.
async function getClientPortal(ctx, projectId) {
  assertUser(ctx);
  const list = await projects.listForUser(q, ctx.user.id);
  if (!list.length) return { profile: profileView(ctx.user), projects: [], current: null };
  const pick = (projectId && list.find(p => p.id === projectId)) || list.find(p => p.status === 'active') || list[0];
  return { profile: profileView(ctx.user), projects: list.map(p => ({ id: p.id, name: p.name })), current: clientView(await bundle(pick, false)) };
}

// Admin preview: exactly the client's view of one project.
async function getClientPreview(ctx, projectId) {
  assertAdmin(ctx);
  const p = await projects.byId(q, id(projectId));
  if (!p) throw err('NOT_FOUND');
  return { profile: profileView(ctx.user), projects: [{ id: p.id, name: p.name }], current: clientView(await bundle(p, false)) };
}

// A 60-second link to a file. Client: own organization + visible only;
// anything else is NOT_FOUND (never "exists but forbidden").
async function getDocumentLink(ctx, documentId) {
  assertUser(ctx);
  const did = id(documentId);
  const doc = ctx.admin ? await documents.byId(q, did) : await documents.byIdForUser(q, ctx.user.id, did);
  if (!doc) throw err('NOT_FOUND');
  return storage.store().downloadUrl(doc.blob_pathname, 60);
}

/* ------------------------------------------------------------- sign-in */
async function signIn(rawEmail, password) {
  const e = String(rawEmail || '').trim().toLowerCase();
  const pw = typeof password === 'string' ? password : '';
  const u = e && pw && pw.length <= 200 && e.length <= 254 ? await users.credentialsByEmail(q, e) : null;
  if (!u || !u.is_active || !u.password_hash) { await auth.burn(pw); throw err('INVALID_CREDENTIALS'); }
  if (!(await auth.verifyPassword(u.password_hash, pw))) throw err('INVALID_CREDENTIALS');
  const s = await auth.createSession(u.id);
  const full = await users.byId(q, u.id);
  return { session: s, role: full.role, locale: full.preferred_locale };
}

// What the welcome page shows before the password is chosen.
async function tokenInfo(rawToken) {
  const h = auth.tokenHashOf(rawToken);
  const t = h && await authRepo.peekToken(q, h);
  if (!t) throw err('LINK_INVALID');
  return { type: t.type, email: t.email, name: t.first_name, gender: t.gender, locale: t.preferred_locale };
}

// Invitation or reset link + new password: one use, then a fresh session.
// Every other session of the account is signed out. A client accepting an
// invitation then gets the welcome email (once per account, mail_events);
// if it cannot leave, the sign-in still succeeds.
async function acceptToken(rawToken, password, siteUrl) {
  const h = auth.tokenHashOf(rawToken);
  const peek = h && await authRepo.peekToken(q, h);
  if (!peek) throw err('LINK_INVALID');
  const problem = auth.passwordProblem(password, peek.email);
  if (problem) throw err(problem, 'password');
  const hash = await auth.hashPassword(password);
  const user = await db.transaction(async tx => {
    const t = await authRepo.consumeToken(tx, h);
    if (!t) throw err('LINK_INVALID');
    await auth.destroyUserSessions(tx, t.user_id);
    return users.setPassword(tx, t.user_id, hash);
  });
  const s = await auth.createSession(user.id);
  if (peek.type === 'invite' && user.role === 'client' && siteUrl) await sendWelcome(user, siteUrl);
  return { session: s, role: user.role, locale: user.preferred_locale };
}

async function sendWelcome(user, siteUrl) {
  try {
    const org = await orgs.firstOfUser(q, user.id);
    const m = portalMail.welcomeMail({
      to: user.email, locale: user.preferred_locale, gender: user.gender, firstName: user.first_name, company: org ? org.name : '',
      url: siteUrl + '/portal/?lang=' + user.preferred_locale, messageId: messageId('portal-welcome', user.id, 'client')
    });
    await mailEvents.once({ key: 'portal-welcome:' + user.id, type: 'portal_welcome', recipient: user.email }, () => portalMail.send(m));
  } catch (e) { console.error('[portal] welcome email', e.code || e.message); }
}

async function sendAccess(user, type, siteUrl, company, by) {
  const raw = await auth.issueToken(q, user.id, type, by);
  const url = siteUrl + '/portal/welcome/?token=' + raw + '&lang=' + user.preferred_locale;
  await portalMail.send(portalMail.accessMail({ to: user.email, locale: user.preferred_locale, name: users.fullName(user), company, url, kind: type }));
}

// Public "forgot password": same answer, and about the same time, whether
// or not the address has an account. An invited client who never chose a
// password gets a new invitation instead (a disabled account gets nothing).
const RESET_MIN_MS = 1500;
async function requestPasswordReset(rawEmail, siteUrl) {
  const started = Date.now();
  const e = String(rawEmail || '').trim().toLowerCase();
  if (!EMAIL.test(e) || e.length > 254) throw err('INVALID', 'email');
  try {
    const cred = await users.credentialsByEmail(q, e);
    if (cred && (cred.is_active || !cred.password_hash)) {
      const u = await users.byId(q, cred.id);
      const org = cred.is_active ? null : await orgs.firstOfUser(q, u.id);
      await sendAccess(u, cred.is_active ? 'reset' : 'invite', siteUrl, org ? org.name : '', null);
    }
  } catch (x) { console.error('[portal] reset', x.code || x.message); }
  const wait = RESET_MIN_MS - (Date.now() - started);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  return { ok: true };
}

/* ----------------------------------------------------------------- admin */
async function adminOverview(ctx) {
  assertAdmin(ctx);
  const [list, allOrgs, stages, pays, actions] = await Promise.all([projects.listAll(q), orgs.all(q), projects.allStages(q), payments.all(q), projects.openActions(q)]);
  const orgName = {};
  allOrgs.forEach(o => { orgName[o.id] = o.name; });
  return list.map(p => {
    const st = stages.filter(s => s.project_id === p.id);
    return {
      id: p.id, name: p.name, company: orgName[p.organization_id] || '', organizationId: p.organization_id, status: p.status,
      progress: S.overall(st), currentStage: S.current(st), currency: p.currency,
      money: moneyOf(p, pays.filter(x => x.project_id === p.id)),
      openActions: actions.filter(a => a.project_id === p.id).map(a => a.title),
      updatedAt: p.updated_at
    };
  });
}

/* --------------------------------------------------------- admin profile */
// Each admin keeps their own name, role and WhatsApp number: it is what the
// client sees under "Your contact at Scalia" (name, role, WhatsApp button).
const myProfile = u => ({ name: users.fullName(u), email: u.email, locale: u.preferred_locale, title: u.title || '', whatsapp: u.whatsapp || '' });
function getMyProfile(ctx) { assertAdmin(ctx); return myProfile(ctx.user); }

// WhatsApp number in international format, stored as "+<digits>" (what
// wa.me needs). A Dominican number typed without the country code
// (809 / 829 / 849 + 7 digits) gets +1.
function waNumber(v) {
  const s = line(v, 40, 'whatsapp');
  if (!s) return '';
  const d = s.replace(/[\s().-]/g, '');
  if (/^(809|829|849)\d{7}$/.test(d)) return '+1' + d;
  if (!/^\+\d{8,15}$/.test(d)) throw err('INVALID', 'whatsapp');
  return d;
}

async function updateMyProfile(ctx, input) {
  assertAdmin(ctx);
  input = input || {};
  const patch = Object.assign({ title: line(input.title, 120, 'title'), whatsapp: waNumber(input.whatsapp) }, splitName(line(input.name, 120, 'name', true)));
  return myProfile(await users.update(q, ctx.user.id, patch, ctx.user.id));
}

async function adminClients(ctx) {
  assertAdmin(ctx);
  const [allOrgs, members, list, team] = await Promise.all([orgs.all(q), orgs.allMembers(q), projects.listAll(q), users.admins(q)]);
  const people = await users.byIds(q, [...new Set(members.map(m => m.user_id))]);
  return {
    clients: allOrgs.map(o => ({
      id: o.id, company: o.name, createdAt: o.created_at,
      contacts: members.filter(m => m.organization_id === o.id).map(m => {
        const u = people.find(x => x.id === m.user_id) || {};
        return { userId: m.user_id, name: users.fullName(u), email: u.email || '', phone: u.phone || '', locale: u.preferred_locale || 'es', gender: u.gender || '', active: !!u.is_active };
      }),
      projects: list.filter(p => p.organization_id === o.id).map(p => ({ id: p.id, name: p.name, status: p.status }))
    })),
    team: team.map(u => ({ id: u.id, name: users.fullName(u) || u.email, email: u.email, title: u.title, whatsapp: !!u.whatsapp }))
  };
}

// New client = user (no password yet) + organization + membership, in one
// transaction; then the invitation (one-time token + email).
async function createClient(ctx, input, siteUrl) {
  assertAdmin(ctx);
  const company = line(input.company, 160, 'company', true);
  const name = line(input.contactName, 120, 'contactName', true);
  const mail = email(input.email);
  const phone = line(input.phone, 40, 'phone');
  const locale = oneOf(input.locale || 'es', S.LOCALES, 'locale');
  const g = gender(input.gender);
  const created = await db.transaction(async tx => {
    if (await users.byEmail(tx, mail)) throw err('EMAIL_EXISTS', 'email');
    const user = await users.create(tx, Object.assign({ email: mail, role: 'client', preferred_locale: locale, gender: g, phone, by: ctx.user.id }, splitName(name)));
    const org = await orgs.create(tx, company, ctx.user.id);
    await orgs.addMember(tx, org.id, user.id);
    return { user, org };
  }).catch(e => { if (e.code === '23505') throw err('EMAIL_EXISTS', 'email'); throw e; });
  let mailSent = true;
  try { await sendAccess(created.user, 'invite', siteUrl, company, ctx.user.id); } catch (e) { mailSent = false; console.error('[portal] invite email', e.code || e.message); }
  return { id: created.org.id, company, userId: created.user.id, mailSent };
}

// Company and contact. A new email address: links already sent to the old
// one stop working, and a client who has not chosen a password yet gets a
// new invitation at the new address (language, name and salutation as just
// saved). An activated client signs in with the new address from now on.
async function updateClient(ctx, organizationId, input, siteUrl) {
  assertAdmin(ctx);
  const oid = id(organizationId);
  const company = line(input.company, 160, 'company', true);
  const c = input.contact && input.contact.userId ? input.contact : null;
  const contact = c ? Object.assign({ phone: line(c.phone, 40, 'phone'), preferred_locale: oneOf(c.locale || 'es', S.LOCALES, 'locale'), gender: gender(c.gender) }, splitName(line(c.name, 120, 'contactName', true))) : null;
  if (contact && c.email != null) contact.email = email(c.email);
  const r = await db.transaction(async tx => {
    const o = await orgs.rename(tx, oid, company, ctx.user.id);
    if (!o) throw err('NOT_FOUND');
    if (!contact) return { o };
    const uid = id(c.userId, 'contactName');
    // Only a client contact of this very organization can be edited here.
    if (!(await orgs.isMember(tx, oid, uid))) throw err('NOT_FOUND');
    const u = await users.byId(tx, uid);
    if (!u || u.role !== 'client') throw err('NOT_FOUND');
    const changed = !!contact.email && contact.email !== u.email;
    if (!changed) delete contact.email;
    else {
      const other = await users.byEmail(tx, contact.email);
      if (other) throw err('EMAIL_EXISTS', 'email');
      await authRepo.cancelTokens(tx, uid);
    }
    const saved = await users.update(tx, uid, contact, ctx.user.id);
    return { o, user: saved, changed };
  }).catch(e => { if (e.code === '23505') throw err('EMAIL_EXISTS', 'email'); throw e; });
  const out = Object.assign({}, r.o, { emailChanged: !!r.changed, invited: false });
  if (r.changed && !r.user.is_active) {
    out.invited = true;
    try { await sendAccess(r.user, 'invite', siteUrl, company, ctx.user.id); out.mailSent = true; }
    catch (e) { out.mailSent = false; console.error('[portal] invite email', e.code || e.message); }
  }
  return out;
}

// A new link: invitation while the account is not activated, "choose a new
// password" once it is. Earlier links stop working.
async function resendInvite(ctx, userId, siteUrl) {
  assertAdmin(ctx);
  const u = await users.byId(q, id(userId));
  if (!u) throw err('NOT_FOUND');
  const org = await orgs.firstOfUser(q, u.id);
  const type = u.is_active ? 'reset' : 'invite';
  await sendAccess(u, type, siteUrl, org ? org.name : '', ctx.user.id);
  return { sent: type };
}

function projectFields(input, partial) {
  const out = {};
  const has = k => (!partial || Object.prototype.hasOwnProperty.call(input, k)) && input[k] !== undefined;
  if (has('name')) out.name = line(input.name, 160, 'name', true);
  if (has('type')) out.type = line(input.type, 80, 'type');
  if (has('status')) out.status = oneOf(input.status || 'active', S.PROJECT_STATUS, 'status');
  if (has('currency')) out.currency = oneOf(input.currency || 'EUR', S.CURRENCIES, 'currency');
  if (has('totalAmount')) out.total_amount_minor = minor(input.totalAmount, 'totalAmount', true);
  if (has('startDate')) out.start_date = date(input.startDate, 'startDate');
  if (has('estimatedDeliveryDate')) out.estimated_delivery_date = date(input.estimatedDeliveryDate, 'estimatedDeliveryDate');
  if (has('domain')) out.domain = line(input.domain, 120, 'domain');
  if (has('languages')) out.languages = langs(input.languages);
  if (has('preferredLocale')) out.preferred_locale = oneOf(input.preferredLocale || 'es', S.LOCALES, 'preferredLocale');
  if (has('contactId')) out.contact_id = input.contactId ? id(input.contactId, 'contactId') : null;
  if (has('nextStep')) out.next_step = text(input.nextStep, 600, 'nextStep');
  if (out.start_date && out.estimated_delivery_date && out.estimated_delivery_date < out.start_date) throw err('INVALID', 'estimatedDeliveryDate');
  return out;
}
async function assertContact(tx, contactId) {
  if (!contactId) return;
  const u = await users.byId(tx, contactId);
  if (!u || u.role !== 'admin') throw err('INVALID', 'contactId');
}

// New project with the five standard stages (brief starts in progress).
async function createProject(ctx, organizationId, input) {
  assertAdmin(ctx);
  const oid = id(organizationId, 'organizationId');
  const fields = projectFields(input || {}, false);
  return db.transaction(async tx => {
    if (!(await orgs.byId(tx, oid))) throw err('NOT_FOUND');
    await assertContact(tx, fields.contact_id);
    const p = await projects.create(tx, Object.assign(fields, { organization_id: oid, by: ctx.user.id }));
    await projects.createStages(tx, p.id, S.STAGES.map((k, i) => ({ stage_key: k, position: i + 1, status: i === 0 ? 'in_progress' : 'upcoming', progress: 0 })));
    return projectOut(await projects.byId(tx, p.id));
  });
}

async function getProjectAdmin(ctx, projectId) {
  assertAdmin(ctx);
  const p = await projects.byId(q, id(projectId));
  if (!p) throw err('NOT_FOUND');
  const b = await bundle(p, true);
  return {
    project: projectOut(p), organization: b.organization, stages: b.stages, updates: b.updates,
    payments: b.payments.map(paymentOut), documents: b.documents.map(d => Object.assign({}, d, { size_bytes: Number(d.size_bytes) })), actions: b.actions,
    contact: contactOut(b.contact), progress: S.overall(b.stages), currentStage: S.current(b.stages), money: moneyOf(p, b.payments)
  };
}

async function updateProject(ctx, projectId, input) {
  assertAdmin(ctx);
  const pid = id(projectId);
  const fields = projectFields(input || {}, true);
  const reason = line(input && input.priceReason, 200, 'priceReason');
  return db.transaction(async tx => {
    const cur = await projects.byId(tx, pid);
    if (!cur) throw err('NOT_FOUND');
    // Paid and remaining are sums in one currency: fixed once a payment exists.
    if (fields.currency && fields.currency !== cur.currency && await payments.count(tx, pid)) throw err('CURRENCY_LOCKED', 'currency');
    if ('contact_id' in fields) await assertContact(tx, fields.contact_id);
    const out = await projects.update(tx, pid, fields, ctx.user.id);
    // A price change (discount, options) leaves a trace in the internal
    // history: old → new, and the reason when given.
    if ('total_amount_minor' in fields && Number(fields.total_amount_minor) !== Number(cur.total_amount_minor)) {
      const fmt = n => {
        const [i, d] = (n / 100).toFixed(2).split('.');
        return i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (d === '00' ? '' : ',' + d) + ' ' + out.currency;
      };
      await projects.addUpdate(tx, pid, 'Prix du projet : ' + fmt(Number(cur.total_amount_minor)) + ' → ' + fmt(Number(fields.total_amount_minor)) + (reason ? ' · ' + reason : ''), false, ctx.user.id);
    }
    return projectOut(out);
  });
}

// "Development at 70 %": status and/or progress of one stage; the
// project's current stage follows.
async function updateProjectStage(ctx, projectId, stageKey, input) {
  assertAdmin(ctx);
  const pid = id(projectId);
  oneOf(stageKey, S.STAGES, 'stage');
  input = input || {};
  const patch = {};
  if (input.status != null) patch.status = oneOf(input.status, S.STAGE_STATUS, 'status');
  if (input.progress != null && input.progress !== '') patch.progress = int(input.progress, 0, 100, 'progress');
  if (input.note != null) patch.note = text(input.note, 400, 'note');
  if (patch.status === 'completed') patch.progress = 100;
  if (patch.status === 'upcoming') patch.progress = 0;
  return db.transaction(async tx => {
    const cur = await projects.stageByKey(tx, pid, stageKey);
    if (!cur) throw err('NOT_FOUND');
    // A progress above 0 on an upcoming stage starts it.
    if (patch.status == null && patch.progress > 0 && cur.status === 'upcoming') patch.status = 'in_progress';
    const stage = await projects.updateStage(tx, pid, stageKey, patch, ctx.user.id);
    const all = await projects.stages(tx, pid);
    await projects.update(tx, pid, { current_stage: S.current(all) }, ctx.user.id);
    return { stage, progress: S.overall(all), currentStage: S.current(all) };
  });
}

async function addProjectUpdate(ctx, projectId, content, visibleToClient) {
  assertAdmin(ctx);
  const pid = id(projectId);
  const body = text(content, 2000, 'content', true);
  return db.transaction(async tx => {
    if (!(await projects.byId(tx, pid))) throw err('NOT_FOUND');
    const u = await projects.addUpdate(tx, pid, body, visibleToClient !== false, ctx.user.id);
    await projects.update(tx, pid, {}, ctx.user.id);              // updated_at / updated_by
    return u;
  });
}

async function setNextStep(ctx, projectId, nextStep) {
  return updateProject(ctx, projectId, { nextStep });
}

function paymentFields(input, partial) {
  const out = {};
  const has = k => !partial || Object.prototype.hasOwnProperty.call(input, k);
  if (has('label')) out.label = line(input.label, 120, 'label', true);
  if (has('amount')) out.amount_minor = minor(input.amount, 'amount', false);
  if (has('status')) out.status = oneOf(input.status || 'pending', ['pending', 'paid'], 'status');
  if (has('paidAt')) out.paid_at = date(input.paidAt, 'paidAt');
  if (has('notes')) out.notes = text(input.notes, 500, 'notes');
  if (out.status === 'paid' && !out.paid_at) out.paid_at = today();
  if (out.status === 'pending') out.paid_at = null;
  return out;
}

// Payments are always in the project's currency (input.currency, if given,
// must match it).
async function recordPayment(ctx, projectId, input) {
  assertAdmin(ctx);
  const pid = id(projectId);
  input = input || {};
  const fields = paymentFields(input, false);
  const p = await projects.byId(q, pid);
  if (!p) throw err('NOT_FOUND');
  if (input.currency && input.currency !== p.currency) throw err('INVALID', 'currency');
  return paymentOut(await payments.add(q, Object.assign(fields, { project_id: pid, currency: p.currency }), ctx.user.id));
}
async function updatePayment(ctx, paymentId, input) {
  assertAdmin(ctx);
  const row = await payments.update(q, id(paymentId), paymentFields(input || {}, true), ctx.user.id);
  if (!row) throw err('NOT_FOUND');
  return paymentOut(row);
}
async function deletePayment(ctx, paymentId) {
  assertAdmin(ctx);
  if (!(await payments.remove(q, id(paymentId)))) throw err('NOT_FOUND');
  return { ok: true };
}

// "Action required": shown to the client until resolved.
async function setRequiredAction(ctx, projectId, input) {
  assertAdmin(ctx);
  const pid = id(projectId);
  input = input || {};
  const a = { title: line(input.title, 160, 'title', true), description: text(input.description, 800, 'description') };
  if (!(await projects.byId(q, pid))) throw err('NOT_FOUND');
  return projects.addAction(q, pid, a, ctx.user.id);
}
async function resolveRequiredAction(ctx, actionId) {
  assertAdmin(ctx);
  const a = await projects.resolveAction(q, id(actionId), ctx.user.id);
  if (!a) throw err('NOT_FOUND');
  return a;
}

/* ------------------------------------------------------------- documents */
// Name kept for the file: ASCII letters, digits, dot, dash, underscore.
function safeName(n) {
  const s = String(n || 'file').normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^[-.]+|-+$/g, '').slice(-90);
  return s || 'file';
}
const PATH = /^projects\/([0-9a-f-]{36})\/([0-9a-f-]{36})\/([A-Za-z0-9._-]{1,90})$/;

// Step 1: a one-time signed upload URL for this exact file (server-chosen
// path and type, declared size, 15 minutes).
async function requestDocumentUpload(ctx, projectId, fileName, size) {
  assertAdmin(ctx);
  const pid = id(projectId);
  if (!(await projects.byId(q, pid))) throw err('NOT_FOUND');
  const n = Number(size);
  if (!Number.isInteger(n) || n <= 0 || n > storage.MAX_BYTES) throw err('FILE_TOO_LARGE', 'file');
  const name = safeName(fileName);
  const type = storage.typeOf(name);
  if (!type) throw err('FILE_TYPE', 'file');
  const pathname = 'projects/' + pid + '/' + crypto.randomUUID() + '/' + name;
  const target = await storage.store().uploadTarget(pathname, type, n);
  return { path: pathname, uploadUrl: target.url, method: target.method, headers: target.headers };
}
// Step 2: the file is in the store; record it (size and type checked again
// on the stored object).
async function uploadProjectDocument(ctx, projectId, input) {
  assertAdmin(ctx);
  const pid = id(projectId);
  input = input || {};
  const m = PATH.exec(String(input.path || ''));
  if (!m || m[1] !== pid) throw err('INVALID', 'path');
  if (!(await projects.byId(q, pid))) throw err('NOT_FOUND');
  const stat = await storage.store().stat(input.path);
  if (!stat) throw err('UPLOAD_MISSING', 'file');
  const type = storage.typeOf(m[3]);
  if (!type || stat.size > storage.MAX_BYTES || (stat.contentType && stat.contentType.split(';')[0] !== type)) {
    await storage.store().remove(input.path);
    throw err('FILE_TYPE', 'file');
  }
  try {
    return await documents.add(q, {
      project_id: pid,
      title: line(input.title, 160, 'title') || m[3],
      category: oneOf(input.category || 'other', S.DOC_CATEGORIES, 'category'),
      blob_pathname: input.path, file_name: m[3], mime_type: type, size_bytes: stat.size,
      visible_to_client: input.visibleToClient !== false
    }, ctx.user.id);
  } catch (e) { if (e.code === '23505') throw err('INVALID', 'path'); throw e; }
}
async function updateDocument(ctx, documentId, input) {
  assertAdmin(ctx);
  input = input || {};
  const patch = {};
  if ('title' in input) patch.title = line(input.title, 160, 'title', true);
  if ('category' in input) patch.category = oneOf(input.category, S.DOC_CATEGORIES, 'category');
  if ('visibleToClient' in input) patch.visible_to_client = bool(input.visibleToClient);
  const row = await documents.update(q, id(documentId), patch, ctx.user.id);
  if (!row) throw err('NOT_FOUND');
  return row;
}
async function deleteDocument(ctx, documentId) {
  assertAdmin(ctx);
  const row = await documents.remove(q, id(documentId));
  if (!row) throw err('NOT_FOUND');
  // The document is gone for everyone; a file the store failed to delete is
  // unreachable (private, no record) and logged for cleanup.
  try { await storage.store().remove(row.blob_pathname); } catch (e) { console.error('[portal] blob not deleted', row.blob_pathname, e.code || e.message); }
  return { ok: true };
}

/* -------------------------------------------------------------- deletion */
// Irreversible, so the admin types the exact name to confirm (the API
// checks it too). Everything attached goes with the project (stages,
// updates, actions, payments, documents: ON DELETE CASCADE), then the
// stored files; a file the store failed to delete is unreachable and logged.
function confirmName(given, expected) {
  if (String(given || '').trim().toLowerCase() !== String(expected || '').trim().toLowerCase()) throw err('CONFIRM_MISMATCH', 'confirm');
}
async function removeFiles(paths) {
  for (const p of paths) {
    try { await storage.store().remove(p); } catch (e) { console.error('[portal] blob not deleted', p, e.code || e.message); }
  }
}

async function deleteProject(ctx, projectId, confirm) {
  assertAdmin(ctx);
  const pid = id(projectId);
  const paths = await db.transaction(async tx => {
    const p = await projects.byId(tx, pid);
    if (!p) throw err('NOT_FOUND');
    confirmName(confirm, p.name);
    const files = await documents.pathsOfProjects(tx, [pid]);
    await projects.remove(tx, pid);
    return files;
  });
  await removeFiles(paths);
  return { ok: true };
}

// A client: the company, all its projects, and its client accounts that
// belong to no other company (their sessions and links too). Admin accounts
// are never deleted here.
async function deleteClient(ctx, organizationId, confirm) {
  assertAdmin(ctx);
  const oid = id(organizationId);
  const out = await db.transaction(async tx => {
    const o = await orgs.byId(tx, oid);
    if (!o) throw err('NOT_FOUND');
    confirmName(confirm, o.name);
    const pids = await projects.idsOfOrganization(tx, oid);
    const files = await documents.pathsOfProjects(tx, pids);
    const people = await orgs.exclusiveClients(tx, oid);
    await orgs.remove(tx, oid);
    await users.removeClients(tx, people);
    return { files, projects: pids.length, accounts: people.length };
  });
  await removeFiles(out.files);
  return { ok: true, projects: out.projects, accounts: out.accounts };
}

// The 30-second update: stage + progress + update + next step in one go.
async function quickUpdate(ctx, projectId, input) {
  assertAdmin(ctx);
  const pid = id(projectId);
  input = input || {};
  // All fields are checked first: an invalid one changes nothing.
  if (input.stage) {
    oneOf(input.stage, S.STAGES, 'stage');
    if (input.stageStatus != null) oneOf(input.stageStatus, S.STAGE_STATUS, 'stageStatus');
    if (input.progress != null && input.progress !== '') int(input.progress, 0, 100, 'progress');
  }
  if (input.update != null) text(input.update, 2000, 'update');
  if (input.nextStep != null) text(input.nextStep, 600, 'nextStep');
  if (!(await projects.byId(q, pid))) throw err('NOT_FOUND');
  const out = {};
  if (input.stage) out.stage = await updateProjectStage(ctx, pid, input.stage, { status: input.stageStatus, progress: input.progress });
  if (input.update && String(input.update).trim()) out.update = await addProjectUpdate(ctx, pid, input.update, input.updateVisible !== false);
  if (input.nextStep != null) out.project = await setNextStep(ctx, pid, input.nextStep);
  return out;
}

module.exports = {
  err, UUID,
  // sign-in
  signIn, tokenInfo, acceptToken, requestPasswordReset,
  // client
  getClientPortal, getClientPreview, getDocumentLink,
  // admin
  getMyProfile, updateMyProfile, adminOverview, adminClients, createClient, deleteClient, deleteProject, updateClient, resendInvite,
  createProject, getProjectAdmin, updateProject, updateProjectStage, addProjectUpdate, setNextStep,
  recordPayment, updatePayment, deletePayment, setRequiredAction, resolveRequiredAction,
  requestDocumentUpload, uploadProjectDocument, updateDocument, deleteDocument, quickUpdate
};
