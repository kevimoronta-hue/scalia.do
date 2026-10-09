/* ==========================================================================
   Scalia Booking · Google Calendar (+ Gmail) over plain REST, no SDK.
   Two ways to authenticate, both server-side only:
     A. Service account with domain-wide delegation (Google Workspace),
        acting as GOOGLE_IMPERSONATE (contact@scalia.do). Recommended.
     B. OAuth client + refresh token of the calendar's owner.
   ========================================================================== */
'use strict';
const crypto = require('crypto');
const { BOOKING } = require('./config');

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.freebusy',
  'https://www.googleapis.com/auth/gmail.send'
];
const CAL = 'https://www.googleapis.com/calendar/v3';

let cached = null;   // { token, exp } reused while the function stays warm

function b64url(buf) { return Buffer.from(buf).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_'); }

function mode() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) return 'service';
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN) return 'oauth';
  return null;
}
function configured() { return !!mode(); }

// GOOGLE_PRIVATE_KEY as Vercel stores it: the PEM pasted on several lines,
// or on one line with literal \n, possibly wrapped in quotes, possibly with
// Windows line ends. Checked once; the key itself is never logged.
let keyObj = null;
function privateKey() {
  if (keyObj) return keyObj;
  let pem = String(process.env.GOOGLE_PRIVATE_KEY || '').trim();
  if (/^(['"])[\s\S]*\1$/.test(pem)) pem = pem.slice(1, -1);
  pem = pem.replace(/\\r/g, '').replace(/\\n/g, '\n').replace(/\r\n?/g, '\n');
  try { keyObj = crypto.createPrivateKey({ key: pem, format: 'pem' }); }
  catch (e) { throw new Error('google_private_key_invalid'); }
  return keyObj;
}

async function tokenRequest(body) {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body)
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error('google_auth_' + (j.error || r.status));
  return j;
}

async function accessToken() {
  if (cached && cached.exp > Date.now() + 60000) return cached.token;
  let j;
  if (mode() === 'service') {
    const now = Math.floor(Date.now() / 1000);
    const claim = {
      iss: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      scope: SCOPES.join(' '),
      aud: 'https://oauth2.googleapis.com/token',
      iat: now, exp: now + 3600
    };
    if (process.env.GOOGLE_IMPERSONATE) claim.sub = process.env.GOOGLE_IMPERSONATE;
    const unsigned = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' })) + '.' + b64url(JSON.stringify(claim));
    const sig = crypto.createSign('RSA-SHA256').update(unsigned).sign(privateKey());
    j = await tokenRequest({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: unsigned + '.' + b64url(sig) });
  } else if (mode() === 'oauth') {
    j = await tokenRequest({
      grant_type: 'refresh_token',
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    });
  } else {
    throw new Error('google_not_configured');
  }
  cached = { token: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 };
  return cached.token;
}

async function api(method, url, body, extra) {
  const r = await fetch(url, {
    method,
    headers: Object.assign({ Authorization: 'Bearer ' + await accessToken(), 'Content-Type': 'application/json' }, extra || {}),
    body: body ? JSON.stringify(body) : undefined
  });
  if (r.status === 204) return { status: 204, data: null };
  const data = await r.json().catch(() => null);
  return { status: r.status, data };
}
function must(res, what) {
  if (res.status >= 200 && res.status < 300) return res.data;
  const e = new Error('google_' + what + '_' + res.status);
  e.status = res.status;
  throw e;
}

const calId = () => encodeURIComponent(BOOKING.calendarId);

// Busy intervals [{start,end}] (ms) over all busy calendars.
async function busy(fromTs, toTs) {
  const ids = [BOOKING.calendarId].concat(BOOKING.busyCalendars);
  const data = must(await api('POST', CAL + '/freeBusy', {
    timeMin: new Date(fromTs).toISOString(),
    timeMax: new Date(toTs).toISOString(),
    items: ids.map(id => ({ id }))
  }), 'freebusy');
  const out = [];
  for (const id of Object.keys(data.calendars || {})) {
    const c = data.calendars[id];
    if (c.errors && c.errors.length) throw new Error('google_freebusy_calendar');
    for (const b of c.busy || []) out.push({ start: Date.parse(b.start), end: Date.parse(b.end) });
  }
  return out;
}

// Scalia bookings (confirmed) between two instants.
async function bookings(fromTs, toTs) {
  const q = new URLSearchParams({
    timeMin: new Date(fromTs).toISOString(),
    timeMax: new Date(toTs).toISOString(),
    privateExtendedProperty: 'scaliaBooking=1',
    singleEvents: 'true', maxResults: '250', showDeleted: 'false'
  });
  const data = must(await api('GET', CAL + '/calendars/' + calId() + '/events?' + q), 'list');
  return (data.items || []).filter(e => e.status !== 'cancelled').map(e => ({
    id: e.id, created: Date.parse(e.created),
    start: Date.parse(e.start.dateTime), end: Date.parse(e.end.dateTime)
  }));
}

// Insert with a caller-chosen id: Google refuses a second event with the
// same id (409), which makes each start time a lock.
async function insert(event) {
  const q = event.conferenceData ? '?conferenceDataVersion=1&sendUpdates=none' : '?sendUpdates=none';
  const res = await api('POST', CAL + '/calendars/' + calId() + '/events' + q, event);
  if (res.status === 409) return { conflict: true };
  return { event: must(res, 'insert') };
}
async function get(id) {
  const res = await api('GET', CAL + '/calendars/' + calId() + '/events/' + encodeURIComponent(id));
  if (res.status === 404) return null;
  if (res.status === 410) return { id, status: 'cancelled' };   // deleted
  return must(res, 'get');
}
async function remove(id) {
  const res = await api('DELETE', CAL + '/calendars/' + calId() + '/events/' + encodeURIComponent(id) + '?sendUpdates=none');
  if (res.status !== 204 && res.status !== 410 && res.status !== 404) must(res, 'delete');
}

// Full Scalia booking events (confirmed) whose start falls between two
// instants: what the reminder needs (private properties, Meet link).
async function upcoming(fromTs, toTs) {
  const q = new URLSearchParams({
    timeMin: new Date(fromTs).toISOString(),
    timeMax: new Date(toTs).toISOString(),
    privateExtendedProperty: 'scaliaBooking=1',
    singleEvents: 'true', maxResults: '100', showDeleted: 'false'
  });
  const data = must(await api('GET', CAL + '/calendars/' + calId() + '/events?' + q), 'list');
  return (data.items || []).filter(e => e.status !== 'cancelled' && e.start && e.start.dateTime &&
    Date.parse(e.start.dateTime) >= fromTs && Date.parse(e.start.dateTime) < toTs);
}

// Merge private properties into an event. With `etag`, Google applies the
// change only if the event is unchanged since it was read (412 otherwise):
// returns false in that case.
async function setPrivate(ev, props, etag) {
  const merged = Object.assign({}, (ev.extendedProperties && ev.extendedProperties.private) || {}, props);
  const res = await api('PATCH', CAL + '/calendars/' + calId() + '/events/' + encodeURIComponent(ev.id) + '?sendUpdates=none',
    { extendedProperties: { private: merged } }, etag ? { 'If-Match': etag } : null);
  if (res.status === 412) return false;
  must(res, 'patch');
  return true;
}

function meetUrl(ev) {
  const cd = ev && ev.conferenceData;
  if (!cd || !cd.entryPoints) return null;
  const v = cd.entryPoints.find(p => p.entryPointType === 'video');
  return v ? v.uri : null;
}

// Gmail: send a raw MIME message as the connected account.
async function sendMail(raw) {
  const res = await api('POST', 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send', { raw: b64url(raw) });
  must(res, 'gmail');
}

// Same, through the media upload endpoint: the raw MIME message is the body
// (no base64 JSON wrapper), for messages carrying a sizeable attachment.
async function sendMailUpload(raw) {
  const r = await fetch('https://gmail.googleapis.com/upload/gmail/v1/users/me/messages/send?uploadType=media', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + await accessToken(), 'Content-Type': 'message/rfc822' },
    body: raw
  });
  must({ status: r.status }, 'gmail_upload');
}

module.exports = { configured, busy, bookings, upcoming, setPrivate, insert, get, remove, meetUrl, sendMail, sendMailUpload, privateKey };
