/* ==========================================================================
   Scalia Booking · emails
   Sent from contact@scalia.do through Gmail (the Workspace account that
   owns the calendar) by default, or through Resend when RESEND_API_KEY is
   set. Client email in the visitor's language; Scalia's notice in French.
   ========================================================================== */
'use strict';
const crypto = require('crypto');
const { BOOKING } = require('./config');

const INTL = { fr: 'fr-FR', en: 'en-US', es: 'es-419' };
const SITE = 'https://scalia.do';
const LOGO = SITE + '/assets/scalia-horizontal.png';

const T = {
  fr: {
    subject: 'Votre échange avec Scalia est confirmé',
    title: 'C’est réservé.',
    hello: n => 'Bonjour ' + n + ',',
    lead: m => 'Votre échange de ' + m + ' minutes avec Scalia est confirmé.',
    date: 'Date', time: 'Heure', zone: 'Fuseau horaire',
    join: 'Rejoindre l’échange',
    later: 'Vous recevrez le lien de visioconférence avant le rendez-vous.',
    rSubject: t => 'Rappel — votre échange avec Scalia à ' + t,
    rTitle: 'À tout à l’heure.',
    rLead: 'Votre échange avec Scalia commence dans environ une heure.',
    rCompany: 'Entreprise',
    rNoMeet: 'Scalia vous contactera à l’heure prévue, par email ou WhatsApp.',
    rLink: 'Lien de la visioconférence',
    ics: 'L’invitation jointe (.ics) l’ajoute à votre agenda en un geste.',
    change: 'Un empêchement ? Répondez simplement à cet email et nous trouverons un autre moment.',
    sign: 'À très vite,\nL’équipe Scalia',
    event: 'Échange avec Scalia'
  },
  en: {
    subject: 'Your call with Scalia is confirmed',
    title: 'You’re booked.',
    hello: n => 'Hello ' + n + ',',
    lead: m => 'Your ' + m + '-minute call with Scalia is confirmed.',
    date: 'Date', time: 'Time', zone: 'Time zone',
    join: 'Join the call',
    later: 'You’ll receive the video-call link before our meeting.',
    rSubject: t => 'Reminder — your call with Scalia at ' + t,
    rTitle: 'See you soon.',
    rLead: 'Your call with Scalia starts in about an hour.',
    rCompany: 'Company',
    rNoMeet: 'Scalia will reach out at the scheduled time, by email or WhatsApp.',
    rLink: 'Video-call link',
    ics: 'The attached invitation (.ics) adds it to your calendar in one tap.',
    change: 'Something came up? Simply reply to this email and we will find another time.',
    sign: 'Talk soon,\nThe Scalia team',
    event: 'Call with Scalia'
  },
  es: {
    subject: 'Tu reunión con Scalia está confirmada',
    title: 'Está reservado.',
    hello: n => 'Hola ' + n + ',',
    lead: m => 'Tu reunión de ' + m + ' minutos con Scalia está confirmada.',
    date: 'Fecha', time: 'Hora', zone: 'Zona horaria',
    join: 'Unirse a la reunión',
    later: 'Recibirás el enlace de videollamada antes de nuestro encuentro.',
    rSubject: t => 'Recordatorio — tu reunión con Scalia a las ' + t,
    rTitle: 'Hasta ahora.',
    rLead: 'Tu reunión con Scalia empieza en aproximadamente una hora.',
    rCompany: 'Empresa',
    rNoMeet: 'Scalia se pondrá en contacto contigo a la hora prevista, por correo o WhatsApp.',
    rLink: 'Enlace de la videollamada',
    ics: 'La invitación adjunta (.ics) la añade a tu calendario en un gesto.',
    change: '¿Un imprevisto? Responde a este correo y buscaremos otro momento.',
    sign: 'Hasta pronto,\nEl equipo de Scalia',
    event: 'Reunión con Scalia'
  }
};

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function when(ts, tz, loc) {
  const l = INTL[loc] || 'fr-FR';
  return {
    date: new Intl.DateTimeFormat(l, { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(ts),
    time: new Intl.DateTimeFormat(l, { timeZone: tz, hour: '2-digit', minute: '2-digit' }).format(ts),
    zone: tz.replace(/_/g, ' ') + ' (' + new Intl.DateTimeFormat(l, { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(ts).find(p => p.type === 'timeZoneName').value + ')'
  };
}

/* ---------------------------------------------------------------- ics --- */
function icsDate(ts) { return new Date(ts).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
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
// The client's invitation carries no video link: the link comes with the
// reminder one hour before.
function ics(b, loc) {
  const t = T[loc] || T.fr;
  const desc = t.later + '\n\n' + SITE;
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Scalia//Booking//FR', 'METHOD:PUBLISH', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    'UID:' + b.id + '@scalia.do',
    'DTSTAMP:' + icsDate(Date.now()),
    'DTSTART:' + icsDate(b.start),
    'DTEND:' + icsDate(b.end),
    'SUMMARY:' + icsText(t.event),
    'DESCRIPTION:' + icsText(desc),
    'URL:' + SITE,
    'ORGANIZER;CN=Scalia:mailto:' + BOOKING.fromEmail,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM', 'TRIGGER:-PT15M', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsText(t.event), 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'
  ].filter(Boolean).map(fold).join('\r\n') + '\r\n';
}

/* ---------------------------------------------------------- templates --- */
function shell(inner) {
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"></head>' +
    '<body style="margin:0;padding:0;background:#F5F3EF;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F3EF;"><tr><td align="center" style="padding:32px 16px;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FCFBF9;border-radius:20px;border:1px solid #E8E4DE;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Inter,Helvetica,Arial,sans-serif;color:#0E0B0A;">' +
    '<tr><td style="padding:28px 32px 8px;background:#120E0C;border-radius:20px 20px 0 0;"><img src="' + LOGO + '" width="132" height="52" alt="Scalia" style="display:block;border:0;"></td></tr>' +
    inner +
    '<tr><td style="padding:20px 32px 28px;border-top:1px solid #EFECE7;font-size:12px;line-height:1.5;color:#8D857E;">Scalia · <a href="' + SITE + '" style="color:#8A6440;text-decoration:none;">scalia.do</a></td></tr>' +
    '</table></td></tr></table></body></html>';
}
function row(label, value) {
  return '<tr><td style="padding:10px 0;border-bottom:1px solid #EFECE7;font-size:13px;color:#57504A;width:42%;vertical-align:top;">' + esc(label) +
    '</td><td style="padding:10px 0;border-bottom:1px solid #EFECE7;font-size:15px;font-weight:600;vertical-align:top;">' + esc(value).replace(/\n/g, '<br>') + '</td></tr>';
}

function clientMail(b) {
  const loc = T[b.locale] ? b.locale : 'fr';
  const t = T[loc];
  const w = when(b.start, b.timezone, loc);
  const first = b.name.split(/\s+/)[0];
  const html = shell(
    '<tr><td style="padding:28px 32px 4px;"><div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#8A6440;font-weight:600;">Scalia</div>' +
    '<h1 style="margin:10px 0 0;font-size:28px;line-height:1.15;letter-spacing:-.03em;">' + esc(t.title) + '</h1>' +
    '<p style="margin:16px 0 0;font-size:16px;line-height:1.55;">' + esc(t.hello(first)) + '<br>' + esc(t.lead(BOOKING.durationMin)) + '</p></td></tr>' +
    '<tr><td style="padding:16px 32px 8px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">' +
    row(t.date, w.date) + row(t.time, w.time) + row(t.zone, w.zone) + '</table></td></tr>' +
    '<tr><td style="padding:8px 32px 4px;font-size:14.5px;line-height:1.55;color:#0E0B0A;">' + esc(t.later) + '</td></tr>' +
    '<tr><td style="padding:18px 32px 8px;font-size:14px;line-height:1.55;color:#57504A;">' + esc(t.ics) + '<br><br>' + esc(t.change) + '<br><br>' + esc(t.sign).replace(/\n/g, '<br>') + '</td></tr>'
  );
  const text = [t.title, '', t.hello(first), t.lead(BOOKING.durationMin), '',
    t.date + ': ' + w.date, t.time + ': ' + w.time, t.zone + ': ' + w.zone, '',
    t.later, '', t.change, '', t.sign, '', SITE].join('\n');
  return {
    to: b.email, replyTo: BOOKING.notifyEmail, subject: t.subject, html, text,
    attachment: { name: 'scalia.ics', type: 'text/calendar; method=PUBLISH; charset=UTF-8', content: ics(b, loc) }
  };
}

function ownerMail(b) {
  const w = when(b.start, b.timezone, 'fr');
  const ws = when(b.start, BOOKING.timezone, 'fr');
  const rows = [
    ['Nom', b.name], ['Email', b.email], ['Téléphone / WhatsApp', b.phone || '—'], ['Entreprise / activité', b.company || '—'],
    ['Projet demandé', (b.projectTypes || []).map(k => BOOKING.projectTypes[k].fr).join('\n') || '—'],
    ['Date (Scalia)', ws.date + ' · ' + ws.time + ' · ' + ws.zone],
    ['Date (client)', w.date + ' · ' + w.time + ' · ' + w.zone],
    ['Langue', b.locale.toUpperCase()], ['Visioconférence', b.meetUrl || 'non créée']
  ];
  const html = shell(
    '<tr><td style="padding:28px 32px 4px;"><h1 style="margin:0;font-size:22px;letter-spacing:-.02em;">Nouveau rendez-vous</h1>' +
    '<p style="margin:8px 0 0;font-size:14px;color:#57504A;">Réservé sur scalia.do. Répondez à cet email pour écrire directement au client.</p></td></tr>' +
    '<tr><td style="padding:12px 32px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">' + rows.map(r => row(r[0], r[1])).join('') + '</table></td></tr>' +
    '<tr><td style="padding:4px 32px 12px;font-size:13px;color:#57504A;">Projet</td></tr>' +
    '<tr><td style="padding:0 32px 16px;font-size:15px;line-height:1.55;white-space:pre-wrap;">' + esc(b.message || '—') + '</td></tr>'
  );
  const text = ['Nouveau rendez-vous (scalia.do)', ''].concat(rows.map(r => r[0] + ': ' + r[1]), ['', 'Projet:', b.message || '—']).join('\n');
  return { to: BOOKING.notifyEmail, replyTo: b.email, subject: 'Rendez-vous — ' + b.name + ' — ' + ws.date + ' ' + ws.time, html, text };
}

// One hour before: the time, and the way in.
function reminderMail(b) {
  const loc = T[b.locale] ? b.locale : 'fr';
  const t = T[loc];
  const w = when(b.start, b.timezone, loc);
  const first = b.name.split(/\s+/)[0];
  const rows = [[t.date, w.date], [t.time, w.time], [t.zone, w.zone]].concat(b.company ? [[t.rCompany, b.company]] : []);
  const action = b.meetUrl
    ? '<tr><td style="padding:12px 32px 4px;"><a href="' + esc(b.meetUrl) + '" style="display:inline-block;padding:15px 26px;border-radius:13px;background:#E2AC56;color:#160F08;font-size:16px;font-weight:700;text-decoration:none;">' + esc(t.join) + '</a>' +
      '<div style="margin-top:10px;font-size:12px;color:#8D857E;">' + esc(t.rLink) + ' : <a href="' + esc(b.meetUrl) + '" style="color:#8A6440;word-break:break-all;">' + esc(b.meetUrl) + '</a></div></td></tr>'
    : '<tr><td style="padding:12px 32px 4px;font-size:15px;line-height:1.55;">' + esc(t.rNoMeet) + '</td></tr>';
  const html = shell(
    '<tr><td style="padding:28px 32px 4px;"><div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#8A6440;font-weight:600;">Scalia</div>' +
    '<h1 style="margin:10px 0 0;font-size:28px;line-height:1.15;letter-spacing:-.03em;">' + esc(t.rTitle) + '</h1>' +
    '<p style="margin:16px 0 0;font-size:16px;line-height:1.55;">' + esc(t.hello(first)) + '<br>' + esc(t.rLead) + '</p></td></tr>' +
    '<tr><td style="padding:16px 32px 8px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">' +
    rows.map(r => row(r[0], r[1])).join('') + '</table></td></tr>' + action +
    '<tr><td style="padding:18px 32px 8px;font-size:14px;line-height:1.55;color:#57504A;">' + esc(t.sign).replace(/\n/g, '<br>') + '</td></tr>'
  );
  const text = [t.rTitle, '', t.hello(first), t.rLead, ''].concat(rows.map(r => r[0] + ': ' + r[1]),
    ['', b.meetUrl ? t.join + ': ' + b.meetUrl : t.rNoMeet, '', t.sign, '', SITE]).join('\n');
  return { to: b.email, replyTo: BOOKING.notifyEmail, subject: t.rSubject(w.time), html, text };
}

/* --------------------------------------------------------------- send --- */
// Header values: line breaks removed (defence in depth), non-ASCII encoded.
function hdr(s) {
  s = String(s).replace(/[\r\n]+/g, ' ');
  return /^[\x20-\x7e]*$/.test(s) ? s : '=?UTF-8?B?' + Buffer.from(s, 'utf8').toString('base64') + '?=';
}
function addr(s) { return String(s).replace(/[\r\n<>,;]/g, ''); }
function b64lines(s) { return Buffer.from(s, 'utf8').toString('base64').replace(/.{76}/g, '$&\r\n'); }
function mime(m) {
  const alt = 'alt_' + crypto.randomBytes(8).toString('hex');
  const mix = 'mix_' + crypto.randomBytes(8).toString('hex');
  const head = [
    'From: ' + hdr(BOOKING.fromName) + ' <' + addr(BOOKING.fromEmail) + '>',
    'To: ' + addr(m.to),
    'Reply-To: ' + addr(m.replyTo),
    'Date: ' + new Date().toUTCString().replace('GMT', '+0000'),
    'Subject: ' + hdr(m.subject),
    'MIME-Version: 1.0'
  ];
  const altPart = [
    '--' + alt, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', b64lines(m.text),
    '--' + alt, 'Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', b64lines(m.html),
    '--' + alt + '--'
  ].join('\r\n');
  if (!m.attachment) return head.concat(['Content-Type: multipart/alternative; boundary="' + alt + '"', '', altPart]).join('\r\n');
  return head.concat([
    'Content-Type: multipart/mixed; boundary="' + mix + '"', '',
    '--' + mix, 'Content-Type: multipart/alternative; boundary="' + alt + '"', '', altPart,
    '--' + mix, 'Content-Type: ' + m.attachment.type, 'Content-Disposition: attachment; filename="' + m.attachment.name + '"',
    'Content-Transfer-Encoding: base64', '', b64lines(m.attachment.content),
    '--' + mix + '--'
  ]).join('\r\n');
}

async function viaResend(m) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: BOOKING.fromName + ' <' + BOOKING.fromEmail + '>', to: [m.to], reply_to: m.replyTo,
      subject: m.subject, html: m.html, text: m.text,
      attachments: m.attachment ? [{ filename: m.attachment.name, content: Buffer.from(m.attachment.content).toString('base64') }] : undefined
    })
  });
  if (!r.ok) throw new Error('resend_' + r.status);
}

async function send(cal, m) {
  if (process.env.RESEND_API_KEY && !cal.DIR) return viaResend(m);
  return cal.sendMail(mime(m));
}

module.exports = { clientMail, ownerMail, reminderMail, send, ics };
