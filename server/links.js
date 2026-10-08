/* ==========================================================================
   Scalia Booking · signed meeting links
   The client never receives the Google Meet address itself, but
     https://scalia.do/meeting/v1.<eventId>.<signature>/
   handled by api/meeting.js, which redirects to the Meet only inside the
   access window.
   Signature: HMAC-SHA256 with MEETING_LINK_SECRET, and that key only, over
     "v1|<eventId>|<time zone recorded at booking>"
   truncated to 128 bits. The time zone is not in the URL: it is read back
   from the event, so a link cannot be re-bound to another zone. No personal
   data in the URL. Without MEETING_LINK_SECRET no link is ever produced or
   accepted (fail closed).
   ========================================================================== */
'use strict';
const crypto = require('crypto');

const VERSION = 'v1';
const SITE = (process.env.BOOKING_PUBLIC_URL || 'https://scalia.do').replace(/\/+$/, '');

function key() {
  const k = process.env.MEETING_LINK_SECRET || '';
  if (k.length < 32) {
    const e = new Error('meeting_link_secret_missing');
    e.code = 'meeting_link_secret_missing';
    throw e;
  }
  return k;
}
function sign(id, tz) {
  return crypto.createHmac('sha256', key()).update(VERSION + '|' + id + '|' + tz).digest('base64url').slice(0, 22);
}

// Link for a booked event; tz = the client's zone recorded on the event.
function meetingUrl(id, tz) { return SITE + '/meeting/' + VERSION + '.' + id + '.' + sign(id, tz) + '/'; }

// Step 1 (no I/O): well-formed token → { id, sig }, else null.
function parse(token) {
  const m = /^v1\.([a-v0-9]{5,64})\.([A-Za-z0-9_-]{22})$/.exec(String(token || ''));
  return m ? { id: m[1], sig: m[2] } : null;
}
// Step 2: the signature matches this event and its recorded zone.
function matches(parsed, tz) {
  const want = Buffer.from(sign(parsed.id, tz));
  const got = Buffer.from(parsed.sig);
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}

module.exports = { meetingUrl, parse, matches, key };
