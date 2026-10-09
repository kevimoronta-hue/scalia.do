/* ==========================================================================
   GET /api/ics/?t=<meeting token>  · the client's .ics (Apple, Outlook)
   Same signed token as /meeting/ (server/links.js): only the person who
   booked can fetch it. Built by server/calendar-links.js from the live
   event, with the Google event's UID, so importing it where the Google
   invitation already sits updates that event instead of duplicating it.
   ?dl=1 asks for a download instead of opening in Calendar.
   ========================================================================== */
'use strict';
const { BOOKING } = require('../server/config');
const { calendar, ip, limited } = require('../server/http');
const links = require('../server/links');
const calendarLinks = require('../server/calendar-links');

function fail(res, status) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(status === 404 ? 'Not found' : 'Unavailable');
}

module.exports = async function icsRoute(req, res) {
  const q = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
  try { links.key(); } catch (e) { console.error('[booking] ' + e.code); return fail(res, 503); }
  const parsed = links.parse(q.t);
  if (!parsed) return fail(res, 404);
  if (limited('ics:' + ip(req), 30, 10 * 60000)) return fail(res, 429);

  let ev;
  try { ev = await calendar().get(parsed.id); } catch (e) { console.error('[booking] ics', e.message); return fail(res, 503); }
  const p = (ev && ev.extendedProperties && ev.extendedProperties.private) || {};
  if (!ev || !p.clientTz || !links.matches(parsed, p.clientTz)) return fail(res, 404);
  if (ev.status === 'cancelled' || !ev.start || !ev.start.dateTime) return fail(res, 404);

  const body = calendarLinks.ics({
    uid: ev.iCalUID || ev.id + '@google.com',
    start: Date.parse(ev.start.dateTime),
    end: Date.parse(ev.end.dateTime),
    locale: ['fr', 'en', 'es'].indexOf(p.locale) >= 0 ? p.locale : 'fr',
    meetingUrl: links.meetingUrl(ev.id, p.clientTz),
    organizer: BOOKING.fromEmail
  });
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', (q.dl ? 'attachment' : 'inline') + '; filename="scalia.ics"');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.end(body);
};
