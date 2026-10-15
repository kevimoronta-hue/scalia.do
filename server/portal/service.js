/* ==========================================================================
   Scalia Portal · business functions: the ONLY way portal data changes.
   The admin API calls them today; a Scalia agent can call the same ones
   later ("move Top Advertising's development to 70 %", "record a 350 €
   payment"), never raw table writes.
   Every function takes ctx = { backend, token, user, profile, admin }
   (server/portal/session.js) and checks permissions itself; the database
   checks them a second time (RLS, schema.sql), because every read and
   write runs with the caller's own session, never with the secret key.
   Errors: thrown with .code (FORBIDDEN, NOT_FOUND, INVALID, EMAIL_EXISTS…),
   .field for a form field.
   ========================================================================== */
'use strict';
const crypto = require('crypto');
const S = require('./stages');
const portalMail = require('./mail');

function err(code, field, status) {
  const e = new Error(code);
  e.code = code;
  if (field) e.field = field;
  e.status = status || (code === 'FORBIDDEN' ? 403 : code === 'NOT_FOUND' ? 404 : code === 'UNAUTHENTICATED' ? 401 : 400);
  return e;
}
function assertAdmin(ctx) {
  if (!ctx || !ctx.user) throw err('UNAUTHENTICATED');
  if (!ctx.admin) throw err('FORBIDDEN');
}
function assertUser(ctx) { if (!ctx || !ctx.user) throw err('UNAUTHENTICATED'); }
const db = ctx => ctx.backend.db(ctx.token);

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
function date(v, field) {
  if (v == null || v === '') return null;
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v) || isNaN(Date.parse(v + 'T00:00:00Z'))) throw err('INVALID', field);
  return v;
}
function money(v, field, allowZero) {
  const n = typeof v === 'number' ? v : Number(String(v == null ? '' : v).replace(/\s/g, '').replace(',', '.'));
  if (!isFinite(n) || n < 0 || (!allowZero && n === 0) || n > 9999999999) throw err('INVALID', field);
  return Math.round(n * 100) / 100;
}
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
const cents = n => Math.round(Number(n || 0) * 100);

/* --------------------------------------------------------------- reading */
async function loadProjectBundle(ctx, projectId) {
  const d = db(ctx);
  const [project] = await d.select('projects', { id: projectId });
  if (!project) throw err('NOT_FOUND');                         // RLS: not yours = not there
  const [orgs, stages, updates, payments, documents, actions] = await Promise.all([
    d.select('organizations', { id: project.organization_id }),
    d.select('project_stages', { project_id: projectId }),
    d.select('project_updates', { project_id: projectId }, { order: [{ col: 'created_at', desc: true }], limit: 30 }),
    d.select('payments', { project_id: projectId }, { order: [{ col: 'created_at', desc: false }] }),
    d.select('documents', { project_id: projectId }, { order: [{ col: 'created_at', desc: true }] }),
    d.select('project_actions', { project_id: projectId }, { order: [{ col: 'created_at', desc: true }] })
  ]);
  const contact = project.contact_id ? (await d.select('profiles', { id: project.contact_id }))[0] || null : null;
  return { project, organization: orgs[0] || null, stages: S.ordered(stages), updates, payments, documents, actions, contact };
}

function money_(project, payments) {
  const total = cents(project.total_amount);
  const paid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + cents(p.amount), 0);
  return { currency: project.currency, total: total / 100, paid: paid / 100, remaining: Math.max(0, total - paid) / 100 };
}
function paymentState(m) {
  if (m.total > 0 && m.remaining === 0) return 'paid';
  if (m.paid > 0) return 'partial';
  return 'unpaid';
}

