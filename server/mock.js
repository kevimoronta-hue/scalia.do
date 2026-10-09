/* ==========================================================================
   Scalia Booking · local test calendar (same interface as google.js).
   Only used when BOOKING_MOCK=1 on a local machine: refused on Vercel
   (VERCEL / VERCEL_ENV set) and when NODE_ENV is "production", whatever
   BOOKING_MOCK says. Data lives in a JSON file in the OS temp folder;
   "sent" emails are written there as .eml.
   Test switches:
     file scalia-booking-mock-fail in that folder   simulated outage
     BOOKING_MOCK_LAG=ms   new events stay invisible to reads this long,
                           like a replication delay on Google's side
   ========================================================================== */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const DIR = path.join(os.tmpdir(), 'scalia-booking-mock');
const FILE = path.join(DIR, 'calendar.json');
const FAIL = path.join(DIR, 'scalia-booking-mock-fail');

let warned = false;
function enabled() {
  if (process.env.BOOKING_MOCK !== '1') return false;
  const prod = process.env.VERCEL || process.env.VERCEL_ENV || process.env.NODE_ENV === 'production';
  if (prod) {
    if (!warned) { warned = true; console.error('[booking] BOOKING_MOCK ignored: production environment'); }
    return false;
  }
  return true;
}
const visible = e => Date.now() - e.created >= (+process.env.BOOKING_MOCK_LAG || 0);

function load() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { return { events: [] }; }
}
function save(db) { fs.mkdirSync(DIR, { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(db, null, 2)); }
async function tick() {
  if (fs.existsSync(FAIL)) throw new Error('mock_outage');
  const ms = +process.env.BOOKING_MOCK_LATENCY || 120;
  await new Promise(r => setTimeout(r, ms));
}

async function busy(fromTs, toTs) {
  await tick();
  return load().events
    .filter(e => visible(e) && e.status !== 'cancelled' && e.end > fromTs && e.start < toTs)
    .map(e => ({ start: e.start, end: e.end }));
}
async function bookings(fromTs, toTs) {
  await tick();
  return load().events
    .filter(e => visible(e) && e.scalia && e.status !== 'cancelled' && e.end > fromTs && e.start < toTs)
    .map(e => ({ id: e.id, created: e.created, start: e.start, end: e.end }));
}
async function insert(ev) {
  await tick();
  const db = load();
  if (db.events.some(e => e.id === ev.id)) return { conflict: true };
  const rec = {
    id: ev.id, created: Date.now(), status: 'confirmed', scalia: true,
    start: Date.parse(ev.start.dateTime), end: Date.parse(ev.end.dateTime),
    summary: ev.summary, description: ev.description,
    priv: (ev.extendedProperties && ev.extendedProperties.private) || {}, etag: '"1"',
    meet: ev.conferenceData ? 'https://meet.google.com/mock-' + ev.id.slice(-6) : null
  };
  db.events.push(rec);
  save(db);
  return { event: shape(rec) };
}
function shape(rec) {
  return {
    id: rec.id, iCalUID: rec.id + '@google.com', status: rec.status, created: new Date(rec.created).toISOString(), etag: rec.etag || '"1"',
    extendedProperties: { private: rec.priv || {} },
    start: { dateTime: new Date(rec.start).toISOString() }, end: { dateTime: new Date(rec.end).toISOString() },
    conferenceData: rec.meet ? { entryPoints: [{ entryPointType: 'video', uri: rec.meet }] } : undefined
  };
}
async function get(id) {
  await tick();
  const rec = load().events.find(e => e.id === id && visible(e));
  return rec ? shape(rec) : null;
}
async function remove(id) {
  await tick();
  const db = load();
  const rec = db.events.find(e => e.id === id);
  if (rec) rec.status = 'cancelled';
  save(db);
}
async function upcoming(fromTs, toTs) {
  await tick();
  return load().events.filter(e => visible(e) && e.scalia && e.status !== 'cancelled' && e.start >= fromTs && e.start < toTs).map(shape);
}
async function setPrivate(ev, props, etag) {
  await tick();
  const db = load();
  const rec = db.events.find(e => e.id === ev.id);
  if (!rec) throw new Error('mock_patch_404');
  if (etag && etag !== (rec.etag || '"1"')) return false;      // like Google's 412
  rec.priv = Object.assign({}, rec.priv || {}, props);
  rec.etag = '"' + (parseInt(String(rec.etag || '"1"').replace(/"/g, ''), 10) + 1) + '"';
  save(db);
  return true;
}
function meetUrl(ev) {
  const v = ev && ev.conferenceData && ev.conferenceData.entryPoints[0];
  return v ? v.uri : null;
}
async function sendMail(raw) {
  fs.mkdirSync(DIR, { recursive: true });
  const f = path.join(DIR, 'mail-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6) + '.eml');
  fs.writeFileSync(f, raw);
}

// Test helpers (dev server only).
function addBusy(start, end) { const db = load(); db.events.push({ id: 'busy' + Date.now(), created: Date.now(), status: 'confirmed', start, end }); save(db); }
function reset() { save({ events: [] }); }

module.exports = { enabled, configured: () => true, busy, bookings, upcoming, setPrivate, insert, get, remove, meetUrl, sendMail, addBusy, reset, DIR, FAIL };
