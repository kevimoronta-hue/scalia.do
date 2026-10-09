/* ==========================================================================
   Scalia · applications (/join/): question bank, validation, emails.
   The 12 questions live here in French, the language Scalia reads them in;
   the page shows the same wording (join/index.html, translated by i18n).
   No scoring: the answers are listed as given, for a person to read.
   ========================================================================== */
'use strict';
const { BOOKING } = require('./config');
const { EMAIL, clean } = require('./http');
const phoneFmt = require('./phone');
const mail = require('./mail');

const QUESTIONS = [
  ['Dans quel domaine penses-tu pouvoir apporter le plus de valeur à Scalia ?',
    ['Créativité et design', 'Commercial et développement', 'Technique et exécution', 'Organisation et stratégie']],
  ['Quand tu veux vraiment atteindre un objectif, tu es plutôt…',
    ['Très persévérant', 'Très méthodique', 'Très compétitif', 'Très adaptable']],
  ['Face à quelque chose que tu ne sais pas encore faire…',
    ['Je cherche jusqu’à comprendre', 'Je demande rapidement de l’aide', 'Je teste plusieurs solutions', 'J’attends qu’on me donne une méthode claire']],
  ['Dans une équipe, quel rôle prends-tu naturellement ?',
    ['Je prends les devants', 'Je fais avancer les choses sans chercher la lumière', 'Je stimule les idées', 'Je structure et coordonne']],
  ['Si un collègue est en difficulté alors que ta propre tâche est terminée, tu fais quoi ?',
    ['Je lui propose spontanément mon aide', 'Je lui demande s’il a besoin de quelque chose', 'Je continue sur mes propres objectifs', 'J’attends qu’un responsable me demande d’intervenir']],
  ['Un collègue obtient un très bon résultat sur un projet auquel tu as aussi participé. Ta première réaction ?',
    ['Je le félicite sincèrement', 'Je suis content si l’équipe gagne', 'Je regarde surtout ce que j’aurais pu mieux faire', 'J’ai besoin que ma contribution soit aussi reconnue']],
  ['Quand tu n’es pas d’accord avec quelqu’un de l’équipe…',
    ['J’écoute son raisonnement avant de défendre le mien', 'J’explique directement mon point de vue', 'Je cherche une solution qui fonctionne pour les deux', 'Je préfère éviter le conflit']],
  ['Si une décision est bonne pour l’équipe mais ne t’avantage pas personnellement…',
    ['Je la soutiens si elle est juste', 'Je l’accepte même si ça me dérange', 'J’essaie de trouver un compromis', 'Je défends d’abord mon intérêt']],
  ['Qu’est-ce qui te motive le plus ?',
    ['Construire quelque chose de grand', 'Progresser et apprendre vite', 'Obtenir des résultats forts', 'Faire un travail dont je peux être fier']],
  ['Quand une mission devient vraiment difficile…',
    ['Je redouble d’efforts', 'Je change d’approche', 'Je demande du recul à l’équipe', 'Je découpe le problème jusqu’à ce qu’il devienne gérable']],
  ['Quelle qualité te décrit le mieux dans le travail ?',
    ['Ambition', 'Discipline', 'Fiabilité', 'Créativité']],
  ['Qu’est-ce que tu aimerais apporter à Scalia dans les 12 prochains mois ?',
    ['Plus de clients', 'Une meilleure image et de meilleures idées', 'De meilleurs produits et une meilleure exécution', 'Une équipe plus forte et mieux organisée']]
];
const LETTERS = ['A', 'B', 'C', 'D'];
// Groups for reading only (5 to 8 are the relational questions).
const GROUPS = [[0, 4, 'Profil'], [4, 8, 'Relationnel'], [8, 12, 'Motivation']];

