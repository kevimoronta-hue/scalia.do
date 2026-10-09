/* Free slots = opening hours − busy time − notice − daily cap. */
'use strict';
const { BOOKING } = require('./config');
const { parts, zonedToUtc, ymd } = require('./time');

const MIN = 60000;
const DAY = 86400000;

// The window in which slots can exist right now.
function horizon(now) {
  const from = now + BOOKING.minNoticeMin * MIN;
  const to = now + BOOKING.maxDays * DAY;
  return { from, to };
}

// Every opening-hours start time between two instants, ignoring busy time.
function candidates(fromTs, toTs) {
  const tz = BOOKING.timezone;
  const out = [];
  // Walk the business calendar day by day (noon avoids DST edges).
  const p0 = parts(fromTs - DAY, tz);
  let dayNoon = zonedToUtc(p0.y, p0.m, p0.d, 12, 0, tz);
  while (dayNoon < toTs + DAY) {
    const p = parts(dayNoon, tz);
    const key = ymd(p);
    const ranges = BOOKING.hours[p.wd] || [];
    if (BOOKING.blockedDates.indexOf(key) === -1) {
      for (const [a, b] of ranges) {
        const [ah, am] = a.split(':').map(Number);
        const [bh, bm] = b.split(':').map(Number);
        const open = zonedToUtc(p.y, p.m, p.d, ah, am, tz);
        const close = zonedToUtc(p.y, p.m, p.d, bh, bm, tz);
        for (let s = open; s + BOOKING.durationMin * MIN <= close; s += BOOKING.stepMin * MIN) {
          if (s >= fromTs && s <= toTs) out.push({ start: s, day: key });
        }
      }
    }
    dayNoon += DAY;
    // Re-anchor on local noon so a DST change never drifts the walk.
    const q = parts(dayNoon, tz);
    dayNoon = zonedToUtc(q.y, q.m, q.d, 12, 0, tz);
  }
  return out;
}

// The client's rule: the meeting starts between BOOKING.clientEarliestStart
// and BOOKING.clientLatestStart on the client's own clock (their zone, DST
// included).
function minutes(hhmm) { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; }
function clientOk(start, clientTz) {
  if (!clientTz) return true;
  const p = parts(start, clientTz);
  const local = p.h * 60 + p.mi;
  return local >= minutes(BOOKING.clientEarliestStart) && local <= minutes(BOOKING.clientLatestStart);
}

function blockOf(start) {
  return {
    from: start - BOOKING.bufferBeforeMin * MIN,
    to: start + (BOOKING.durationMin + BOOKING.bufferAfterMin) * MIN
  };
}

// busy: [{ start, end }] in ms (any calendar event); booked: Scalia's own
// bookings, which keep their buffers around them too. clientTz: the
// visitor's zone, for the latest local start (Scalia hours ∩ client rule).
function freeSlots(now, busy, booked, clientTz) {
  const h = horizon(now);
  const list = candidates(h.from, h.to).filter(c => clientOk(c.start, clientTz));
  const bookedPerDay = {};
  const all = busy.slice();
  for (const b of booked) {
    const k = ymd(parts(b.start, BOOKING.timezone));
    bookedPerDay[k] = (bookedPerDay[k] || 0) + 1;
    all.push({ start: b.start - BOOKING.bufferBeforeMin * MIN, end: b.end + BOOKING.bufferAfterMin * MIN });
  }
  const sorted = all.sort((a, b) => a.start - b.start);
  return list.filter(c => {
    if (BOOKING.maxPerDay && (bookedPerDay[c.day] || 0) >= BOOKING.maxPerDay) return false;
    const b = blockOf(c.start);
    for (const x of sorted) {
      if (x.start >= b.to) break;
      if (x.end > b.from) return false;
    }
    return true;
  });
}

module.exports = { horizon, candidates, freeSlots, clientOk, blockOf, MIN, DAY };
