/* ==========================================================================
   Scalia Portal · access emails (invitation, new password), in the
   client's language, through the same sender as the booking emails
   (Gmail as contact@scalia.do, or Resend). Supabase sends nothing itself:
   its admin API only creates the one-time token placed in the link.
   Local test backend: the email is written as an .eml file.
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const { BOOKING } = require('../config');
const mail = require('../mail');

const T = {
  es: {
    inviteSubject: c => 'Tu espacio de proyecto Scalia' + (c ? ' · ' + c : ''),
    inviteTitle: 'Tu espacio de proyecto está listo.',
    inviteLead: c => 'Scalia te ha creado un acceso privado para seguir tu proyecto' + (c ? ' de ' + c : '') + ': avance, próximas etapas, pagos y documentos.',
    inviteCta: 'Crear mi contraseña',
    resetSubject: 'Elige una nueva contraseña · Scalia',
    resetTitle: 'Nueva contraseña.',
    resetLead: 'Recibimos una solicitud para cambiar la contraseña de tu espacio de proyecto Scalia.',
    resetCta: 'Elegir una nueva contraseña',
    hello: n => n ? 'Hola ' + n + ',' : 'Hola,',
    expiry: 'Este enlace es personal y válido 24 horas. Scalia nunca te pedirá tu contraseña.',
    ignore: 'Si no esperabas este correo, puedes ignorarlo.',
    then: 'Después, entra siempre desde scalia.do/portal.',
    sign: 'El equipo Scalia'
  },
  fr: {
    inviteSubject: c => 'Votre espace projet Scalia' + (c ? ' · ' + c : ''),
    inviteTitle: 'Votre espace projet est prêt.',
    inviteLead: c => 'Scalia vous a créé un accès privé pour suivre votre projet' + (c ? ' ' + c : '') + ' : avancement, prochaines étapes, paiements et documents.',
    inviteCta: 'Créer mon mot de passe',
    resetSubject: 'Choisissez un nouveau mot de passe · Scalia',
    resetTitle: 'Nouveau mot de passe.',
    resetLead: 'Nous avons reçu une demande de changement du mot de passe de votre espace projet Scalia.',
    resetCta: 'Choisir un nouveau mot de passe',
    hello: n => n ? 'Bonjour ' + n + ',' : 'Bonjour,',
    expiry: 'Ce lien est personnel et valable 24 heures. Scalia ne vous demandera jamais votre mot de passe.',
    ignore: 'Si vous n’attendiez pas cet email, vous pouvez l’ignorer.',
    then: 'Ensuite, connectez-vous toujours depuis scalia.do/portal.',
    sign: 'L’équipe Scalia'
  },
  en: {
    inviteSubject: c => 'Your Scalia project space' + (c ? ' · ' + c : ''),
    inviteTitle: 'Your project space is ready.',
    inviteLead: c => 'Scalia has created a private access for you to follow your project' + (c ? ' for ' + c : '') + ': progress, next steps, payments and documents.',
    inviteCta: 'Create my password',
    resetSubject: 'Choose a new password · Scalia',
    resetTitle: 'New password.',
    resetLead: 'We received a request to change the password of your Scalia project space.',
    resetCta: 'Choose a new password',
    hello: n => n ? 'Hello ' + n + ',' : 'Hello,',
    expiry: 'This link is personal and valid for 24 hours. Scalia will never ask for your password.',
    ignore: 'If you weren’t expecting this email, you can ignore it.',
    then: 'After that, always sign in from scalia.do/portal.',
    sign: 'The Scalia team'
  }
};

// kind: 'invite' | 'reset'
function accessMail(o) {
  const t = T[o.locale] || T.es;
  const invite = o.kind === 'invite';
  const esc = mail.esc;
  const title = invite ? t.inviteTitle : t.resetTitle;
  const lead = invite ? t.inviteLead(o.company) : t.resetLead;
  const cta = invite ? t.inviteCta : t.resetCta;
  const p = s => '<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#57504A;">' + esc(s) + '</p>';
  const inner =
    '<tr><td style="padding:32px 32px 8px;">' +
    '<h1 style="margin:0 0 18px;font-size:24px;line-height:1.25;font-weight:650;color:#0E0B0A;">' + esc(title) + '</h1>' +
    p(t.hello(o.name)) + p(lead) +
    '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 22px;"><tr><td style="border-radius:12px;background:#E2AC56;">' +
    '<a href="' + esc(o.url) + '" style="display:inline-block;padding:15px 26px;font-size:15px;font-weight:600;color:#160F08;text-decoration:none;border-radius:12px;">' + esc(cta) + '</a></td></tr></table>' +
    '<p style="margin:0 0 10px;font-size:13px;line-height:1.55;color:#8D857E;">' + esc(t.expiry) + ' ' + esc(t.ignore) + '</p>' +
    '<p style="margin:0 0 22px;font-size:13px;line-height:1.55;color:#8D857E;">' + esc(t.then) + '</p>' +
    '<p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#0E0B0A;">' + esc(t.sign) + '</p>' +
    '</td></tr>';
  const textBody = [t.hello(o.name), '', lead, '', cta + ': ' + o.url, '', t.expiry, t.ignore, t.then, '', t.sign].join('\n');
  return { to: o.to, replyTo: BOOKING.fromEmail, subject: invite ? t.inviteSubject(o.company) : t.resetSubject, html: mail.shell(inner), text: textBody };
}

// The local test backend keeps the email as a file instead of sending it.
async function send(backend, m) {
  if (backend.name === 'mock') {
    const transport = {
      DIR: backend.DIR,
      async sendMail(raw) {
        fs.mkdirSync(backend.DIR, { recursive: true });
        const f = path.join(backend.DIR, 'mail-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6) + '.eml');
        fs.writeFileSync(f, raw);
        console.log('[portal] email written: ' + f);
      }
    };
    return mail.send(transport, m);
  }
  return mail.send(require('../google'), m);
}

module.exports = { accessMail, send };
