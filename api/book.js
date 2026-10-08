/* ==========================================================================
   POST /api/book
   { start, timezone, name, email, phone, company, message, locale,
     website (honeypot, must stay empty), elapsed (ms the form was open) }
   1. validates everything server-side
   2. re-reads Google Calendar: the start must still be a free slot (a
      fast refusal; the real guarantee is step 3)
   3. claims the day's next ticket id and decides, from the tickets alone,
      whether this booking is kept (server/tickets.js): same start or a
      neighbour that collides through a buffer, only one can stay, even
      when both requests arrive at the same instant
   4. any failure after the event exists withdraws it
   5. sends the client confirmation (no video link: it comes with the
      reminder, api/reminders.js) and Scalia's notice
   Answers 409 SLOT_UNAVAILABLE when the time is gone.
   ========================================================================== */
'use strict';
const { BOOKING } = require('../server/config');
const { freeSlots, DAY, MIN } = require('../server/slots');
const { parts, ymd, isValidZone } = require('../server/time');
const { calendar, send, readJson, ip, originOk, limited, EMAIL, clean } = require('../server/http');
const mail = require('../server/mail');
const tickets = require('../server/tickets');

const LOCALES = ['fr', 'en', 'es'];
const wait = ms => new Promise(r => setTimeout(r, ms));

function validate(b) {
  const errors = {};
  const out = {};
  out.name = clean(b.name, 80);
  if (!out.name || out.name.length < 2) errors.name = 'REQUIRED';
  out.email = clean(b.email, 254);
  if (!out.email) errors.email = 'REQUIRED';
  else if (!EMAIL.test(out.email)) errors.email = 'INVALID';
  out.phone = clean(b.phone, 32);
  if (out.phone === null || (out.phone && !/^[+()0-9.\-\s]{6,32}$/.test(out.phone))) errors.phone = 'INVALID';
  out.company = clean(b.company, 120);
  if (out.company === null) errors.company = 'INVALID';
  out.message = typeof b.message === 'string' ? b.message.replace(/[\u0000-\u0009\u000B\u000C\u000E-\u001F\u007F]/g, '').trim() : '';
  if (out.message.length > 1500) errors.message = 'TOO_LONG';
  // Project types: known keys only, each once, in the configured order.
  const types = Array.isArray(b.projectTypes) ? b.projectTypes : [];
  if (types.length > 10 || types.some(t => typeof t !== 'string' || !Object.prototype.hasOwnProperty.call(BOOKING.projectTypes, t))) errors.projectTypes = 'INVALID';
  out.projectTypes = Object.keys(BOOKING.projectTypes).filter(k => types.indexOf(k) >= 0);
  if (!errors.projectTypes && BOOKING.projectTypeRequired && !out.projectTypes.length) errors.projectTypes = 'REQUIRED';
  out.locale = LOCALES.indexOf(b.locale) >= 0 ? b.locale : 'fr';
  out.timezone = isValidZone(b.timezone) ? b.timezone : BOOKING.timezone;
  out.start = typeof b.start === 'string' && b.start.length < 40 ? Date.parse(b.start) : NaN;
  if (!isFinite(out.start)) errors.start = 'INVALID';
  return { errors, data: out };
}

function eventFor(d, id, meet) {
  const end = d.start + BOOKING.durationMin * MIN;
  const lines = [
    'Nom : ' + d.name,
    'Email : ' + d.email,
    'Téléphone / WhatsApp : ' + (d.phone || '—'),
    'Entreprise / activité : ' + (d.company || '—'),
    'Fuseau du client : ' + d.timezone,
    'Langue : ' + d.locale.toUpperCase(),
    '',
    'Type de projet :'
  ].concat(d.projectTypes.length ? d.projectTypes.map(k => '- ' + BOOKING.projectTypes[k].fr) : ['—'], [
    '',
    'Projet :',
    d.message || '—',
    '',
    'Source : scalia.do'
  ]);
  const ev = {
    id,
    summary: 'Scalia — Échange avec ' + d.name + (d.company ? ' (' + d.company + ')' : ''),
    description: lines.join('\n'),
    start: { dateTime: new Date(d.start).toISOString(), timeZone: BOOKING.timezone },
    end: { dateTime: new Date(end).toISOString(), timeZone: BOOKING.timezone },
    attendees: [{ email: d.email, displayName: d.name }],
    guestsCanSeeOtherGuests: false,
    guestsCanInviteOthers: false,
    // What /api/reminders needs to write the reminder, nothing more.
    extendedProperties: { private: {
      scaliaBooking: '1', locale: d.locale, clientTz: d.timezone, source: 'scalia.do',
      clientName: d.name, clientEmail: d.email, company: d.company || '', projectTypes: d.projectTypes.join(',')
    } },
    reminders: { useDefault: true }
  };
  if (meet) ev.conferenceData = { createRequest: { requestId: id + '-' + Date.now().toString(36), conferenceSolutionKey: { type: 'hangoutsMeet' } } };
  return ev;
}