// The Vercel function body limit is 4.5 MB: the CV and the form fit under it.
const CV_MAX = 4 * 1024 * 1024;
const BODY_MAX = CV_MAX + 256 * 1024;
const CV_TYPES = {
  pdf: { type: 'application/pdf', magic: b => b.slice(0, 5).toString('latin1') === '%PDF-' },
  docx: { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', magic: b => b.readUInt32BE(0) === 0x504B0304 },
  doc: { type: 'application/msword', magic: b => b.length >= 8 && b.readUInt32BE(0) === 0xD0CF11E0 && b.readUInt32BE(4) === 0xA1B11AE1 }
};

function url(v) {
  const s = clean(v, 300);
  if (!s) return s;                                  // '' (empty) or null (too long)
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : 'https://' + s);
    return /^https?:$/.test(u.protocol) && /\./.test(u.hostname) ? u.href : null;
  } catch (e) { return null; }
}
function ascii(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40); }

// fields: plain strings from the multipart body; cv: { filename, data }.
function validate(f, cv) {
  const errors = {}, d = {};
  const req = (k, max) => {
    const v = clean(f[k], max);
    if (v === null) errors[k] = 'INVALID'; else if (!v) errors[k] = 'REQUIRED';
    return v || '';
  };
  d.firstName = req('firstName', 80);
  d.lastName = req('lastName', 80);
  d.email = clean(f.email, 254) || '';
  if (!d.email) errors.email = 'REQUIRED'; else if (!EMAIL.test(d.email)) errors.email = 'INVALID';
  d.phone = clean(f.phone, 32) || '';
  if (!d.phone) errors.phone = 'REQUIRED'; else if (!phoneFmt.E164.test(d.phone)) errors.phone = 'INVALID';
  d.phoneDial = /^\d{1,4}$/.test(f.phoneDial || '') ? f.phoneDial : '';
  d.country = /^[A-Z]{2}$/.test(f.country || '') ? f.country : '';
  if (!d.country) errors.country = 'REQUIRED';
  d.city = req('city', 80);
  d.role = req('role', 120);
  d.linkedin = url(f.linkedin);
  if (d.linkedin === null) errors.linkedin = 'INVALID';
  d.portfolio = url(f.portfolio);
  if (d.portfolio === null) errors.portfolio = 'INVALID';
  d.answers = QUESTIONS.map((q, i) => LETTERS.indexOf(f['q' + (i + 1)]));
  if (d.answers.some(a => a < 0)) errors.answers = 'INCOMPLETE';
  if (f.consent !== '1') errors.consent = 'REQUIRED';
  d.locale = ['fr', 'en', 'es'].indexOf(f.locale) >= 0 ? f.locale : 'fr';

  if (!cv || !cv.data || !cv.data.length) errors.cv = 'REQUIRED';
  else {
    const ext = (/\.([A-Za-z0-9]{1,5})$/.exec(cv.filename || '') || [])[1];
    const kind = ext && CV_TYPES[ext.toLowerCase()];
    if (cv.data.length > CV_MAX) errors.cv = 'TOO_LARGE';
    else if (!kind || !kind.magic(cv.data)) errors.cv = 'TYPE';
    else d.cv = { name: 'CV-' + (ascii(d.firstName + ' ' + d.lastName) || 'candidat') + '.' + ext.toLowerCase(), type: kind.type, content: cv.data };
  }
  return { errors, data: d };
}

function countryName(iso, loc) {
  try { return new Intl.DisplayNames([loc], { type: 'region' }).of(iso) || iso; } catch (e) { return iso; }
}

