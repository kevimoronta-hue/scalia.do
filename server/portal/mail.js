/* ==========================================================================
   Scalia Portal · access emails (invitation, new password) and the
   welcome email (password chosen, portal ready), in the client's language
   and, where the language has it, the client's gender (users.gender), through the same sender as the booking emails
   (Gmail as contact@scalia.do, or Resend when RESEND_API_KEY is set).
   The link carries a one-time token (server/portal/auth.js).
   PORTAL_MOCK=1: the email is written as an .eml file instead.
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const { BOOKING } = require('../config');
const mail = require('../mail');
const config = require('./config');

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
    resetExpiry: 'Este enlace es personal y válido 1 hora. Scalia nunca te pedirá tu contraseña.',
    ignore: 'Si no esperabas este correo, puedes ignorarlo.',
    then: 'Después, entra siempre desde scalia.do/portal.',
    // Welcome (password chosen). g: 'm' | 'f' | '' (neutral)
    welcomeSubject: g => (g === 'm' ? 'Bienvenido' : g === 'f' ? 'Bienvenida' : 'Te damos la bienvenida') + ' a tu portal Scalia',
    welcomeTitle: (g, n) => g === 'm' ? '¡Bienvenido' + (n ? ', ' + n : '') + '!' : g === 'f' ? '¡Bienvenida' + (n ? ', ' + n : '') + '!' : 'Te damos la bienvenida' + (n ? ', ' + n : '') + '.',
    welcomeLead: c => 'Tu cuenta está activada. Desde hoy sigues tu proyecto' + (c ? ' de ' + c : '') + ' en tiempo real, en un solo lugar:',
    welcomeItems: [
      'El avance de cada etapa, del brief a la entrega.',
      'Las próximas etapas y lo que necesitamos de ti, en el momento justo.',
      'Tus pagos: lo pagado y lo que queda.',
      'Tus documentos (contratos, maquetas, facturas, entregables), siempre a mano.'
    ],
    welcomeCta: 'Ir a mi portal',
    welcomeLogin: e => 'Para entrar: scalia.do/portal, con tu correo ' + e + ' y la contraseña que acabas de crear.',
    welcomeHelp: '¿Una pregunta? Responde a este correo y te contestamos directamente.',
    welcomeSafety: 'Si no fuiste tú quien creó esta contraseña, avísanos respondiendo a este correo.',
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
    resetExpiry: 'Ce lien est personnel et valable 1 heure. Scalia ne vous demandera jamais votre mot de passe.',
    ignore: 'Si vous n’attendiez pas cet email, vous pouvez l’ignorer.',
    then: 'Ensuite, connectez-vous toujours depuis scalia.do/portal.',
    // Welcome (password chosen). g: 'm' | 'f' | '' (neutral)
    welcomeSubject: g => (g === 'm' ? 'Bienvenu' : 'Bienvenue') + ' sur votre portail Scalia',
    welcomeTitle: (g, n) => (g === 'm' ? 'Bienvenu' : 'Bienvenue') + (n ? ', ' + n : '') + '.',
    welcomeLead: c => 'Votre compte est activé. Vous suivez désormais votre projet' + (c ? ' ' + c : '') + ' en temps réel, au même endroit :',
    welcomeItems: [
      'L’avancement de chaque étape, du brief à la livraison.',
      'Les prochaines étapes, et ce dont nous avons besoin de votre part au bon moment.',
      'Vos paiements : ce qui est réglé et ce qui reste.',
      'Vos documents (contrats, maquettes, factures, livrables), toujours à portée de main.'
    ],
    welcomeCta: 'Accéder à mon portail',
    welcomeLogin: e => 'Pour vous connecter : scalia.do/portal, avec votre email ' + e + ' et le mot de passe que vous venez de créer.',
    welcomeHelp: 'Une question ? Répondez simplement à cet email, nous vous répondons directement.',
    welcomeSafety: 'Si vous n’êtes pas à l’origine de ce mot de passe, prévenez-nous en répondant à cet email.',
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
    resetExpiry: 'This link is personal and valid for 1 hour. Scalia will never ask for your password.',
    ignore: 'If you weren’t expecting this email, you can ignore it.',
    then: 'After that, always sign in from scalia.do/portal.',
    // Welcome (password chosen). English has no gendered form.
    welcomeSubject: () => 'Welcome to your Scalia portal',
    welcomeTitle: (g, n) => 'Welcome' + (n ? ', ' + n : '') + '.',
    welcomeLead: c => 'Your account is active. From now on you follow your project' + (c ? ' for ' + c : '') + ' in real time, in one place:',
    welcomeItems: [
      'The progress of each stage, from brief to delivery.',
      'The next steps, and what we need from you, right when we need it.',
      'Your payments: what is paid and what is left.',
      'Your documents (contracts, mockups, invoices, deliverables), always at hand.'
    ],
    welcomeCta: 'Go to my portal',
    welcomeLogin: e => 'To sign in: scalia.do/portal, with your email ' + e + ' and the password you just created.',
    welcomeHelp: 'A question? Just reply to this email and we will answer you directly.',
    welcomeSafety: 'If you did not create this password, let us know by replying to this email.',
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
    '<p style="margin:0 0 10px;font-size:13px;line-height:1.55;color:#8D857E;">' + esc(invite ? t.expiry : t.resetExpiry) + ' ' + esc(t.ignore) + '</p>' +
    '<p style="margin:0 0 22px;font-size:13px;line-height:1.55;color:#8D857E;">' + esc(t.then) + '</p>' +
    '<p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#0E0B0A;">' + esc(t.sign) + '</p>' +
    '</td></tr>';
  const textBody = [t.hello(o.name), '', lead, '', cta + ': ' + o.url, '', invite ? t.expiry : t.resetExpiry, t.ignore, t.then, '', t.sign].join('\n');
  return { to: o.to, replyTo: BOOKING.fromEmail, subject: invite ? t.inviteSubject(o.company) : t.resetSubject, html: mail.shell(inner), text: textBody };
}

// Password chosen through an invitation: what the portal is for, how to
// come back, who to ask. o: { to, locale, gender, firstName, company, url }
function welcomeMail(o) {
  const t = T[o.locale] || T.es;
  const esc = mail.esc;
  const p = s => '<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#57504A;">' + esc(s) + '</p>';
  const li = s => '<tr><td style="width:22px;padding:0 0 10px;vertical-align:top;font-size:15px;line-height:1.6;color:#E2AC56;">&#10003;</td>' +
    '<td style="padding:0 0 10px;font-size:15px;line-height:1.6;color:#57504A;">' + esc(s) + '</td></tr>';
  const lead = t.welcomeLead(o.company);
  const inner =
    '<tr><td style="padding:32px 32px 8px;">' +
    '<h1 style="margin:0 0 18px;font-size:24px;line-height:1.25;font-weight:650;color:#0E0B0A;">' + esc(t.welcomeTitle(o.gender, o.firstName)) + '</h1>' +
    p(lead) +
    '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">' + t.welcomeItems.map(li).join('') + '</table>' +
    '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:14px 0 22px;"><tr><td style="border-radius:12px;background:#E2AC56;">' +
    '<a href="' + esc(o.url) + '" style="display:inline-block;padding:15px 26px;font-size:15px;font-weight:600;color:#160F08;text-decoration:none;border-radius:12px;">' + esc(t.welcomeCta) + '</a></td></tr></table>' +
    '<p style="margin:0 0 10px;font-size:13px;line-height:1.55;color:#8D857E;">' + esc(t.welcomeLogin(o.to)) + '</p>' +
    '<p style="margin:0 0 10px;font-size:13px;line-height:1.55;color:#8D857E;">' + esc(t.welcomeHelp) + '</p>' +
    '<p style="margin:0 0 22px;font-size:13px;line-height:1.55;color:#8D857E;">' + esc(t.welcomeSafety) + '</p>' +
    '<p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#0E0B0A;">' + esc(t.sign) + '</p>' +
    '</td></tr>';
  const textBody = [t.welcomeTitle(o.gender, o.firstName), '', lead].concat(t.welcomeItems.map(x => '- ' + x),
    ['', t.welcomeCta + ': ' + o.url, '', t.welcomeLogin(o.to), t.welcomeHelp, t.welcomeSafety, '', t.sign]).join('\n');
  return { to: o.to, replyTo: BOOKING.fromEmail, subject: t.welcomeSubject(o.gender), html: mail.shell(inner), text: textBody, messageId: o.messageId };
}

// PORTAL_MOCK=1 keeps the email as a file instead of sending it.
async function send(m) {
  if (config.mock()) {
    const dir = config.mockDir();
    const transport = {
      DIR: dir,
      async sendMail(raw) {
        fs.mkdirSync(dir, { recursive: true });
        const f = path.join(dir, 'mail-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6) + '.eml');
        fs.writeFileSync(f, raw);
        console.log('[portal] email written: ' + f);
      }
    };
    return mail.send(transport, m);
  }
  return mail.send(require('../google'), m);
}

module.exports = { accessMail, welcomeMail, send };
