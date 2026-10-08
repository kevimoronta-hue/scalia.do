/* ==========================================================================
   GET /api/reminders · reminder with the video link, ~1 hour before
   Called by a scheduler every 10 minutes (Vercel Cron on a Pro plan, or
   any external cron) with the header  Authorization: Bearer <CRON_SECRET>.
   Without CRON_SECRET configured the route refuses to run.

   Each run looks at Scalia bookings (private scaliaBooking=1) starting
   within the next BOOKING.reminderLeadMin minutes and sends each one ONE
   reminder:
     1. skip if scaliaReminderSent=1 (already reminded)
     2. skip if another run claimed it (a claim lasts the whole window)
     3. claim it (scaliaReminderClaim) with If-Match on the event's etag:
        if the event changed since it was read, another run got there
        first, so skip
     4. send the email (Gmail); on failure release the claim so the next
        run retries
     5. on success write scaliaReminderSent=1
   With a 10-minute schedule and a 65-minute lead, a reminder leaves 65 to
   55 minutes before the meeting; a missed run is caught up by the next
   one, up to the start time.
   Trigger: Google Cloud Scheduler, GET, every 10 minutes.
   ========================================================================== */
'use strict';
const crypto = require('crypto');
const { BOOKING } = require('../server/config');
const { calendar, send, EMAIL } = require('../server/http');
const mail = require('../server/mail');

const MIN = 60000;
// A claim outlives the whole reminder window, so a reminder that was sent
// but could not be flagged is never sent twice. Trade-off: a run that
// crashes between claim and send leaves that meeting without a reminder
// (logged), never with two.
const CLAIM_TTL = (BOOKING.reminderLeadMin + 15) * MIN;

function authorized(req) {
  const secret = process.env.CRON_SECRET || '';
  const got = String(req.headers.authorization || '');
  const want = 'Bearer ' + secret;
  if (!secret || got.length !== want.length) return false;
  return crypto.timingSafeEqual(Buffer.from(got), Buffer.from(want));
}

function bookingOf(ev, cal) {
  const p = (ev.extendedProperties && ev.extendedProperties.private) || {};
  const guest = (ev.attendees || [])[0] || {};
  return {
    id: ev.id,
    start: Date.parse(ev.start.dateTime),
    name: p.clientName || guest.displayName || '',
    email: p.clientEmail || guest.email || '',
    company: p.company || '',
    locale: ['fr', 'en', 'es'].indexOf(p.locale) >= 0 ? p.locale : 'fr',
    timezone: p.clientTz || BOOKING.timezone,
    meetUrl: cal.meetUrl(ev)
  };
}

async function claim(cal, ev, run, now) {
  for (let i = 0; i < 3; i++) {
    if (i) {
      await new Promise(r => setTimeout(r, 500 * i));
      ev = await cal.get(ev.id);
      if (!ev || ev.status === 'cancelled') return false;
      const p = (ev.extendedProperties && ev.extendedProperties.private) || {};
      if (p.scaliaReminderSent === '1') return false;
      if (String(p.scaliaReminderClaim || '').indexOf(run + '@') === 0) return true;   // our own write did land
      if (p.scaliaReminderClaim) return false;                                           // someone else has it
    }
    try {
      if (await cal.setPrivate(ev, { scaliaReminderClaim: run + '@' + now }, ev.etag)) return true;
    } catch (e) {
      if (e.status && e.status !== 403) { console.warn('[booking] reminder claim error', ev.id, e.message); return false; }
    }
  }
  console.warn('[booking] reminder claim not obtained, next run retries', ev.id);
  return false;
}

async function mark(cal, id, props) {
  for (let i = 0; i < 3; i++) {
    try {
      const fresh = await cal.get(id);
      if (fresh) { await cal.setPrivate(fresh, props); return true; }
    } catch (e) { /* retry */ }
    await new Promise(r => setTimeout(r, 400 * (i + 1)));
  }
  return false;
}

module.exports = async function reminders(req, res) {
  const noStore = { 'Cache-Control': 'no-store' };
  if (req.method !== 'GET' && req.method !== 'POST') return send(res, 405, { error: 'METHOD' }, noStore);
  if (!process.env.CRON_SECRET) return send(res, 503, { error: 'NOT_CONFIGURED' }, noStore);
  if (!authorized(req)) return send(res, 401, { error: 'UNAUTHORIZED' }, noStore);
  const cal = calendar();
  if (!cal.configured()) return send(res, 503, { error: 'NOT_CONFIGURED' }, noStore);

  const run = crypto.randomBytes(4).toString('hex');
  const now = Date.now();
  const out = { checked: 0, sent: 0, already: 0, skipped: 0, failed: 0 };
  try {
    const list = await cal.upcoming(now, now + BOOKING.reminderLeadMin * MIN);
    for (const ev of list) {
      out.checked++;
      const p = (ev.extendedProperties && ev.extendedProperties.private) || {};
      if (p.scaliaReminderSent === '1') { out.already++; continue; }
      const claimedAt = +String(p.scaliaReminderClaim || '').split('@')[1] || 0;
      if (claimedAt && now - claimedAt < CLAIM_TTL) { out.skipped++; continue; }

      const b = bookingOf(ev, cal);
      if (!EMAIL.test(b.email) || !b.name) {
        console.error('[booking] reminder: no client email on', ev.id);
        await mark(cal, ev.id, { scaliaReminderSent: '1', scaliaReminderNote: 'no-email' });
        out.failed++;
        continue;
      }
      // Claim, conditional on the event's version (If-Match). Google bumps
      // that version on its own shortly after creation (Meet set-up), and
      // may answer 412 or an occasional 403: re-read and try again, up to
      // three times, re-checking the flags each time. Another run that got
      // there first wins; this one then skips.
      if (!(await claim(cal, ev, run, now))) { out.skipped++; continue; }

      try {
        await mail.send(cal, mail.reminderMail(b));
      } catch (e) {
        console.error('[booking] reminder mail', ev.id, e.message);
        await mark(cal, ev.id, { scaliaReminderClaim: '' });       // the next run retries
        out.failed++;
        continue;
      }
      if (!(await mark(cal, ev.id, { scaliaReminderSent: '1', scaliaReminderAt: new Date().toISOString() }))) {
        // Sent, but the flag could not be written: the claim still covers
        // the whole window, so no second send; the event is in the logs.
        console.error('[booking] reminder sent but not flagged', ev.id);
      }
      out.sent++;
    }
    send(res, 200, Object.assign({ ok: true }, out), noStore);
  } catch (e) {
    console.error('[booking] reminders', e.message);
    send(res, 503, Object.assign({ error: 'UNAVAILABLE' }, out), noStore);
  }
};