// What a client sees: never internal rows, never another organization's.
function clientView(b) {
  const p = b.project;
  const m = money_(p, b.payments);
  const visibleDocs = b.documents.filter(x => x.visible_to_client);
  const doc = x => ({ id: x.id, title: x.title, category: x.category, fileName: x.file_name, size: Number(x.size_bytes) || 0, createdAt: x.created_at });
  const contract = visibleDocs.find(x => x.category === 'contract') || null;
  const latest = b.updates.filter(u => u.visible_to_client)[0] || null;
  return {
    project: {
      id: p.id, name: p.name, type: p.type, status: p.status, locale: p.preferred_locale,
      startDate: p.start_date, estimatedDeliveryDate: p.estimated_delivery_date, domain: p.domain,
      languages: p.languages || [], currentStage: S.current(b.stages), nextStep: p.next_step, updatedAt: p.updated_at
    },
    company: b.organization ? b.organization.name : '',
    progress: S.overall(b.stages),
    stages: b.stages.map(s => ({ key: s.stage_key, status: s.status, progress: s.status === 'completed' ? 100 : s.status === 'upcoming' ? 0 : s.progress, note: s.note, updatedAt: s.updated_at })),
    latestUpdate: latest ? { content: latest.content, createdAt: latest.created_at } : null,
    updates: b.updates.filter(u => u.visible_to_client).slice(0, 6).map(u => ({ content: u.content, createdAt: u.created_at })),
    actions: b.actions.filter(a => a.status === 'open').map(a => ({ id: a.id, title: a.title, description: a.description, kind: a.kind, createdAt: a.created_at })),
    payments: Object.assign(m, {
      state: paymentState(m),
      items: b.payments.map(x => ({ id: x.id, label: x.label, amount: Number(x.amount), currency: x.currency, status: x.status, paidAt: x.paid_at }))
    }),
    contract: contract ? doc(contract) : null,
    documents: visibleDocs.filter(x => x !== contract).map(doc),
    contact: b.contact ? { name: b.contact.full_name, title: b.contact.title, email: b.contact.email, whatsapp: b.contact.whatsapp || b.contact.phone } : null
  };
}

// The signed-in client's projects, and the one to show.
async function getClientPortal(ctx, projectId) {
  assertUser(ctx);
  const d = db(ctx);
  const projects = await d.select('projects', {}, { order: [{ col: 'created_at', desc: true }] });
  if (!projects.length) return { profile: profileView(ctx.profile), projects: [], current: null };
  const pick = (projectId && projects.find(p => p.id === projectId)) || projects.find(p => p.status === 'active') || projects[0];
  const b = await loadProjectBundle(ctx, pick.id);
  return {
    profile: profileView(ctx.profile),
    projects: projects.map(p => ({ id: p.id, name: p.name })),
    current: clientView(b)
  };
}
function profileView(p) {
  return p ? { name: p.full_name, email: p.email, locale: p.locale, role: p.role } : null;
}

// A short-lived link to one of the client's files (storage policy applies).
async function getDocumentLink(ctx, documentId) {
  assertUser(ctx);
  const [doc] = await db(ctx).select('documents', { id: id(documentId) });
  if (!doc) throw err('NOT_FOUND');
  if (!ctx.admin && !doc.visible_to_client) throw err('NOT_FOUND');
  return ctx.backend.storage(ctx.token).signedUrl(doc.storage_path, 60, doc.file_name);
}

/* ----------------------------------------------------------------- admin */
async function adminOverview(ctx) {
  assertAdmin(ctx);
  const d = db(ctx);
  const [projects, orgs, stages, payments, actions] = await Promise.all([
    d.select('projects', {}, { order: [{ col: 'updated_at', desc: true }] }),
    d.select('organizations', {}),
    d.select('project_stages', {}),
    d.select('payments', {}),
    d.select('project_actions', { status: 'open' })
  ]);
  const orgName = {};
  orgs.forEach(o => { orgName[o.id] = o.name; });
  return projects.map(p => {
    const st = stages.filter(s => s.project_id === p.id);
    const m = money_(p, payments.filter(x => x.project_id === p.id));
    return {
      id: p.id, name: p.name, company: orgName[p.organization_id] || '', organizationId: p.organization_id, status: p.status,
      progress: S.overall(st), currentStage: S.current(st), currency: p.currency,
      money: Object.assign(m, { state: paymentState(m) }),
      openActions: actions.filter(a => a.project_id === p.id).map(a => a.title),
      updatedAt: p.updated_at
    };
  });
}

