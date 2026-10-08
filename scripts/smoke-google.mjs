/* ==========================================================================
   Scalia Booking · real Google smoke test (local only, never deployed)
     node scripts/smoke-google.mjs
   Reads .env.local (e.g. from `vercel env pull .env.local`). Prints PASS /
   FAIL per step, never a token or a key.
     A  authentication (service account + delegation)
     B  freeBusy on the booking calendar
     C  availability computed from the live calendar
     D  test event created (outside opening hours, 60 days ahead)
     E  Google Meet link attached to it
     F  test email sent to BOOKING_NOTIFY (contact@scalia.do) only
     G  test event deleted, and checked gone
   The test event never uses a booking ticket id, so it can never be taken
   for a booking, and it is deleted even if a step fails.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
try {
  for (const line of fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])([\s\S]*)\1$/, '$2');
  }
} catch (e) { /* variables may come from the shell */ }
delete process.env.BOOKING_MOCK;   // always the real Google here

const { BOOKING } = require(path.join(ROOT, 'server/config.js'));
const google = require(path.join(ROOT, 'server/google.js'));
const mail = require(path.join(ROOT, 'server/mail.js'));
const { freeSlots, horizon, DAY, MIN } = require(path.join(ROOT, 'server/slots.js'));
const { parts, zonedToUtc } = require(path.join(ROOT, 'server/time.js'));

const results = [];
let stopped = false;   // stop at the first failure (cleanup still runs)
async function step(name, fn, always) {
  if (stopped && !always) { results.push([name, 'SKIP', '', 'not run: an earlier step failed']); return false; }
  const t0 = Date.now();
  try {
    const info = await fn();
    results.push([name, 'PASS', (Date.now() - t0) + ' ms', info || '']);
    return true;
  } catch (e) {
    results.push([name, 'FAIL', (Date.now() - t0) + ' ms', e.message]);
    stopped = true;
    return false;
  }
}

let eventId = null;
let event = null;

if (!google.configured()) {
  console.log('A auth  FAIL  No Google variables found (.env.local or shell). Nothing was called.');
  process.exit(1);
}

await step('A auth', async () => { await google.busy(Date.now(), Date.now() + 60000); return 'token ok, acting as ' + (process.env.GOOGLE_IMPERSONATE || 'service account'); });
await step('B freeBusy', async () => { const b = await google.busy(Date.now(), Date.now() + 7 * DAY); return b.length + ' busy block(s) in the next 7 days'; });
await step('C availability', async () => {
  const now = Date.now(), h = horizon(now);
  const [busy, booked] = await Promise.all([google.busy(h.from - DAY, h.to + DAY), google.bookings(h.from - DAY, h.to + DAY)]);
  const slots = freeSlots(now, busy, booked);
  return slots.length + ' free slot(s); first ' + (slots[0] ? new Date(slots[0].start).toISOString() : '—');
});

// 03:00 Scalia time, 60 days ahead: outside opening hours, never a slot.
const p = parts(Date.now() + 60 * DAY, BOOKING.timezone);
const start = zonedToUtc(p.y, p.m, p.d, 3, 0, BOOKING.timezone);
try {
  const ok = await step('D create test event', async () => {
    eventId = 'scbsmoke' + Date.now().toString(32);
    const r = await google.insert({
      id: eventId,
      summary: 'Scalia — test technique (à supprimer automatiquement)',
      description: 'Smoke test du booking Scalia. Cet événement est supprimé à la fin du test.',
      start: { dateTime: new Date(start).toISOString(), timeZone: BOOKING.timezone },
      end: { dateTime: new Date(start + BOOKING.durationMin * MIN).toISOString(), timeZone: BOOKING.timezone },
      extendedProperties: { private: { scaliaSmoke: '1' } },
      conferenceData: BOOKING.meet ? { createRequest: { requestId: eventId, conferenceSolutionKey: { type: 'hangoutsMeet' } } } : undefined
    });
    if (r.conflict) throw new Error('id conflict');
    event = r.event;
    return eventId + ' at ' + new Date(start).toISOString();
  });
  if (ok) {
    await step('E Google Meet', async () => {
      if (!BOOKING.meet) return 'skipped (BOOKING_MEET=off)';
      let url = google.meetUrl(event);
      for (let i = 0; !url && i < 5; i++) { await new Promise(r => setTimeout(r, 700)); url = google.meetUrl(await google.get(eventId)); }
      if (!url) throw new Error('no Meet link (status: ' + JSON.stringify(event.conferenceData && event.conferenceData.createRequest && event.conferenceData.createRequest.status) + ')');
      return 'link created (' + url.replace(/[a-z]{3}-[a-z]{4}-[a-z]{3}$/, '•••-••••-•••') + ')';
    });
  }
  await step('F Gmail test email', async () => {
    await mail.send(google, {
      to: BOOKING.notifyEmail, replyTo: BOOKING.notifyEmail,
      subject: 'Scalia Booking — test technique ✓',
      text: 'Email de test du booking Scalia (envoi Gmail via ' + BOOKING.fromEmail + '). Aucune action requise.',
      html: '<p>Email de test du booking Scalia (envoi Gmail via ' + BOOKING.fromEmail + '). Aucune action requise.</p>'
    });
    return 'sent to ' + BOOKING.notifyEmail;
  });
} finally {
  if (eventId) {
    await step('G delete test event', async () => {
      await google.remove(eventId);
      const after = await google.get(eventId);
      if (after && after.status !== 'cancelled') throw new Error('still present: ' + after.status);
      return 'deleted and checked';
    }, true);
  }
}

console.log('\nScalia Booking · Google smoke test\n');
for (const r of results) console.log(r[1].padEnd(5), r[0].padEnd(22), r[2].padStart(8), ' ', r[3]);
process.exit(results.every(r => r[1] === 'PASS') ? 0 : 1);
