/* ==========================================================================
   Scalia Portal · session cookie and request context.
   One cookie, scalia_ps: an opaque random value (no data, no JWT),
   HttpOnly (page scripts cannot read it), Secure on HTTPS, SameSite=Lax,
   Path=/, 12 hours, and ended sooner after inactivity (auth.js IDLE). resolve() turns it into the ctx every business function
   takes: { user, admin }. The role comes from the database on every request.
   ========================================================================== */
'use strict';
const config = require('./config');
const auth = require('./auth');
const { portalError } = require('./errors');

const COOKIE = 'scalia_ps';

function cookies(req) {
  const out = {};
  String(req.headers.cookie || '').split(';').forEach(p => {
    const i = p.indexOf('=');
    if (i > 0) { try { out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); } catch (e) { /* malformed */ } }
  });
  return out;
}
function secure(req) {
  return !!(process.env.VERCEL || String(req.headers['x-forwarded-proto'] || '').split(',')[0] === 'https');
}
function serialize(req, value, maxAge) {
  return COOKIE + '=' + encodeURIComponent(value) + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' + maxAge + (secure(req) ? '; Secure' : '');
}
function setCookie(req, res, s) { res.setHeader('Set-Cookie', serialize(req, s.token, s.maxAge)); }
function clearCookie(req, res) { res.setHeader('Set-Cookie', serialize(req, '', 0)); }
const token = req => cookies(req)[COOKIE] || null;

const notConfigured = () => portalError('NOT_CONFIGURED');

// null when signed out, expired, or the account is disabled.
async function resolve(req, res) {
  if (!config.configured()) throw notConfigured();
  const raw = token(req);
  if (!raw) return null;
  const u = await auth.sessionUser(raw);
  if (!u) { if (res) clearCookie(req, res); return null; }
  const user = { id: u.id, email: u.email, role: u.role, preferred_locale: u.preferred_locale, first_name: u.first_name, last_name: u.last_name, phone: u.phone, whatsapp: u.whatsapp, title: u.title };
  return { user, admin: u.role === 'admin' };
}

// Where links in emails point: the production site, or this local server.
function siteUrl(req) {
  if (process.env.PORTAL_SITE_URL) return process.env.PORTAL_SITE_URL.replace(/\/+$/, '');
  if (process.env.VERCEL_ENV === 'production') return 'https://scalia.do';
  if (process.env.VERCEL_URL) return 'https://' + process.env.VERCEL_URL;
  const host = String(req.headers.host || 'localhost:4520');
  return (secure(req) ? 'https://' : 'http://') + host;
}

module.exports = { COOKIE, resolve, token, setCookie, clearCookie, siteUrl, notConfigured };
