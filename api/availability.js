/* ==========================================================================
   GET /api/availability
   Free start times for the whole booking window, as exact instants (UTC
   ISO). The browser groups them by day in the visitor's own zone.
   ========================================================================== */
'use strict';
const { BOOKING } = require('../server/config');
const { horizon, freeSlots, DAY, MIN } = require('../server/slots');
const { calendar, send, ip, limited } = require('../server/http');

module.exports = async function availability(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'METHOD' }, { Allow: 'GET' });
  if (limited('av:' + ip(req), 60, 60000)) return send(res, 429, { error: 'RATE_LIMITED' }, { 'Retry-After': '60' });
  const cal = calendar();
  if (!cal.configured()) return send(res, 503, { error: 'NOT_CONFIGURED' }, { 'Cache-Control': 'no-store' });

  try {
    const now = Date.now();
    const h = horizon(now);
    const pad = (BOOKING.bufferBeforeMin + BOOKING.bufferAfterMin + BOOKING.durationMin) * MIN;
    const [busy, booked] = await Promise.all([
      cal.busy(h.from - pad, h.to + DAY),
      cal.bookings(h.from - DAY, h.to + DAY)
    ]);
    const slots = freeSlots(now, busy, booked).map(s => new Date(s.start).toISOString());
    send(res, 200, {
      timezone: BOOKING.timezone,
      durationMin: BOOKING.durationMin,
      from: new Date(h.from).toISOString(),
      to: new Date(h.to).toISOString(),
      slots
    }, {
      // Browsers never keep it; Vercel's edge may share it a few seconds.
      // A booking always re-checks the live calendar, and a forced refresh
      // (?fresh=…) is a new address the edge has not cached.
      'Cache-Control': 'no-store',
      'Vercel-CDN-Cache-Control': 'max-age=' + BOOKING.cacheSeconds + ', stale-while-revalidate=' + BOOKING.cacheSeconds * 2
    });
  } catch (e) {
    console.error('[booking] availability', e.message);
    send(res, 503, { error: 'UNAVAILABLE' }, { 'Cache-Control': 'no-store' });
  }
};