async function adminClients(ctx) {
  assertAdmin(ctx);
  const d = db(ctx);
  const [orgs, members, profiles, projects] = await Promise.all([
    d.select('organizations', {}, { order: [{ col: 'name' }] }),
    d.select('organization_members', {}),
    d.select('profiles', {}),
    d.select('projects', {}, { order: [{ col: 'created_at', desc: true }] })
  ]);
  return {
    clients: orgs.map(o => ({
      id: o.id, company: o.name, createdAt: o.created_at,
      contacts: members.filter(m => m.organization_id === o.id).map(m => {
        const p = profiles.find(x => x.id === m.user_id) || {};
        return { userId: m.user_id, name: p.full_name || '', email: p.email || '', phone: p.phone || '', locale: p.locale || 'es' };
      }),
      projects: projects.filter(p => p.organization_id === o.id).map(p => ({ id: p.id, name: p.name, status: p.status }))
    })),
    team: profiles.filter(p => p.role === 'admin').map(p => ({ id: p.id, name: p.full_name || p.email, email: p.email, title: p.title }))
  };
}

async function sendAccessEmail(ctx, opts) {
  const link = await ctx.backend.auth.generateLink(opts.type, opts.email, opts.meta);
  const url = opts.siteUrl + '/portal/welcome/?th=' + encodeURIComponent(link.tokenHash) + '&type=' + link.type + '&lang=' + opts.locale;
  await portalMail.send(ctx.backend, portalMail.accessMail({ to: opts.email, locale: opts.locale, name: opts.name, company: opts.company, url, kind: link.type === 'recovery' ? 'reset' : 'invite' }));
  return link;
}

// New client = organization + its first contact + invitation email.
async function createClient(ctx, input, siteUrl) {
  assertAdmin(ctx);
  const company = line(input.company, 160, 'company', true);
  const name = line(input.contactName, 120, 'contactName', true);
  const email = line(input.email, 254, 'email', true).toLowerCase();
  if (!EMAIL.test(email)) throw err('INVALID', 'email');
  const phone = line(input.phone, 40, 'phone');
  const locale = oneOf(input.locale || 'es', S.LOCALES, 'locale');
  const d = db(ctx);
  // An address already invited (activated or not) is never invited twice:
  // "resend the invitation" is the way for that.
  if ((await d.select('profiles', { email })).length) throw err('EMAIL_EXISTS', 'email');

  let link;
  try {
    link = await sendAccessEmail(ctx, { type: 'invite', email, meta: { full_name: name, locale }, siteUrl, locale, name, company });
  } catch (e) {
    if (e.code === 'email_exists' || e.status === 422) throw err('EMAIL_EXISTS', 'email');
    throw e;
  }
  await d.update('profiles', { id: link.userId }, { full_name: name, phone, locale });
  const [org] = await d.insert('organizations', { name: company, created_by: ctx.user.id });
  await d.insert('organization_members', { organization_id: org.id, user_id: link.userId });
  return { id: org.id, company, userId: link.userId };
}

async function updateClient(ctx, organizationId, input) {
  assertAdmin(ctx);
  const d = db(ctx);
  const out = await d.update('organizations', { id: id(organizationId) }, { name: line(input.company, 160, 'company', true) });
  if (!out.length) throw err('NOT_FOUND');
  if (input.contact && input.contact.userId) {
    const c = input.contact;
    await d.update('profiles', { id: id(c.userId) }, {
      full_name: line(c.name, 120, 'contactName', true),
      phone: line(c.phone, 40, 'phone'),
      locale: oneOf(c.locale || 'es', S.LOCALES, 'locale')
    });
  }
  return out[0];
}

// Sends a new link: an invitation while the account is not activated, a
// "choose a new password" link once it is.
async function resendInvite(ctx, userId, siteUrl) {
  assertAdmin(ctx);
  const d = db(ctx);
  const [p] = await d.select('profiles', { id: id(userId) });
  if (!p) throw err('NOT_FOUND');
  const [m] = await d.select('organization_members', { user_id: p.id });
  const org = m ? (await d.select('organizations', { id: m.organization_id }))[0] : null;
  const base = { email: p.email, siteUrl, locale: p.locale, name: p.full_name, company: org ? org.name : '' };
  try {
    await sendAccessEmail(ctx, Object.assign({ type: 'invite', meta: { full_name: p.full_name, locale: p.locale } }, base));
    return { sent: 'invite' };
  } catch (e) {
    if (!(e.code === 'email_exists' || e.status === 422)) throw e;
  }
  await sendAccessEmail(ctx, Object.assign({ type: 'recovery' }, base));
  return { sent: 'reset' };
}

