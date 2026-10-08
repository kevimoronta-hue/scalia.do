/* ==========================================================================
   GET /meeting/<token>/  (rewritten to /api/meeting?t=<token>)
   The client's "Rejoindre l'échange" link (signed, see server/links.js):
     before     a Scalia page: the link opens 12 h before (date and time
                shown in the zone recorded at booking)
     window     302 to the current Meet link of the event, from 12 h
                before the start to 3 h after the end (absolute instants)
     after      a Scalia page: the meeting is over, with contacts
     cancelled  410 page; bad or forged token 404; key missing 503
   The Meet address is read from Google Calendar at click time, so a link
   changed by Scalia in the calendar is followed.
   ========================================================================== */
'use strict';
const { BOOKING } = require('../server/config');
const { calendar, ip, limited } = require('../server/http');
const { isValidZone } = require('../server/time');
const links = require('../server/links');

const HOUR = 3600000;
const OPEN_BEFORE = 12 * HOUR;   // the link opens 12 h before the start
const CLOSE_AFTER = 3 * HOUR;    // and closes 3 h after the end
const INTL = { fr: 'fr-FR', en: 'en-US', es: 'es-419' };
const T = {
  fr: {
    title: 'Votre échange avec Scalia',
    early: 'Le lien de votre échange s’ouvrira 12 heures avant le rendez-vous.',
    when: 'Rendez-vous', zone: 'heure locale',
    ended: 'Cet échange est terminé.',
    cancelled: 'Ce rendez-vous n’est plus actif.',
    nomeet: 'Scalia vous contactera à l’heure prévue, par email ou WhatsApp.',
    error: 'Ce lien n’est pas disponible pour le moment.',
    contact: 'Une question ? Écrivez-nous.'
  },
  en: {
    title: 'Your meeting with Scalia',
    early: 'Your meeting link opens 12 hours before the meeting.',
    when: 'Meeting', zone: 'local time',
    ended: 'This meeting has ended.',
    cancelled: 'This meeting is no longer active.',
    nomeet: 'Scalia will reach out at the scheduled time, by email or WhatsApp.',
    error: 'This link is not available right now.',
    contact: 'Any question? Write to us.'
  },
  es: {
    title: 'Tu reunión con Scalia',
    early: 'El enlace de tu reunión se abrirá 12 horas antes de la cita.',
    when: 'Cita', zone: 'hora local',
    ended: 'Esta reunión ha terminado.',
    cancelled: 'Esta cita ya no está activa.',
    nomeet: 'Scalia se pondrá en contacto contigo a la hora prevista, por correo o WhatsApp.',
    error: 'Este enlace no está disponible por el momento.',
    contact: '¿Alguna pregunta? Escríbenos.'
  }
};

function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function page(res, status, loc, message, whenLine) {
  const t = T[loc] || T.fr;
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.end('<!doctype html><html lang="' + loc + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="robots" content="noindex,nofollow"><title>' + esc(t.title) + ' · Scalia</title>' +
    '<style>' +
    ':root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;' +
    'background:radial-gradient(120% 60% at 100% 0%,rgba(205,169,130,.1),rgba(205,169,130,0) 60%),linear-gradient(180deg,#1B1512,#100C0A);' +
    'color:#F6F3EE;font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Helvetica,Arial,sans-serif}' +
    'main{width:min(460px,100%);padding:32px 28px;border-radius:24px;background:rgba(255,255,255,.04);box-shadow:inset 0 1px 0 rgba(237,220,196,.16),inset 0 0 0 1px rgba(255,255,255,.07),0 40px 90px -30px rgba(0,0,0,.8)}' +
    'img{display:block;height:34px;width:auto;margin-bottom:26px}h1{margin:0;font-size:26px;line-height:1.15;letter-spacing:-.03em;font-weight:650}' +
    'p{margin:12px 0 0;color:rgba(246,243,238,.72)}.when{margin-top:20px;padding:14px 16px;border-radius:14px;background:rgba(255,255,255,.05);box-shadow:inset 0 0 0 1px rgba(255,255,255,.09);color:#F6F3EE;font-weight:600}' +
    '.links{margin-top:22px;display:flex;flex-wrap:wrap;gap:10px}a{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border-radius:12px;color:#F6F3EE;text-decoration:none;font-weight:600;font-size:15px;background:rgba(255,255,255,.08);box-shadow:inset 0 0 0 1px rgba(255,255,255,.14)}' +
    'a.wa{background:#E2AC56;color:#160F08;box-shadow:none}' +
    '</style></head><body><main>' +
    '<img src="/assets/scalia-horizontal.png" width="87" height="34" alt="Scalia">' +
    '<h1>' + esc(t.title) + '</h1><p>' + esc(message) + '</p>' + (whenLine ? '<div class="when">' + esc(whenLine) + '</div>' : '') +
    '<p>' + esc(t.contact) + '</p><div class="links"><a class="wa" href="https://wa.me/33769965798">WhatsApp</a><a href="mailto:contact@scalia.do">contact@scalia.do</a></div>' +
    '</main></body></html>');
}

module.exports = async function meeting(req, res) {
  const token = (req.query && req.query.t) || new URL(req.url, 'http://x').searchParams.get('t');
  // Fail closed: without the dedicated key no link is accepted.
  try { links.key(); } catch (e) { console.error('[booking] ' + e.code); return page(res, 503, 'fr', T.fr.error); }
  const parsed = links.parse(token);
  if (!parsed) return page(res, 404, 'fr', T.fr.error);
  if (limited('mt:' + ip(req), 30, 10 * 60000)) return page(res, 429, 'fr', T.fr.error);

  const cal = calendar();
  let ev;
  try { ev = await cal.get(parsed.id); } catch (e) { console.error('[booking] meeting link', e.message); return page(res, 503, 'fr', T.fr.error); }
  const p = (ev && ev.extendedProperties && ev.extendedProperties.private) || {};
  // The signature covers the event id and the zone recorded at booking:
  // checked before anything about the event is revealed.
  if (!ev || !p.clientTz || !links.matches(parsed, p.clientTz)) return page(res, 404, 'fr', T.fr.error);
  const loc = T[p.locale] ? p.locale : 'fr';
  const t = T[loc];
  if (ev.status === 'cancelled' || !ev.start || !ev.start.dateTime) return page(res, 410, loc, t.cancelled);

  // Access window on absolute instants only: from 12 h before the start to
  // 3 h after the end. No calendar-day rule, so no zone can move it; the
  // recorded zone is only used to show the time to the client.
  const start = Date.parse(ev.start.dateTime);
  const end = Date.parse(ev.end.dateTime);
  const now = Date.now();
  const tz = isValidZone(p.clientTz) ? p.clientTz : BOOKING.timezone;
  const whenLine = t.when + ' · ' +
    new Intl.DateTimeFormat(INTL[loc], { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(start) +
    ' · ' + t.zone + ' ' + tz.replace(/_/g, ' ');

  if (now < start - OPEN_BEFORE) return page(res, 200, loc, t.early, whenLine);
  if (now > end + CLOSE_AFTER) return page(res, 200, loc, t.ended);
  const meet = cal.meetUrl(ev);
  if (!meet || !/^https:\/\/meet\.google\.com\//.test(meet)) return page(res, 200, loc, t.nomeet, whenLine);
  res.statusCode = 302;
  res.setHeader('Location', meet);
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.end();
};