/* ---------------------------------------------------------- emails ----- */
// The automatic summary (server/ai-summary.js): { status: 'ok', data } →
// a quiet ivory box, the disclaimer under it. Any other status → one line.
const AI_NOTE = 'Résumé généré automatiquement à partir des réponses déclarées par le candidat. Aide à la lecture uniquement.';
const AI_NONE = 'Résumé automatique indisponible.';
function okSummary(sum) { return sum && sum.status === 'ok' && sum.data ? sum.data : null; }
function summaryBlock(sum) {
  const s = okSummary(sum);
  if (!s) return '<tr><td style="padding:20px 32px 4px;font-size:14px;line-height:1.5;color:#57504A;">' + AI_NONE + '</td></tr>';
  const label = t => '<p style="margin:14px 0 3px;font-size:11.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#8A6440;">' + mail.esc(t) + '</p>';
  const para = t => '<p style="margin:0;font-size:14.5px;line-height:1.5;color:#0E0B0A;">' + mail.esc(t) + '</p>';
  const items = a => '<p style="margin:0;font-size:14.5px;line-height:1.55;color:#0E0B0A;">' + a.map(x => '• ' + mail.esc(x)).join('<br>') + '</p>';
  return '<tr><td style="padding:20px 32px 0;"><div style="background:#FBF6EE;border:1px solid #EEE3D2;border-radius:14px;padding:18px 20px;">' +
    '<p style="margin:0;font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#0E0B0A;">Synthèse automatique</p>' +
    label('Style de travail') + para(s.workStyle) + label('Relationnel') + para(s.relationalStyle) +
    label('Motivations') + items(s.motivations) + label('Forces potentielles à explorer') + items(s.potentialStrengths) +
    label('À approfondir en entretien') + items(s.interviewTopics) + label('Synthèse') + para(s.summary) +
    '</div></td></tr>' +
    '<tr><td style="padding:8px 34px 0;font-size:11.5px;line-height:1.45;color:#A39B94;">' + mail.esc(AI_NOTE) + '</td></tr>';
}
function summaryText(sum) {
  const s = okSummary(sum);
  if (!s) return [AI_NONE];
  return ['SYNTHÈSE AUTOMATIQUE', '', 'Style de travail : ' + s.workStyle, 'Relationnel : ' + s.relationalStyle,
    'Motivations : ' + s.motivations.join(' · '), 'Forces potentielles à explorer : ' + s.potentialStrengths.join(' · '),
    'À approfondir en entretien : ' + s.interviewTopics.join(' · '), 'Synthèse : ' + s.summary, '', '(' + AI_NOTE + ')'];
}
const section = t => '<tr><td style="padding:24px 32px 2px;"><h2 style="margin:0;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#0E0B0A;">' + mail.esc(t) + '</h2></td></tr>';

// What the summary is built from: questions and chosen answers, in French.
function answersFor(d) { return QUESTIONS.map((q, i) => ({ q: q[0], a: q[1][d.answers[i]] })); }

// Order: summary, contact details, role sought, the 12 raw answers, the CV.
function ownerMail(d, sum) {
  const name = d.firstName + ' ' + d.lastName;
  const phone = phoneFmt.display(d.phone, d.phoneDial) || d.phone;
  const rows = [
    ['Nom', name], ['Email', d.email], ['Téléphone / WhatsApp', phone],
    ['Pays', countryName(d.country, 'fr')], ['Ville', d.city],
    ['LinkedIn', d.linkedin || '—'], ['Portfolio / site', d.portfolio || '—'], ['Langue', d.locale.toUpperCase()]
  ];
  const links = { 'Téléphone / WhatsApp': phoneFmt.whatsapp(d.phone), LinkedIn: d.linkedin, 'Portfolio / site': d.portfolio, Email: 'mailto:' + d.email };
  const answers = GROUPS.map(([a, b, label]) =>
    '<tr><td style="padding:16px 32px 2px;font-size:11.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#8A6440;">' + mail.esc(label) + '</td></tr>' +
    QUESTIONS.slice(a, b).map((q, k) => {
      const i = a + k, n = d.answers[i];
      return '<tr><td style="padding:10px 32px 0;"><p style="margin:0;font-size:13px;line-height:1.45;color:#57504A;">' + (i + 1) + '. ' + mail.esc(q[0]) + '</p>' +
        '<p style="margin:4px 0 0;font-size:15.5px;line-height:1.4;font-weight:600;">' + LETTERS[n] + '. ' + mail.esc(q[1][n]) + '</p></td></tr>';
    }).join('')).join('');
  const html = mail.shell(
    '<tr><td style="padding:28px 32px 0;"><h1 style="margin:0;font-size:22px;letter-spacing:-.02em;">Candidature — ' + mail.esc(name) + '</h1>' +
    '<p style="margin:8px 0 0;font-size:14px;color:#57504A;">Reçue sur scalia.do/join. Répondez à cet email pour écrire directement au candidat.</p></td></tr>' +
    summaryBlock(sum) +
    section('Coordonnées') +
    '<tr><td style="padding:6px 32px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">' +
    rows.map(r => mail.row(r[0], r[1], r[1] !== '—' && links[r[0]])).join('') + '</table></td></tr>' +
    section('Domaine / poste') +
    '<tr><td style="padding:8px 32px 0;font-size:15.5px;line-height:1.45;font-weight:600;">' + mail.esc(d.role) + '</td></tr>' +
    section('Réponses aux 12 questions') + answers +
    section('CV') +
    '<tr><td style="padding:8px 32px 22px;font-size:14.5px;line-height:1.5;">En pièce jointe : ' + mail.esc(d.cv.name) + '</td></tr>'
  );
  const text = ['Candidature — ' + name, ''].concat(summaryText(sum), ['', 'COORDONNÉES'], rows.map(r => r[0] + ': ' + r[1]),
    ['', 'DOMAINE / POSTE', d.role, '', 'RÉPONSES AUX 12 QUESTIONS', ''],
    QUESTIONS.map((q, i) => (i + 1) + '. ' + q[0] + '\n   ' + LETTERS[d.answers[i]] + '. ' + q[1][d.answers[i]]), ['', 'CV en pièce jointe : ' + d.cv.name]).join('\n');
  return {
    to: BOOKING.notifyEmail, replyTo: d.email,
    subject: 'Candidature — ' + name + ' — ' + d.role, html, text,
    attachment: { name: d.cv.name, type: d.cv.type, content: d.cv.content }
  };
}