// Public "forgot password": always the same answer, whether or not the
// address has an account.
async function requestPasswordReset(backend, email, locale, siteUrl) {
  email = String(email || '').trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 254) throw err('INVALID', 'email');
  locale = S.LOCALES.includes(locale) ? locale : 'es';
  try {
    const link = await backend.auth.generateLink('recovery', email);
    const url = siteUrl + '/portal/welcome/?th=' + encodeURIComponent(link.tokenHash) + '&type=recovery&lang=' + locale;
    await portalMail.send(backend, portalMail.accessMail({ to: email, locale, name: '', company: '', url, kind: 'reset' }));
  } catch (e) {
    if (!(e.status === 404 || e.status === 422 || /not_found/.test(e.code || ''))) console.error('[portal] reset', e.code || e.message);
  }
  return { ok: true };
}

function projectFields(input, partial) {
  const out = {};
  const has = k => !partial || Object.prototype.hasOwnProperty.call(input, k);
  if (has('name')) out.name = line(input.name, 160, 'name', true);
  if (has('type')) out.type = line(input.type, 80, 'type');
  if (has('status')) out.status = oneOf(input.status || 'active', S.PROJECT_STATUS, 'status');
  if (has('currency')) out.currency = oneOf(input.currency || 'EUR', S.CURRENCIES, 'currency');
  if (has('totalAmount')) out.total_amount = money(input.totalAmount, 'totalAmount', true);
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

// New project with the five standard stages (brief starts in progress).
async function createProject(ctx, organizationId, input) {
  assertAdmin(ctx);
  const d = db(ctx);
  const orgId = id(organizationId, 'organizationId');
  const [org] = await d.select('organizations', { id: orgId });
  if (!org) throw err('NOT_FOUND');
  const fields = projectFields(input, false);
  const [p] = await d.insert('projects', Object.assign(fields, { organization_id: orgId, current_stage: 'brief' }));
  await d.insert('project_stages', S.STAGES.map((k, i) => ({ project_id: p.id, stage_key: k, position: i + 1, status: i === 0 ? 'in_progress' : 'upcoming', progress: 0 })));
  return p;
}

async function getProjectAdmin(ctx, projectId) {
  assertAdmin(ctx);
  const b = await loadProjectBundle(ctx, id(projectId));
  const m = money_(b.project, b.payments);
  return Object.assign(b, { progress: S.overall(b.stages), currentStage: S.current(b.stages), money: Object.assign(m, { state: paymentState(m) }) });
}

async function updateProject(ctx, projectId, input) {
  assertAdmin(ctx);
  const pid = id(projectId);
  const fields = projectFields(input || {}, true);
  // Paid and remaining amounts are sums in one currency: it is fixed once
  // a payment exists.
  if (fields.currency) {
    const [cur] = await db(ctx).select('projects', { id: pid });
    if (!cur) throw err('NOT_FOUND');
    if (cur.currency !== fields.currency && (await db(ctx).select('payments', { project_id: pid })).length) throw err('CURRENCY_LOCKED', 'currency');
  }
  const out = await db(ctx).update('projects', { id: pid }, fields);
  if (!out.length) throw err('NOT_FOUND');
  return out[0];
}

async function syncCurrentStage(ctx, projectId) {
  const d = db(ctx);
  const stages = await d.select('project_stages', { project_id: projectId });
  await d.update('projects', { id: projectId }, { current_stage: S.current(stages) });
  return { progress: S.overall(stages), currentStage: S.current(stages) };
}

// "Development at 70 %": status and/or progress of one stage.
async function updateProjectStage(ctx, projectId, stageKey, input) {
  assertAdmin(ctx);
  const pid = id(projectId);
  oneOf(stageKey, S.STAGES, 'stage');
  const patch = {};
  if (input.status != null) patch.status = oneOf(input.status, S.STAGE_STATUS, 'status');
  if (input.progress != null && input.progress !== '') patch.progress = int(input.progress, 0, 100, 'progress');
  if (input.note != null) patch.note = text(input.note, 400, 'note');
  if (patch.status === 'completed') patch.progress = 100;
  if (patch.status === 'upcoming') patch.progress = 0;
  // A progress above 0 on an upcoming stage starts it.
  if (patch.status == null && patch.progress > 0) {
    const [cur] = await db(ctx).select('project_stages', { project_id: pid, stage_key: stageKey });
    if (cur && cur.status === 'upcoming') patch.status = 'in_progress';
  }
  const out = await db(ctx).update('project_stages', { project_id: pid, stage_key: stageKey }, patch);
  if (!out.length) throw err('NOT_FOUND');
  return Object.assign({ stage: out[0] }, await syncCurrentStage(ctx, pid));
}

async function addProjectUpdate(ctx, projectId, content, visibleToClient) {
  assertAdmin(ctx);
  const pid = id(projectId);
  const [p] = await db(ctx).select('projects', { id: pid });
  if (!p) throw err('NOT_FOUND');
  const [u] = await db(ctx).insert('project_updates', { project_id: pid, content: text(content, 2000, 'content', true), visible_to_client: visibleToClient !== false, created_by: ctx.user.id });
  await db(ctx).update('projects', { id: pid }, { updated_at: new Date().toISOString() });
  return u;
}

async function setNextStep(ctx, projectId, nextStep) {
  return updateProject(ctx, projectId, { nextStep });
}

function paymentFields(input, partial, currency) {
  const out = {};
  const has = k => !partial || Object.prototype.hasOwnProperty.call(input, k);
  if (has('label')) out.label = line(input.label, 120, 'label', true);
  if (has('amount')) out.amount = money(input.amount, 'amount', false);
  if (has('status')) out.status = oneOf(input.status || 'pending', ['pending', 'paid'], 'status');
  if (has('paidAt')) out.paid_at = date(input.paidAt, 'paidAt');
  if (has('notes')) out.notes = text(input.notes, 500, 'notes');
  if (out.status === 'paid' && !out.paid_at && !partial) out.paid_at = new Date().toISOString().slice(0, 10);
  if (currency) out.currency = currency;
  return out;
}

// Payments are always in the project's currency.
async function recordPayment(ctx, projectId, input) {
  assertAdmin(ctx);
  const pid = id(projectId);
  const [p] = await db(ctx).select('projects', { id: pid });
  if (!p) throw err('NOT_FOUND');
  const [row] = await db(ctx).insert('payments', Object.assign(paymentFields(input, false, p.currency), { project_id: pid }));
  return row;
}
async function updatePayment(ctx, paymentId, input) {
  assertAdmin(ctx);
  const patch = paymentFields(input, true);
  if (patch.status === 'paid' && !('paid_at' in patch)) patch.paid_at = new Date().toISOString().slice(0, 10);
  if (patch.status === 'pending') patch.paid_at = null;
  const out = await db(ctx).update('payments', { id: id(paymentId) }, patch);
  if (!out.length) throw err('NOT_FOUND');
  return out[0];
}
async function deletePayment(ctx, paymentId) {
  assertAdmin(ctx);
  const out = await db(ctx).remove('payments', { id: id(paymentId) });
  if (!out.length) throw err('NOT_FOUND');
  return { ok: true };
}

// "Action required": shown to the client until resolved.
async function setRequiredAction(ctx, projectId, input) {
  assertAdmin(ctx);
  const pid = id(projectId);
  const [p] = await db(ctx).select('projects', { id: pid });
  if (!p) throw err('NOT_FOUND');
  const [a] = await db(ctx).insert('project_actions', {
    project_id: pid, title: line(input.title, 160, 'title', true), description: text(input.description, 800, 'description'),
    kind: 'info', created_by: ctx.user.id
  });
  return a;
}
async function resolveRequiredAction(ctx, actionId) {
  assertAdmin(ctx);
  const out = await db(ctx).update('project_actions', { id: id(actionId) }, { status: 'resolved', resolved_at: new Date().toISOString(), resolved_by: ctx.user.id });
  if (!out.length) throw err('NOT_FOUND');
  return out[0];
}

function safeName(n) {
  const s = String(n || 'file').normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(-90);
  return s || 'file';
}
// Step 1 of an upload: a one-time URL; the browser sends the file there.
async function requestDocumentUpload(ctx, projectId, fileName, size) {
  assertAdmin(ctx);
  const pid = id(projectId);
  const [p] = await db(ctx).select('projects', { id: pid });
  if (!p) throw err('NOT_FOUND');
  if (!(Number(size) > 0) || Number(size) > 50 * 1024 * 1024) throw err('FILE_TOO_LARGE', 'file');
  const path = pid + '/' + crypto.randomUUID() + '-' + safeName(fileName);
  const up = await ctx.backend.storage(ctx.token).uploadUrl(path);
  return { path, uploadUrl: up.url, method: up.method };
}
// Step 2: the file is there; record it.
async function uploadProjectDocument(ctx, projectId, input) {
  assertAdmin(ctx);
  const pid = id(projectId);
  const path = String(input.path || '');
  if (!path.startsWith(pid + '/') || !/^[0-9a-f-]{36}\/[0-9a-f-]{36}-[A-Za-z0-9._-]{1,90}$/.test(path)) throw err('INVALID', 'path');
  const stat = await ctx.backend.storage(ctx.token).stat(path);
  if (!stat) throw err('UPLOAD_MISSING', 'file');
  const fileName = line(input.fileName, 160, 'fileName') || path.split('/')[1].slice(37);
  const [doc] = await db(ctx).insert('documents', {
    project_id: pid,
    title: line(input.title, 160, 'title') || fileName,
    category: oneOf(input.category || 'other', S.DOC_CATEGORIES, 'category'),
    storage_path: path, file_name: fileName, mime_type: stat.mime, size_bytes: stat.size,
    visible_to_client: input.visibleToClient !== false, uploaded_by: ctx.user.id
  });
  return doc;
}
async function updateDocument(ctx, documentId, input) {
  assertAdmin(ctx);
  const patch = {};
  if ('title' in input) patch.title = line(input.title, 160, 'title', true);
  if ('category' in input) patch.category = oneOf(input.category, S.DOC_CATEGORIES, 'category');
  if ('visibleToClient' in input) patch.visible_to_client = bool(input.visibleToClient);
  const out = await db(ctx).update('documents', { id: id(documentId) }, patch);
  if (!out.length) throw err('NOT_FOUND');
  return out[0];
}
async function deleteDocument(ctx, documentId) {
  assertAdmin(ctx);
  const out = await db(ctx).remove('documents', { id: id(documentId) });
  if (!out.length) throw err('NOT_FOUND');
  await ctx.backend.storage(ctx.token).remove(out[0].storage_path);
  return { ok: true };
}

// The 30-second update: stage + progress + update + next step in one go.
async function quickUpdate(ctx, projectId, input) {
  assertAdmin(ctx);
  const pid = id(projectId);
  const out = {};
  if (input.stage) out.stage = await updateProjectStage(ctx, pid, input.stage, { status: input.stageStatus, progress: input.progress });
  if (input.update && String(input.update).trim()) out.update = await addProjectUpdate(ctx, pid, input.update, input.updateVisible !== false);
  if (input.nextStep != null) out.project = await setNextStep(ctx, pid, input.nextStep);
  return out;
}

module.exports = {
  err, UUID,
  // client
  getClientPortal, getDocumentLink, requestPasswordReset,
  // admin
  adminOverview, adminClients, createClient, updateClient, resendInvite,
  createProject, getProjectAdmin, updateProject, updateProjectStage, addProjectUpdate, setNextStep,
  recordPayment, updatePayment, deletePayment, setRequiredAction, resolveRequiredAction,
  requestDocumentUpload, uploadProjectDocument, updateDocument, deleteDocument, quickUpdate
};
