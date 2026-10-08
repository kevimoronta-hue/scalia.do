/* ==========================================================================
   Scalia Booking · race-proof claims on Google Calendar alone
   The one atomic operation Google Calendar guarantees: inserting an event
   whose id already exists fails with 409. Every booking attempt for a
   business day therefore takes the next free "ticket" id of that day:
       scb<yyyymmdd>t<nn>    (00, 01, 02 … in insertion order)
   Ticket k exists only if k-1 was taken first, so tickets form a gap-free,
   totally ordered log per day, with no lock server.
   The winner is then decided the same way by every request, from the
   tickets alone, read by id (retried until visible, so replication delays
   cannot hide one):
       walk tickets 00 → k; keep a ticket if its meeting (with buffers)
       overlaps no kept ticket and the daily cap is not reached.
   A request whose ticket is not kept withdraws its event (409 for the
   visitor). Two different starts that collide through a buffer, or the
   same start twice, can never both stay. Opening hours never cross
   midnight, so a conflict is always within one business day.
   ========================================================================== */
'use strict';
const { BOOKING } = require('./config');
const { blockOf } = require('./slots');

const MAX_TICKETS = 64;                  // attempts per day, cancellations included
const wait = ms => new Promise(r => setTimeout(r, ms));

function ticketId(day, k) { return 'scb' + day.replace(/-/g, '') + 't' + String(k).padStart(2, '0'); }
function ticketOf(id, day) {
  const m = /^scb(\d{8})t(\d{2})$/.exec(id || '');
  return m && m[1] === day.replace(/-/g, '') ? +m[2] : -1;
}

// Read an earlier ticket. It was taken before ours, so a 404 is first read
// as a replication delay and retried (about 3.5 s in all). Still missing
// after that, it is treated as gone: a deleted event Google has purged.
async function mustGet(cal, id) {
  for (let i = 0; i < 8; i++) {
    const ev = await cal.get(id);
    if (ev) return ev;
    await wait(150 + i * 80);
  }
  console.warn('[booking] ticket not found, treated as cancelled:', id);
  return { id, status: 'cancelled' };
}

// 1. Claim the next ticket of the day. `known`: Scalia bookings already
//    listed (a hint to skip taken tickets; never trusted for the decision).
//    `fallback()` may drop an optional part (Google Meet) after a 400 and
//    returns true to retry the same ticket.
async function claim(cal, day, known, build, fallback) {
  let k = 0;
  for (const b of known) k = Math.max(k, ticketOf(b.id, day) + 1);
  for (; k < MAX_TICKETS; k++) {
    let r;
    try {
      r = await cal.insert(build(ticketId(day, k)));
    } catch (e) {
      if (e.status === 400 && fallback && fallback()) { k--; continue; }
      throw e;
    }
    if (!r.conflict) return { k, event: r.event };
  }
  throw new Error('tickets_exhausted');
}

// 2. Decide from tickets 00 … k whether ours (k, at `start`) is kept.
async function kept(cal, day, k, start) {
  const earlier = await Promise.all(Array.from({ length: k }, (_, j) => mustGet(cal, ticketId(day, j))));
  const keptBlocks = [];
  const consider = (s) => {
    const b = blockOf(s);
    if (keptBlocks.some(o => o.from < b.to && o.to > b.from)) return false;
    if (BOOKING.maxPerDay && keptBlocks.length >= BOOKING.maxPerDay) return false;
    keptBlocks.push(b);
    return true;
  };
  for (const ev of earlier) {
    if (ev.status === 'cancelled') continue;
    consider(Date.parse(ev.start.dateTime));
  }
  return consider(start);
}

module.exports = { claim, kept, ticketId, ticketOf };