const T = {
  fr: {
    subject: 'Votre candidature chez Scalia a bien été reçue',
    title: 'Candidature reçue.',
    hello: n => 'Bonjour ' + n + ',',
    body: ['Merci pour votre intérêt pour Scalia.', 'Nous avons bien reçu votre candidature ainsi que votre CV.',
      'Notre équipe prendra le temps d’étudier votre profil avec attention.', 'Nous reviendrons vers vous dans un délai de 24 à 48 heures.'],
    sign: 'L’équipe Scalia'
  },
  en: {
    subject: 'Your application to Scalia has been received',
    title: 'Application received.',
    hello: n => 'Hello ' + n + ',',
    body: ['Thank you for your interest in Scalia.', 'We have received your application and your CV.',
      'Our team will take the time to review your profile carefully.', 'We will get back to you within 24 to 48 hours.'],
    sign: 'The Scalia team'
  },
  es: {
    subject: 'Hemos recibido tu candidatura en Scalia',
    title: 'Candidatura recibida.',
    hello: n => 'Hola ' + n + ',',
    body: ['Gracias por tu interés en Scalia.', 'Hemos recibido tu candidatura y tu CV.',
      'Nuestro equipo estudiará tu perfil con atención.', 'Te responderemos en un plazo de 24 a 48 horas.'],
    sign: 'El equipo de Scalia'
  }
};

function candidateMail(d) {
  const t = T[d.locale] || T.fr;
  const html = mail.shell(
    '<tr><td style="padding:28px 32px 4px;"><h1 style="margin:0;font-size:28px;line-height:1.15;letter-spacing:-.03em;">' + mail.esc(t.title) + '</h1>' +
    '<p style="margin:16px 0 0;font-size:16px;line-height:1.55;">' + mail.esc(t.hello(d.firstName)) + '</p></td></tr>' +
    '<tr><td style="padding:8px 32px 8px;font-size:16px;line-height:1.6;">' + t.body.map(p => '<p style="margin:0 0 12px;">' + mail.esc(p) + '</p>').join('') + '</td></tr>' +
    '<tr><td style="padding:4px 32px 18px;font-size:14px;line-height:1.55;color:#57504A;">' + mail.esc(t.sign) + '</td></tr>'
  );
  const text = [t.title, '', t.hello(d.firstName), ''].concat(t.body, ['', t.sign, '', 'https://scalia.do']).join('\n');
  return { to: d.email, replyTo: BOOKING.notifyEmail, subject: t.subject, html, text };
}

module.exports = { QUESTIONS, LETTERS, CV_MAX, BODY_MAX, validate, answersFor, ownerMail, candidateMail };
