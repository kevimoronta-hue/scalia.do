/* ==========================================================================
   Scalia · Scaly, LOCAL MOCK (FAQ_AI_MODE=mock)
   Used only on a local server without OPENAI_API_KEY (never on Vercel, see
   server/faq.js mode()). A few keyword rules that return the same JSON as
   the model, so the design, the multi-message flow, the CTA guard and the
   server checks can be tested. It is not the agent: the real answers come
   from OpenAI in production.
   ========================================================================== */
'use strict';
const { BOOKING } = require('./config');
const MIN = BOOKING.durationMin;

const norm = s => s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[’']/g, ' ');

// [test on the last visitor message (normalized), [fr, en, es], showProjectCTA]
const RULES = [
  [/(?:ca va|ca roule|que tal|como estas|how are you|how s it going)/, [
    'Oui nickel 😄 Et toi ? Tu veux savoir quoi ?',
    'All good 😄 You? What do you want to know?',
    'Todo bien 😄 ¿Y tú? ¿Qué quieres saber?'], false],
  [/^(?:bonjour|salut|coucou|bonsoir|hello|hi|hey|hola|buenas|buenos dias)\b[\s!.?]*$/, [
    'Salut 👋 Dis-moi, tu veux savoir quoi ?',
    'Hey 👋 Tell me, what do you want to know?',
    'Hola 👋 Dime, ¿qué quieres saber?'], false],
  [/\b(?:merci|thanks|thank you|gracias)\b/, [
    'Avec plaisir 🙂 Si t’as une autre question, vas-y.',
    'Anytime 🙂 If you have another question, go ahead.',
    'Con gusto 🙂 Si tienes otra pregunta, dime.'], false],
  [/prend combien|combien de temps|delai|how long|takes|tarda|cuanto tiempo|plazo/, [
    'La maquette arrive en 72 heures max. Une fois validée, on vise une mise en ligne en une semaine environ, dans le cadre prévu.',
    'The mockup is ready within 72 hours. Once it’s approved, we aim to go live in about a week, within the agreed scope.',
    'La maqueta está lista en 72 horas como máximo. Una vez validada, apuntamos a publicar en una semana más o menos, dentro de lo previsto.'], false],
  [/combien|prix|cout|tarif|how much|price|cost|precio|cuesta|cuanto/, [
    'Le tarif Scalia, c’est 700 € ou 700 $, selon la devise choisie. Si ton projet sort du cadre prévu, on en parle avant de lancer quoi que ce soit.',
    'Scalia’s rate is 700 € or 700 $, depending on the currency. If your project goes beyond the planned scope, we talk about it before starting anything.',
    'La tarifa de Scalia es de 700 € o 700 $, según la moneda. Si tu proyecto va más allá de lo previsto, lo hablamos antes de empezar.'], true],
  [/\bseo\b/, [
    'Le SEO sert à améliorer la visibilité d’un site dans les moteurs de recherche. Ça passe notamment par le contenu, la structure du site, la performance et la pertinence des pages.',
    'SEO is about making a site more visible in search engines. It mostly comes down to content, site structure, performance and how relevant the pages are.',
    'El SEO sirve para mejorar la visibilidad de una web en los buscadores. Depende sobre todo del contenido, la estructura, el rendimiento y la relevancia de las páginas.'], false],
  [/responsive/, [
    'Responsive, ça veut dire que le site s’adapte bien aux téléphones, tablettes et ordinateurs. La navigation et le contenu restent confortables quelle que soit la taille de l’écran.',
    'Responsive means the site adapts properly to phones, tablets and computers, so browsing and reading stay comfortable on any screen.',
    'Responsive significa que la web se adapta bien a móviles, tabletas y ordenadores, y que se navega cómodo en cualquier pantalla.'], false],
  [/panama|costa rica|france|francia|dominic|\bpays\b|\bpais|ou (?:avez|travaill)|bosse|where|donde|countries/, [
    'Scalia a déjà réalisé des projets en République dominicaine, en France, au Panama et au Costa Rica. Tout se fait à distance, en français, en anglais ou en espagnol.',
    'Scalia has already delivered projects in the Dominican Republic, France, Panama and Costa Rica. Everything is done remotely, in English, French or Spanish.',
    'Scalia ya ha hecho proyectos en República Dominicana, Francia, Panamá y Costa Rica. Todo se hace a distancia, en español, inglés o francés.'], false],
  [/comment ca (?:se passe|marche)|how does it work|como funciona|process|demarche/, [
    'Simple : on échange sur ton projet, Scalia te prépare une maquette sans coût en 72 heures max, tu valides, puis on passe à la réalisation et à la mise en ligne.',
    'Simple: we talk about your project, Scalia prepares a mockup at no cost within 72 hours, you approve it, then we build and launch.',
    'Sencillo: hablamos de tu proyecto, Scalia te prepara una maqueta sin coste en 72 horas como máximo, la validas y pasamos a la realización y la publicación.'], false],
  [/\bles deux\b|\bambos\b|\bboth\b|\blos dos\b/, [
    'Là, clairement, ça vaut le coup de regarder ça sérieusement. Si tu veux, on peut passer directement à ton projet.',
    'Then it’s clearly worth looking at seriously. If you want, we can jump straight to your project.',
    'Entonces vale la pena mirarlo en serio. Si quieres, pasamos directamente a tu proyecto.'], true],
  [/refaire|refonte|nouveau site|creer|redo|rebuild|redesign|new (?:web)?site|rehacer|nueva web|crear/, [
    'Carrément. Le plus simple, c’est d’en parler concrètement : on part de ton activité, et une première maquette est prête en 72 heures max, sans coût.',
    'Sure. The simplest is to talk it through: we start from your business, and a first mockup is ready within 72 hours, at no cost.',
    'Claro. Lo más sencillo es hablarlo en concreto: partimos de tu actividad y una primera maqueta está lista en 72 horas como máximo, sin coste.'], true],
  [/faites|vous faites|do you (?:make|build|do)|hacen|services/, [
    'Oui 🙂 Scalia fait des landing pages, des sites multi-pages, de l’identité visuelle et des logos. Tu as un projet en tête ?',
    'Yes 🙂 Scalia does landing pages, multi-page websites, visual identity and logos. Got a project in mind?',
    'Sí 🙂 Scalia hace landing pages, webs de varias páginas, identidad visual y logos. ¿Tienes un proyecto en mente?'], false],
  [/(?:client|demande|contact|customer|lead|cliente).*(?:aucun|pas|peu|presque|quasi|no |few|nadie|ningun|casi)|(?:aucun|pas de|peu de|presque|quasi|no |few|casi|ningun).*(?:client|demande|contact|customer|lead|cliente)/, [
    'Je vois. Donc l’enjeu, c’est pas que l’image : c’est aussi qu’il te ramène des clients. Tu penses plutôt le refaire ou l’améliorer ?',
    'I see. So it’s not just about looks, it’s about bringing you customers too. Are you thinking of rebuilding it or improving it?',
    'Entiendo. Entonces no es solo la imagen, también que te traiga clientes. ¿Piensas rehacerla o mejorarla?'], false],
  [/vieux|vieille|nul|date|obsolete|ancien|marche plus|old|outdated|broken|bad|viej|feo|antigu|no funciona/, [
    'Je vois. C’est surtout le design qui te gêne ou le fait qu’il ne t’apporte pas assez de clients ?',
    'I see. Is it mostly the design that bothers you, or that it doesn’t bring you enough customers?',
    'Entiendo. ¿Te molesta sobre todo el diseño o que no te traiga suficientes clientes?'], false],
  [/\bclim|climatisation|aire acondicionado|air condition|hvac/, [
    'Ah ouais, je vois. Tu as déjà un site ou tu pars de zéro ?',
    'Oh nice, I see. Do you already have a site or are you starting from scratch?',
    'Ah, vale. ¿Ya tienes una web o empiezas de cero?'], false],
  [/entreprise|boite|societe|business|company|empresa|negocio|restaurant|commerce/, [
    'Ah cool. C’est dans quel domaine ? Et tu as déjà un site ?',
    'Nice. What field are you in? And do you already have a site?',
    'Genial. ¿De qué sector? ¿Y ya tienes una web?'], false],
  [/rendez|rdv|appel|meeting|call|book|cita|reunion|agendar/, [
    'Tu peux réserver un échange de ' + MIN + ' minutes avec Scalia directement ici, en visio. Tu choisis juste le créneau qui t’arrange.',
    'You can book a ' + MIN + '-minute video call with Scalia right here. Just pick the time that suits you.',
    'Puedes reservar una llamada de ' + MIN + ' minutos con Scalia aquí mismo, por videollamada. Solo elige el horario que te venga bien.'], true]
];
const FALLBACK = [
  'Je suis pas sûr d’avoir parfaitement compris 😅 Tu peux me le reformuler vite fait ?',
  'I’m not totally sure I got you 😅 Can you say it another way?',
  'No estoy seguro de haberlo entendido del todo 😅 ¿Me lo puedes decir de otra forma?'
];
const IDX = { fr: 0, en: 1, es: 2 };

function reply(messages, loc) {
  const users = messages.filter(m => m.role === 'user').map(m => norm(m.content));
  const last = users[users.length - 1] || '';
  const i = IDX[loc] || 0;
  for (const [re, texts, cta] of RULES) if (re.test(last)) return { answer: texts[i], showProjectCTA: cta };
  return { answer: FALLBACK[i], showProjectCTA: false };
}

module.exports = { reply };
