/* ==========================================================================
   Scalia Portal · sessions, one-time tokens, rate limits.
   Only SHA-256 hashes of the session cookie and of the email tokens are
   stored: a database leak gives no usable session or link.
   ========================================================================== */
'use strict';

/* ------------------------------------------------------------- sessions */
const createSession = (q, userId, tokenHash, ttlSeconds) => q.one(
  "insert into sessions (user_id, token_hash, expires_at) values ($1, $2, now() + make_interval(secs => $3)) returning id, expires_at", [userId, tokenHash, ttlSeconds]);
// Valid session + its active user, in one query.
const sessionUser = (q, tokenHash) => q.one(
  'select s.id as session_id, s.last_used_at, u.id, u.email, u.role, u.preferred_locale, u.first_name, u.last_name, u.phone, u.whatsapp, u.title ' +
  'from sessions s join users u on u.id = s.user_id where s.token_hash = $1 and s.expires_at > now() and u.is_active', [tokenHash]);
const touchSession = (q, sessionId) => q.query('update sessions set last_used_at = now() where id = $1', [sessionId]);
const deleteSession = (q, tokenHash) => q.query('delete from sessions where token_hash = $1', [tokenHash]);
const deleteUserSessions = (q, userId) => q.query('delete from sessions where user_id = $1', [userId]);
// Housekeeping, now and then (auth.createSession): expired sessions, old
// links, finished rate-limit windows.
async function purgeExpired(q) {
  await q.query("delete from sessions where expires_at < now() - interval '1 day'");
  await q.query("delete from auth_tokens where expires_at < now() - interval '30 days'");
  await q.query("delete from rate_limits where window_start < now() - interval '1 day'");
}

/* --------------------------------------------------------------- tokens */
// A new token cancels the earlier unused ones of the same kind.
async function createToken(q, userId, type, tokenHash, ttlSeconds, by) {
  await q.query('update auth_tokens set used_at = now() where user_id = $1 and type = $2 and used_at is null', [userId, type]);
  return q.one(
    'insert into auth_tokens (user_id, type, token_hash, expires_at, created_by) values ($1, $2, $3, now() + make_interval(secs => $4), $5) returning id, expires_at',
    [userId, type, tokenHash, ttlSeconds, by || null]);
}
// Read without using it (welcome page: "Welcome, María").
const peekToken = (q, tokenHash) => q.one(
  'select t.id, t.type, u.id as user_id, u.email, u.first_name, u.preferred_locale from auth_tokens t join users u on u.id = t.user_id ' +
  'where t.token_hash = $1 and t.used_at is null and t.expires_at > now()', [tokenHash]);
// Use it: atomic, a second call finds nothing.
const consumeToken = (q, tokenHash) => q.one(
  'update auth_tokens set used_at = now() where token_hash = $1 and used_at is null and expires_at > now() returning id, user_id, type', [tokenHash]);

/* ----------------------------------------------------------- rate limit */
// Fixed window: returns the number of hits in the current window.
async function hit(q, key, windowSeconds) {
  const r = await q.one(
    'insert into rate_limits (key, window_start, hits) values ($1, now(), 1) ' +
    'on conflict (key) do update set ' +
    "hits = case when rate_limits.window_start < now() - make_interval(secs => $2) then 1 else rate_limits.hits + 1 end, " +
    "window_start = case when rate_limits.window_start < now() - make_interval(secs => $2) then now() else rate_limits.window_start end " +
    'returning hits', [key, windowSeconds]);
  return r.hits;
}
const clearHits = (q, key) => q.query('delete from rate_limits where key = $1', [key]);

module.exports = { createSession, sessionUser, touchSession, deleteSession, deleteUserSessions, purgeExpired, createToken, peekToken, consumeToken, hit, clearHits };
