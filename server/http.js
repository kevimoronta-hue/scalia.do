/* Scalia Booking · request helpers: JSON, origin, rate limit, validation. */
'use strict';
const google = require('./google');
const mock = require('./mock');

// The calendar backend in use: the local test calendar, or Google.
function calendar() { return mock.enabled() ? mock : google; }

function send(res, status, body, headers) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  for (const k in headers || {}) res.setHeader(k, headers[k]);
  res.end(JSON.stringify(body));
}

async function readJson(req, limit) {
  if (req.body && typeof req.body === 'object') return req.body;        // Vercel pre-parsed
  if (typeof req.body === 'string') return JSON.parse(req.body);
  let size = 0;
  const chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > limit) throw new Error('too_large');
    chunks.push(c);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

function ip(req) {
  const xf = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return xf || (req.socket && req.socket.remoteAddress) || 'unknown';
}

// Same-site requests only. Local hosts are accepted outside production.
function originOk(req) {
  const o = req.headers.origin;
  if (!o) return false;
  let host;
  try { host = new URL(o).hostname; } catch (e) { return false; }
  if (host === 'scalia.do' || host === 'www.scalia.do') return true;
  if (process.env.VERCEL_ENV === 'production') return false;
  if (process.env.VERCEL_URL && host === process.env.VERCEL_URL) return true;   // preview deployments
  return /^(localhost|127\.0\.0\.1|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/.test(host);
}

// LOCAL limit only: counters live in the memory of one warm function
// instance. Vercel may run several instances and recycles them, so this is
// a burst stopper for a single client hitting one instance, NOT a global
// limit. The global limit belongs to Vercel Firewall (a rate-limit rule on
// /api/book) or to a shared store.
const hits = new Map();
function limited(key, max, windowMs) {
  const now = Date.now();
  const list = (hits.get(key) || []).filter(t => now - t < windowMs);
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) hits.clear();
  return list.length > max;
}

const EMAIL = /^[^\s@<>()",;:]{1,64}@[A-Za-z0-9.-]{1,253}\.[A-Za-z]{2,24}$/;
// One-line text (name, phone, company): every control character, line
// breaks included, becomes a space, so a value can never start a new email
// header. Then blanks collapse.
function clean(v, max) {
  if (v == null) return '';
  if (typeof v !== 'string') return null;
  const s = v.replace(/[\u0000-\u001F\u007F\u2028\u2029]/g, ' ').replace(/\s+/g, ' ').trim();
  return s.length > max ? null : s;
}

module.exports = { calendar, send, readJson, ip, originOk, limited, EMAIL, clean };
