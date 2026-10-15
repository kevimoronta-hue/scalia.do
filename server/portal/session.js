/* ==========================================================================
   Scalia Portal · backend choice and session cookies.
   The Supabase session lives in two httpOnly cookies the page's scripts
   cannot read (scalia_pa: access token, scalia_pr: refresh token). Every
   API call resolves them into ctx = { backend, token, user, profile, admin }
   for server/portal/service.js; an expired access token is refreshed once.
   The role comes from the database (profiles.role), never from the URL or
   the browser.
   ========================================================================== */
'use strict';
const supabase = require('./supabase');
const mock = require('./mock');

const ACCESS = 'scalia_pa';
const REFRESH = 'scalia_pr';
const MAX_AGE = 30 * 24 * 3600;                 // refresh token lifetime on our side

function backend() { return mock.enabled() ? mock : supabase; }

function cookies(req) {
  const out = {};
  String(req.headers.cookie || '').split(';').forEach(p => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function secure(req) {
  return !!(process.env.VERCEL || String(req.headers['x-forwarded-proto'] || '').split(',')[0] === 'https');
}
function cookie(req, name, value, maxAge) {
  return name + '=' + encodeURIComponent(value) + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' + maxAge + (secure(req) ? '; Secure' : '');
}
function setSession(req, res, s) {
  res.setHeader('Set-Cookie', [cookie(req, ACCESS, s.accessToken, MAX_AGE), cookie(req, REFRESH, s.refreshToken, MAX_AGE)]);
}
function clearSession(req, res) {
  res.setHeader('Set-Cookie', [cookie(req, ACCESS, '', 0), cookie(req, REFRESH, '', 0)]);
}

// null when signed out (or the session cannot be renewed).
async function resolve(req, res) {
  const b = backend();
  if (!b.configured()) { const e = new Error('NOT_CONFIGURED'); e.code = 'NOT_CONFIGURED'; e.status = 503; throw e; }
  const c = cookies(req);
  let token = c[ACCESS] || null;
  let user = null;
  if (token) {
    try { user = await b.auth.getUser(token); } catch (e) { if (e.status && e.status >= 500) throw e; user = null; }
  }
  if (!user && c[REFRESH]) {
    try {
      const s = await b.auth.refresh(c[REFRESH]);
      setSession(req, res, s);
      token = s.accessToken;
      user = s.user;
    } catch (e) {
      if (e.status && e.status >= 500) throw e;
      clearSession(req, res);
      return null;
    }
  }
  if (!user) return null;
  const [profile] = await b.db(token).select('profiles', { id: user.id });
  if (!profile) return null;
  return { backend: b, token, user, profile, admin: profile.role === 'admin' };
}

// Where links in emails point: the production site, or this local server.
function siteUrl(req) {
  if (process.env.PORTAL_SITE_URL) return process.env.PORTAL_SITE_URL.replace(/\/+$/, '');
  if (process.env.VERCEL_ENV === 'production') return 'https://scalia.do';
  if (process.env.VERCEL_URL) return 'https://' + process.env.VERCEL_URL;
  const host = String(req.headers.host || 'localhost:4520');
  return (secure(req) ? 'https://' : 'http://') + host;
}

module.exports = { backend, resolve, setSession, clearSession, siteUrl, ACCESS, REFRESH };
