/* ==========================================================================
   Scalia · emails sent at most once (idempotence in Postgres, table
   mail_events, migration server/portal/migrations/002_mail_events.sql).
   once({ key, type, recipient }, sendFn):
     1. claim the key: INSERT … ON CONFLICT, atomic. A key already
        "processing" or "completed" is never claimed again, so two requests
        (a retry, two tabs, two simultaneous POSTs) send one email. A
        "failed" key is claimed again (attempts + 1).
     2. send.
     3. provider accepted → "completed" at once, before anything else.
        Provider refused (an HTTP error answer) → "failed": a retry may
        send. No answer (timeout, network) → stays "processing": the email
        may be gone, it is never resent automatically (logged as
        ambiguous; scripts/mail-config-check.mjs lists those rows).
   Without the database layer (server/portal/, with DATABASE_URL /
   POSTGRES_URL, or PORTAL_MOCK=1 locally), or if it cannot be reached, the email is sent as before,
   without deduplication, and a warning is logged.
   Logs: event type, masked key, provider, status. Never content.
   ========================================================================== */
'use strict';
// The database layer ships with the client portal (server/portal/). Until
// it is there, or without a database, emails go out without deduplication.
function portal(name) { try { return require('./portal/' + name); } catch (e) { return null; } }

let warned = false;
function enabled() {
  const config = portal('config');
  const on = !!config && (config.mock() || !!config.databaseUrl());
  if (!on && !warned) { warned = true; console.warn('[mail] no database configured: emails are sent without deduplication (mail_events)'); }
  return on;
}
const db = () => portal('db');
const mask = k => String(k).replace(/([0-9a-f]{8})-[0-9a-f-]{27}/gi, '$1…');
function log(type, key, status, extra) { console.log('[mail] ' + type + ' ' + mask(key) + ' ' + status + (extra ? ' ' + extra : '')); }

// Owned → { owned: true }; else { owned: false, status }.
async function claim(key, type, recipient) {
  const row = await db().one(
    "insert into mail_events (event_key, event_type, recipient, status) values ($1, $2, $3, 'processing') " +
    "on conflict (event_key) do update set status = 'processing', attempts = mail_events.attempts + 1, error = '', updated_at = now() " +
    "where mail_events.status = 'failed' returning id", [key, type, String(recipient || '').slice(0, 254)]);
  if (row) return { owned: true };
  const cur = await db().one('select status from mail_events where event_key = $1', [key]);
  return { owned: false, status: cur ? cur.status : 'processing' };
}
async function mark(key, status, fields) {
  fields = fields || {};
  await db().query('update mail_events set status = $2, provider = $3, provider_message_id = $4, error = $5, updated_at = now() where event_key = $1',
    [key, status, String(fields.provider || '').slice(0, 20), String(fields.id || '').slice(0, 200), String(fields.error || '').slice(0, 200)]);
}
// An HTTP error answer from the provider: the email was not accepted.
const definite = e => !!(e && e.status && e.status >= 400);

// result: { status: 'sent' | 'completed' | 'processing' | 'duplicate', … }
async function once(ev, sendFn) {
  if (!enabled()) { const r = await sendFn(); log(ev.type, ev.key, 'sent', r && r.provider); return { status: 'sent', provider: r && r.provider }; }
  let c;
  try { c = await api.claim(ev.key, ev.type, ev.recipient); }
  catch (e) {
    // Database unreachable: receiving the email matters more than
    // deduplicating it. Sent without a record, logged.
    console.error('[mail] mail_events unavailable, sending without deduplication', e.code || e.message);
    const r = await sendFn();
    log(ev.type, ev.key, 'sent-unrecorded', r && r.provider);
    return { status: 'sent', provider: r && r.provider };
  }
  if (!c.owned) { log(ev.type, ev.key, 'skipped', c.status); return { status: 'duplicate', previous: c.status }; }
  let r;
  try { r = await sendFn(); }
  catch (e) {
    if (definite(e)) {
      try { await api.mark(ev.key, 'failed', { error: e.message }); } catch (m) { console.error('[mail] mark failed', m.message); }
      log(ev.type, ev.key, 'failed', e.status);
    } else {
      log(ev.type, ev.key, 'ambiguous', e.code || 'no-answer');   // stays "processing"
    }
    throw e;
  }
  // Sent: recorded before anything else can fail. If even this write
  // fails, the row stays "processing", which never resends either.
  try { await api.mark(ev.key, 'completed', r || {}); } catch (m) { console.error('[mail] sent but not recorded', mask(ev.key), m.message); }
  log(ev.type, ev.key, 'completed', r && r.provider);
  return { status: 'completed', provider: r && r.provider };
}

// Exported through one object so tests can replace claim / mark.
const api = { enabled, claim, mark, once, definite };
module.exports = api;
