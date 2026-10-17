/* ==========================================================================
   /api/portal/?a=<action> · client portal (scalia.do/portal)
     POST login        { email, password }       → session cookie
     POST logout                                 → session deleted + cookie expired
     POST token-info   { token }                 → who the email link is for
     POST accept       { token, password }       → password set (invitation or
                                                   reset), link used, signed in
     POST forgot       { email, locale }         → reset email (same answer
                                                   whether or not the address
                                                   has an account)
     GET  me           [&project=<id>]           → the client's project view
     GET  file         &id=<document id>         → 302 to a 60-second link
   Writes: same-site Origin only. A client only ever reads their own
   organization's data (scoped in the SQL, server/portal/repositories).
   ========================================================================== */
'use strict';
const fs = require('fs');
const { send, ip } = require('../server/http');
const { router } = require('../server/portal/api');
const session = require('../server/portal/session');
const service = require('../server/portal/service');
const auth = require('../server/portal/auth');
const config = require('../server/portal/config');
const storage = require('../server/portal/storage');

const MIN = 60;

async function signedIn(req, res) {
  const ctx = await session.resolve(req, res);
  if (!ctx) throw service.err('UNAUTHENTICATED');
  return ctx;
}
// A new sign-in replaces the session this browser had, which is deleted.
async function dropPreviousSession(req) {
  try { await auth.destroySession(session.token(req)); } catch (e) { /* already gone */ }
}
function ready() { if (!config.configured()) throw session.notConfigured(); }
async function limit(key, max, seconds) {
  if (await auth.limited(key, max, seconds)) throw service.err('RATE_LIMITED', null, 429);
}

module.exports = router({
  login: {
    method: 'POST',
    async run(req, res, b) {
      ready();
      const email = String(b.email || '').trim().toLowerCase().slice(0, 254);
      // Per address and per network: slows a guessing attack on one account
      // and a spray over many accounts.
      await limit('login:ip:' + ip(req), 30, 15 * MIN);
      await limit('login:email:' + email, 8, 15 * MIN);
      const r = await service.signIn(email, b.password);
      await auth.clearLimit('login:email:' + email);
      await dropPreviousSession(req);
      session.setCookie(req, res, r.session);
      return { ok: true, role: r.role, locale: r.locale };
    }
  },

  logout: {
    method: 'POST',
    async run(req, res) {
      try { await auth.destroySession(session.token(req)); } catch (e) { /* signed out anyway */ }
      session.clearCookie(req, res);
      return { ok: true };
    }
  },

  'token-info': {
    method: 'POST',
    async run(req, res, b) {
      ready();
      await limit('token:ip:' + ip(req), 30, 15 * MIN);
      return service.tokenInfo(b.token);
    }
  },

  accept: {
    method: 'POST',
    async run(req, res, b) {
      ready();
      await limit('token:ip:' + ip(req), 30, 15 * MIN);
      const r = await service.acceptToken(b.token, b.password);
      await dropPreviousSession(req);
      session.setCookie(req, res, r.session);
      return { ok: true, role: r.role, locale: r.locale };
    }
  },

  forgot: {
    method: 'POST',
    async run(req, res, b) {
      ready();
      const email = String(b.email || '').trim().toLowerCase().slice(0, 254);
      await limit('forgot:ip:' + ip(req), 5, 15 * MIN);
      await limit('forgot:email:' + email, 3, 60 * MIN);
      return service.requestPasswordReset(email, session.siteUrl(req));
    }
  },

  me: {
    method: 'GET',
    async run(req, res) {
      const ctx = await signedIn(req, res);
      const project = req.query.project && service.UUID.test(req.query.project) ? req.query.project : null;
      // An admin opening /portal without a project goes to /admin; with
      // ?project= they see exactly what that client sees.
      if (ctx.admin && !project) return { admin: true, profile: { name: [ctx.user.first_name, ctx.user.last_name].filter(Boolean).join(' '), email: ctx.user.email, locale: ctx.user.preferred_locale, role: 'admin' } };
      const out = ctx.admin ? await service.getClientPreview(ctx, project) : await service.getClientPortal(ctx, project);
      return Object.assign(out, { admin: ctx.admin });
    }
  },

  file: {
    method: 'GET',
    async run(req, res) {
      const ctx = await signedIn(req, res);
      const url = await service.getDocumentLink(ctx, String(req.query.id || ''));
      res.statusCode = 302;
      res.setHeader('Location', url);
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Referrer-Policy', 'no-referrer');
      res.end();
    }
  },

  // PORTAL_MOCK=1 only: stand-ins for the signed Vercel Blob URLs.
  'mock-put': {
    method: 'PUT', raw: true,
    async run(req, res) {
      if (!config.mock()) return send(res, 404, { error: 'NOT_FOUND' });
      const chunks = [];
      let size = 0;
      for await (const c of req) { size += c.length; if (size > storage.MAX_BYTES) return send(res, 413, { error: 'FILE_TOO_LARGE' }); chunks.push(c); }
      const problem = storage.store().put(String(req.query.t || ''), Buffer.concat(chunks), String(req.headers['x-content-type'] || ''));
      return problem ? send(res, problem === 'FORBIDDEN' ? 403 : 400, { error: problem }) : { ok: true };
    }
  },
  'mock-get': {
    method: 'GET', raw: true,
    async run(req, res) {
      if (!config.mock()) return send(res, 404, { error: 'NOT_FOUND' });
      const f = storage.store().get(String(req.query.t || ''));
      if (!f) return send(res, 404, { error: 'NOT_FOUND' });
      res.statusCode = 200;
      res.setHeader('Content-Type', f.contentType);
      res.setHeader('Content-Disposition', 'attachment; filename="' + f.name + '"');
      fs.createReadStream(f.file).pipe(res);
    }
  }
});
