/* ==========================================================================
   Scalia Booking · the client's calendar entry, in one place
   Used by the confirmation email (.ics attachment), the "Ajouter à mon
   agenda" button (Google Calendar link) and /api/ics (Apple / Outlook).
   - Instants only (UTC, ...Z): every calendar shows the meeting in its own
     zone, DST included. No hand-made offsets.
   - The .ics UID is the Google event's own iCalUID, so importing it where
     Google Calendar already shows the invitation updates that event
     instead of adding a second one (Google Calendar and Apple Calendar
     both match on UID).
   - The video link is the signed Scalia link, never the Meet address.
   ========================================================================== */
'use strict';

const COPY = {
  fr: { title: 'Échange avec Scalia', intro: 'Votre échange avec Scalia.', access: 'Accès à la visioconférence :', none: 'Scalia vous contactera à l’heure prévue.' },
  en: { title: 'Meeting with Scalia', intro: 'Your meeting with Scalia.', access: 'Video-call access:', none: 'Scalia will reach out at the scheduled time.' },
  es: { title: 'Reunión con Scalia', intro: 'Tu reunión con Scalia.', access: 'Acceso a la videollamada:', none: 'Scalia se pondrá en contacto contigo a la hora prevista.' }
};

function texts(locale, meetingUrl) {
  const c = COPY[locale] || COPY.fr;
  return {
    title: c.title,
    details: c.intro + '\n\n' + (meetingUrl ? c.access + '\n' + meetingUrl : c.none) + '\n\nscalia.do'
  };
}

function utc(ts) { return new Date(ts).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }

// Google Calendar "add event" link (opens the visitor's own Google Calendar).
function googleUrl(b) {
  const t = texts(b.locale, b.meetingUrl);
  const q = new URLSearchParams({ action: 'TEMPLATE', text: t.title, dates: utc(b.start) + '/' + utc(b.end), details: t.details });
  if (b.meetingUrl) q.set('location', b.meetingUrl);
  return 'https://calendar.google.com/calendar/render?' + q.toString();
}

// Outlook on the web (Outlook.com / Microsoft 365 accounts signed in).
function outlookUrl(b) {
  const t = texts(b.locale, b.meetingUrl);
  const q = new URLSearchParams({
    path: '/calendar/action/compose', rru: 'addevent', subject: t.title,
    startdt: new Date(b.start).toISOString(), enddt: new Date(b.end).toISOString(), body: t.details
  });
  if (b.meetingUrl) q.set('location', b.meetingUrl);
  return 'https://outlook.live.com/calendar/0/deeplink/compose?' + q.toString();
}

function icsText(s) { return String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, m => '\\' + m); }
function fold(line) {
  const out = [];
  let buf = Buffer.from(line, 'utf8');
  while (buf.length > 75) {
    let cut = 75;
    while (cut > 0 && (buf[cut] & 0xC0) === 0x80) cut--;   // never split a UTF-8 character
    out.push(buf.slice(0, cut).toString('utf8'));
    buf = Buffer.concat([Buffer.from(' '), buf.slice(cut)]);
  }
  out.push(buf.toString('utf8'));
  return out.join('\r\n');
}

// b: { uid, start, end, locale, meetingUrl, organizer }
function ics(b) {
  const t = texts(b.locale, b.meetingUrl);
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Scalia//Booking//FR', 'METHOD:PUBLISH', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    'UID:' + b.uid,
    'DTSTAMP:' + utc(Date.now()),
    'DTSTART:' + utc(b.start),
    'DTEND:' + utc(b.end),
    'SUMMARY:' + icsText(t.title),
    'DESCRIPTION:' + icsText(t.details),
    b.meetingUrl ? 'LOCATION:' + icsText(b.meetingUrl) : null,
    'URL:' + (b.meetingUrl || 'https://scalia.do'),
    b.organizer ? 'ORGANIZER;CN=Scalia:mailto:' + b.organizer : null,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM', 'TRIGGER:-PT15M', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsText(t.title), 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'
  ].filter(Boolean).map(fold).join('\r\n') + '\r\n';
}

module.exports = { texts, googleUrl, outlookUrl, ics };
