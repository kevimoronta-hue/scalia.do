/* Scalia Booking · phone numbers: E.164 check, readable display, WhatsApp. */
'use strict';

const E164 = /^\+[1-9]\d{6,14}$/;

// "+33612345678" (+ dial "33") → "+33 6 12 34 56 78"; "+18091234567" →
// "+1 809 123 4567". Unknown layouts: country code, then groups of three.
function display(e164, dial) {
  if (!E164.test(e164)) return e164;
  if (!dial || e164.indexOf('+' + dial) !== 0) return e164;
  const n = e164.slice(1 + dial.length);
  if (dial === '1' && n.length === 10) return '+1 ' + n.slice(0, 3) + ' ' + n.slice(3, 6) + ' ' + n.slice(6);
  if (dial === '33' && n.length === 9) return '+33 ' + n[0] + ' ' + n.slice(1).match(/\d{2}/g).join(' ');
  const groups = n.match(/\d{1,3}/g) || [];
  if (groups.length > 1 && groups[groups.length - 1].length === 1) groups[groups.length - 2] += groups.pop();
  return '+' + dial + ' ' + groups.join(' ');
}

function whatsapp(e164) { return E164.test(e164) ? 'https://wa.me/' + e164.slice(1) : null; }

module.exports = { E164, display, whatsapp };
