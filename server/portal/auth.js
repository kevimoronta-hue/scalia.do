/* ==========================================================================
   Scalia Portal · authentication (server only)
   · Passwords: Argon2id (@node-rs/argon2, OWASP parameters: 19 MiB, t=2,
     p=1). Never stored or logged in clear; min 10 characters.
   · Sessions: a random 256-bit opaque value in an httpOnly cookie; the
     database keeps its SHA-256 only. 30 days, renewed use is tracked
     (last_used_at).
   · Invitation / reset links: random 256-bit token, SHA-256 in the
     database, one use, 24 h (invitation) / 1 h (reset). A new link
     cancels the previous ones.
   · Rate limits: fixed windows in the database (shared by every function
     instance), on sign-in, forgot password and link checks.
   ========================================================================== */
'use strict';
const crypto = require('crypto');
const argon2 = require('@node-rs/argon2');
const db = require('./db');
const authRepo = require('./repositories/auth');

const SESSION_TTL = 30 * 24 * 3600;
const TOKEN_TTL = { invite: 24 * 3600, reset: 3600 };
const MIN_PASSWORD = 10;
const MAX_PASSWORD = 128;
const ARGON = { algorithm: argon2.Algorithm.Argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 };

const sha256 = s => crypto.createHash('sha256').update(String(s)).digest('hex');
const randomToken = () => crypto.randomBytes(32).toString('base64url');

/* ------------------------------------------------------------ passwords */
const COMMON = new Set(['1234567890', '12345678910', '0123456789', 'password123', 'password1234', 'qwertyuiop', 'azertyuiop', 'motdepasse', 'contraseña', 'contrasena1', 'iloveyou12', 'scalia2026', 'scalia1234']);
// Length first; only refuses what is obviously guessable.
function passwordProblem(pw, email) {
  if (typeof pw !== 'string' || pw.length < MIN_PASSWORD || pw.length > MAX_PASSWORD) return 'PASSWORD_WEAK';
  const low = pw.toLowerCase();
  if (/^(.)\1+$/.test(pw) || COMMON.has(low)) return 'PASSWORD_WEAK';
  if (email && (low === String(email).toLowerCase() || low === String(email).toLowerCase().split('@')[0])) return 'PASSWORD_WEAK';
  return null;
}
const hashPassword = pw => argon2.hash(pw, ARGON);
async function verifyPassword(hash, pw) {
  try { return await argon2.verify(hash, pw); } catch (e) { return false; }
}
// Same work whether or not the account exists (no timing hint).
let dummy = null;
async function burn(pw) {
  if (!dummy) dummy = await hashPassword(randomToken());
  await verifyPassword(dummy, pw);
  return false;
}

/* ------------------------------------------------------------- sessions */
async function createSession(userId) {
  const raw = randomToken();
  await authRepo.createSession(db.pool, userId, sha256(raw), SESSION_TTL);
  if (Math.random() < 0.05) authRepo.purgeExpired(db.pool).catch(() => {});
  return { token: raw, maxAge: SESSION_TTL };
}
async function sessionUser(raw) {
  if (typeof raw !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(raw)) return null;
  const u = await authRepo.sessionUser(db.pool, sha256(raw));
  if (!u) return null;
  if (Date.now() - new Date(u.last_used_at).getTime() > 5 * 60e3) authRepo.touchSession(db.pool, u.session_id).catch(() => {});
  return u;
}
const destroySession = raw => typeof raw === 'string' ? authRepo.deleteSession(db.pool, sha256(raw)) : Promise.resolve();
const destroyUserSessions = (q, userId) => authRepo.deleteUserSessions(q || db.pool, userId);

/* --------------------------------------------------------------- tokens */
async function issueToken(q, userId, type, by) {
  const raw = randomToken();
  await authRepo.createToken(q, userId, type, sha256(raw), TOKEN_TTL[type], by);
  return raw;
}
function tokenHashOf(raw) {
  return typeof raw === 'string' && /^[A-Za-z0-9_-]{43}$/.test(raw) ? sha256(raw) : null;
}

/* ---------------------------------------------------------- rate limits */
// true when the key went over max hits in the window.
async function limited(key, max, windowSeconds) {
  try { return (await authRepo.hit(db.pool, key, windowSeconds)) > max; } catch (e) { console.error('[portal] rate limit', e.message); return false; }
}
const clearLimit = key => authRepo.clearHits(db.pool, key).catch(() => {});

module.exports = {
  SESSION_TTL, TOKEN_TTL, MIN_PASSWORD, sha256, randomToken,
  passwordProblem, hashPassword, verifyPassword, burn,
  createSession, sessionUser, destroySession, destroyUserSessions,
  issueToken, tokenHashOf, limited, clearLimit
};
