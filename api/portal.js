/* ==========================================================================
   /api/portal/?a=<action> · client portal (scalia.do/portal)
     POST login     { email, password }        → session cookies
     POST logout
     POST verify    { th, type }               → session from an email link
                                                 (invitation or new password)
     POST password  { password }               → set the password (signed in)
     POST forgot    { email, locale }          → new-password email (same
                                                 answer whether or not the
                                                 address has an account)
     GET  me        [&project=<id>]            → the client's project view
     GET  file      &id=<document id>          → 302 to a 60-second link
   A client only ever receives their own organization's data: the service
   checks it, and the database checks it again (RLS) because every query
   runs with the client's own session.
   ========================================================================== */
'use strict';
const fs = require('fs');
const { send, ip, limited } = require('../server/http');
const { router } = require('../server/portal/api');
const session = require('../server/portal/session');
const service = require('../server/portal/service');
const mock = require('../server/portal/mock');

const MIN_PASSWORD = 10;

async function signedIn(req, res) {
  const ctx = await session.resolve(req, res);
  if (!ctx) throw service.err('UNAUTHENTICATED');
  return ctx;
}

module.exports = router({
  login: {
    method: 'POST',
    async run(req, res, b) {
      const email = String(b.email || '').trim().toLowerCase();
      const password = typeof b.password === 'string' ? b.password : '';
      if (!email || !password || email.length > 254 || password.length > 200) throw service.err('INVALID_CREDENTIALS');
      if (limited('pl:' + ip(req), 12, 15 * 60e3) || limited('pl:' + email, 8, 15 * 60e3)) throw service.err('RATE_LIMITED', null, 429);
      const b_ = session.backend();
      if (!b_.configured()) throw service.err('NOT_CONFIGURED', null, 503);
      let s;
      try { s = await b_.auth.signIn(email, password); } catch (e) {
        if (e.status && e.status >= 500) throw e;
        throw service.err('INVALID_CREDENTIALS');
      }
      session.setSession(req, res, s);
      const [profile] = await b_.db(s.accessToken).select('profiles', { id: s.user.id });
      return { ok: true, role: profile ? profile.role : 'client', locale: profile ? profile.locale : null };
    }
  },

  logout: {
    method: 'POST',
    async run(req, res) {
      try {
        const ctx = await session.resolve(req, res);
        if (ctx) await ctx.backend.auth.signOut(ctx.token);
      } catch (e) { /* signed out anyway */ }
      session.clearSession(req, res);
      return { ok: true };
    }
  },

  verify: {
    method: 'POST',
    async run(req, res, b) {
      const th = String(b.th || '');
      const type = b.type === 'recovery' ? 'recovery' : b.type === 'invite' ? 'invite' : null;
      if (!type || !/^[A-Za-z0-9_-]{16,128}$/.test(th)) throw service.err('LINK_INVALID');
      if (limited('pv:' + ip(req), 20, 15 * 60e3)) throw service.err('RATE_LIMITED', null, 429);
      const b_ = session.backend();
      let s;
      try { s = await b_.auth.verify(th, type); } catch (e) {
        if (e.status && e.status >= 500) throw e;
        throw service.err('LINK_INVALID');
      }
      session.setSession(req, res, s);
      const [profile] = await b_.db(s.accessToken).select('profiles', { id: s.user.id });
      return { ok: true, email: s.user.email, name: profile ? profile.full_name : '', locale: profile ? profile.locale : null };
    }
  },

  password: {
    method: 'POST',
    async run(req, res, b) {
      const ctx = await signedIn(req, res);
      const pw = typeof b.password === 'string' ? b.password : '';
      if (pw.length < MIN_PASSWORD || pw.length > 128) throw service.err('PASSWORD_WEAK', 'password');
      try { await ctx.backend.auth.setPassword(ctx.token, pw); } catch (e) {
        if (e.status && e.status >= 500) throw e;
        throw service.err('PASSWORD_WEAK', 'password');
      }
      return { ok: true, role: ctx.profile.role };
    }
  },

  forgot: {
    method: 'POST',
    async run(req, res, b) {
      if (limited('pf:' + ip(req), 5, 15 * 60e3)) throw service.err('RATE_LIMITED', null, 429);
      const b_ = session.backend();
      if (!b_.configured()) throw service.err('NOT_CONFIGURED', null, 503);
      return service.requestPasswordReset(b_, b.email, b.locale, session.siteUrl(req));
    }
  },

  me: {
    method: 'GET',
    async run(req, res) {
      const ctx = await signedIn(req, res);
      const project = req.query.project && service.UUID.test(req.query.project) ? req.query.project : null;
      // An admin opening /portal without a project goes to /admin; with
      // ?project= they see exactly what that client sees.
      if (ctx.admin && !project) return { admin: true, profile: { name: ctx.profile.full_name, email: ctx.profile.email, locale: ctx.profile.locale, role: 'admin' } };
      const out = await service.getClientPortal(ctx, project);
      // Admin preview: only the project asked for, never the whole list.
      if (ctx.admin) out.projects = out.current ? [{ id: out.current.project.id, name: out.current.project.name }] : [];
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

  // Local test backend only: stand-ins for the Supabase Storage URLs.
  'mock-put': {
    method: 'PUT', raw: true,
    async run(req, res) {
      if (!mock.enabled()) return send(res, 404, { error: 'NOT_FOUND' });
      const chunks = [];
      let size = 0;
      for await (const c of req) { size += c.length; if (size > 52428800) return send(res, 413, { error: 'FILE_TOO_LARGE' }); chunks.push(c); }
      const ok = mock.putFile(String(req.query.t || ''), Buffer.concat(chunks), String(req.headers['content-type'] || ''));
      return ok ? { ok: true } : send(res, 403, { error: 'FORBIDDEN' });
    }
  },
  'mock-get': {
    method: 'GET', raw: true,
    async run(req, res) {
      if (!mock.enabled()) return send(res, 404, { error: 'NOT_FOUND' });
      const f = mock.getFile(String(req.query.t || ''));
      if (!f) return send(res, 404, { error: 'NOT_FOUND' });
      res.statusCode = 200;
      res.setHeader('Content-Type', f.mime);
      res.setHeader('Content-Disposition', 'attachment; filename="' + f.name.replace(/[^A-Za-z0-9._-]/g, '_') + '"');
      fs.createReadStream(f.file).pipe(res);
    }
  }
});