// Remove our event (a few tries). If Google keeps refusing, Scalia is told
// which event to delete by hand, so a double booking never goes unseen.
async function withdraw(cal, id, d, reason) {
  for (let i = 0; i < 3; i++) {
    try { await cal.remove(id); return; } catch (e) { await wait(300 * (i + 1)); }
  }
  console.error('[booking] withdraw failed', id, reason);
  try {
    await mail.send(cal, {
      to: BOOKING.notifyEmail, replyTo: BOOKING.notifyEmail,
      subject: 'À vérifier — rendez-vous à supprimer (' + id + ')',
      text: 'Un rendez-vous n’a pas pu être retiré automatiquement après un conflit.\nÉvénement : ' + id + '\nClient : ' + d.name + ' <' + d.email + '>\nDébut : ' + new Date(d.start).toISOString() + '\nLe client a été informé que ce créneau n’était plus disponible. Supprimez cet événement dans Google Calendar.',
      html: '<p>Un rendez-vous n’a pas pu être retiré automatiquement après un conflit.</p><p>Événement : ' + id + '<br>Début : ' + new Date(d.start).toISOString() + '</p><p>Le client a été informé que ce créneau n’était plus disponible. Supprimez cet événement dans Google Calendar.</p>'
    });
  } catch (e) { console.error('[booking] alert failed', e.message); }
}

module.exports = async function book(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'METHOD' }, { Allow: 'POST' });
  const noStore = { 'Cache-Control': 'no-store' };
  if (!originOk(req)) return send(res, 403, { error: 'FORBIDDEN' }, noStore);
  if (!/^application\/json\b/i.test(req.headers['content-type'] || '')) return send(res, 415, { error: 'UNSUPPORTED' }, noStore);
  const who = ip(req);
  if (limited('bk:' + who, 6, 10 * 60000)) return send(res, 429, { error: 'RATE_LIMITED' }, Object.assign({ 'Retry-After': '600' }, noStore));

  let body;
  try { body = await readJson(req, 8192); } catch (e) { return send(res, 400, { error: 'BAD_REQUEST' }, noStore); }
  if (!body || typeof body !== 'object') return send(res, 400, { error: 'BAD_REQUEST' }, noStore);

  // Bots: a filled honeypot or a form sent faster than a person can type.
  if (body.website || !(Number(body.elapsed) >= 2500)) return send(res, 400, { error: 'REJECTED' }, noStore);

  const { errors, data: d } = validate(body);
  if (Object.keys(errors).length) return send(res, 422, { error: 'INVALID', fields: errors }, noStore);
  if (limited('bkm:' + d.email.toLowerCase(), 3, DAY)) return send(res, 429, { error: 'RATE_LIMITED' }, noStore);

  const cal = calendar();
  if (!cal.configured()) return send(res, 503, { error: 'NOT_CONFIGURED' }, noStore);

  try {
    // 2. Live re-check of this exact start against the calendar.
    const now = Date.now();
    const day = ymd(parts(d.start, BOOKING.timezone));
    const [busy, booked] = await Promise.all([
      cal.busy(d.start - DAY, d.start + DAY),
      cal.bookings(d.start - DAY, d.start + DAY)
    ]);
    const free = freeSlots(now, busy, booked).some(s => s.start === d.start && s.day === day);
    if (!free) return send(res, 409, { error: 'SLOT_UNAVAILABLE' }, noStore);

    // 3. Claim a ticket, then decide.
    let meet = BOOKING.meet;
    const claimed = await tickets.claim(cal, day, booked, id => eventFor(d, id, meet), () => (meet ? !(meet = false) : false));
    const created = claimed.event;
    let meetUrl = null;
    try {
      if (!(await tickets.kept(cal, day, claimed.k, d.start))) {
        await withdraw(cal, created.id, d, 'conflict');
        return send(res, 409, { error: 'SLOT_UNAVAILABLE' }, noStore);
      }
    } catch (e) {
      // 4. Undecided: never leave an unchecked booking behind.
      await withdraw(cal, created.id, d, e.message);
      throw e;
    }

    // Meet links can take a moment to be ready; never fatal.
    meetUrl = cal.meetUrl(created);
    for (let i = 0; meet && !meetUrl && i < 3; i++) {
      await wait(600);
      try { meetUrl = cal.meetUrl(await cal.get(created.id)); } catch (e) { break; }
    }

    // 5. Emails. The booking stands even if one of them fails.
    // TODO(scalia): booking reconciliation / email retry. Known V1 gap: if
    // the function stops after the event exists (timeout, crash) and before
    // the emails go out, the booking stays in Google Calendar (client details
    // in its description, private property scaliaBooking=1) but nobody is
    // emailed and the visitor sees an error. Later: a scheduled job lists
    // scaliaBooking events without a private "mailed" flag, sends the
    // missing emails and sets the flag (also the base for reminders,
    // cancellation and rescheduling).
    const booking = {
      id: created.id, start: d.start, end: d.start + BOOKING.durationMin * MIN, meetUrl,
      name: d.name, email: d.email, phone: d.phone, company: d.company, message: d.message,
      projectTypes: d.projectTypes, locale: d.locale, timezone: d.timezone
    };
    const sent = await Promise.allSettled([mail.send(cal, mail.clientMail(booking)), mail.send(cal, mail.ownerMail(booking))]);
    sent.forEach((s, i) => { if (s.status === 'rejected') console.error('[booking] mail ' + (i ? 'owner' : 'client'), s.reason && s.reason.message); });

    send(res, 201, {
      ok: true,
      // No video link here: it reaches the client with the reminder.
      booking: { start: new Date(booking.start).toISOString(), end: new Date(booking.end).toISOString(), durationMin: BOOKING.durationMin },
      emailed: sent[0].status === 'fulfilled'
    }, noStore);
  } catch (e) {
    console.error('[booking] book', e.message);
    send(res, 503, { error: 'UNAVAILABLE' }, noStore);
  }
};
