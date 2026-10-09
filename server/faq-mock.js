/* ==========================================================================
   Scalia · AI agent, LOCAL MOCK (FAQ_AI_MODE=mock)
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

// [test on the last message (normalized), [fr, en, es], showProjectCTA]
// A function test receives (last, previous user messages joined).
const RULES = [
  [/^(?:(?:bonjour|salut|coucou|bonsoir|hello|hi|hey|hola|buenas)\b.*)?(?:ca va|ca roule|que tal|como estas|how are you|how s it going)/, [
    'Très bien, merci 👋 Et toi ? Si tu veux, je peux t’aider sur Scalia, ton site ou simplement répondre à une question sur ton projet.',
    'Doing great, thanks 👋 How about you? I can help with Scalia, your website or any question about your project.',
    'Muy bien, gracias 👋 ¿Y tú? Si quieres, puedo ayudarte con Scalia, tu web o cualquier pregunta sobre tu proyecto.'], false],
  [/^(?:bonjour|salut|coucou|bonsoir|hello|hi|hey|hola|buenas|buenos dias)\b[\s!.?]*$/, [
    'Bonjour 👋 Qu’est-ce que je peux faire pour toi aujourd’hui ?',
    'Hi 👋 What can I do for you today?',
    'Hola 👋 ¿En qué puedo ayudarte hoy?'], false],
  [/\b(?:merci|thanks|thank you|gracias)\b/, [
    'Avec plaisir 🙂 Si une autre question te vient, je suis là.',
    'You’re welcome 🙂 If anything else comes up, I’m here.',
    'Con gusto 🙂 Si te surge otra pregunta, aquí estoy.'], false],
  [/prend combien|combien de temps|delai|how long|takes|tarda|cuanto tiempo|plazo/, [
    'Pour le site, la maquette arrive en 72 heures au plus. Une fois le projet validé, l’objectif est une mise en ligne en une semaine environ, dans le cadre prévu.',
    'For the website, the mockup is ready within 72 hours. Once the project is approved, the goal is to go live in about a week, within the agreed scope.',
    'Para la web, la maqueta está lista en 72 horas como máximo. Una vez validado el proyecto, el objetivo es publicarla en una semana aproximadamente, dentro del alcance previsto.'], false],
  [/combien|prix|cout|tarif|how much|price|cost|precio|cuesta|cuanto/, [
    'Le tarif Scalia est de 700 € ou 700 $, selon la devise sélectionnée. Si ton projet sort du cadre prévu, on en parle avant de lancer quoi que ce soit.',
    'Scalia’s rate is 700 € or 700 $, depending on the selected currency. If your project goes beyond the planned scope, we talk about it before starting anything.',
    'La tarifa de Scalia es de 700 € o 700 $, según la moneda seleccionada. Si tu proyecto va más allá de lo previsto, lo hablamos antes de empezar.'], true],
  [/\bseo\b/, [
    'Le SEO, c’est tout ce qui aide ton site à apparaître dans les résultats de Google : un contenu clair, une structure propre, un site rapide et des pages pensées pour ce que tes clients recherchent.',
    'SEO is everything that helps your site show up in Google results: clear content, a clean structure, a fast site and pages built around what your customers search for.',
    'El SEO es todo lo que ayuda a que tu web aparezca en los resultados de Google: un contenido claro, una estructura limpia, una web rápida y páginas pensadas para lo que buscan tus clientes.'], false],
  [/responsive/, [
    'Responsive signifie qu’un site s’adapte correctement aux téléphones, tablettes et ordinateurs. L’objectif est que la navigation et le contenu restent confortables quelle que soit la taille de l’écran.',
    'Responsive means a site adapts properly to phones, tablets and computers, so browsing and reading stay comfortable on any screen size.',
    'Responsive significa que una web se adapta bien a móviles, tabletas y ordenadores, para que la navegación y el contenido sigan siendo cómodos en cualquier pantalla.'], false],
  [/panama|costa rica|france|francia|dominic|\bpays\b|\bpais|ou (?:avez|travaill)|bosse|where|donde/, [
    'Oui, Scalia a déjà réalisé des projets au Panama, comme en République dominicaine, en France et au Costa Rica. Tout peut se faire à distance, en français, en anglais ou en espagnol.',
    'Yes, Scalia has already delivered projects in Panama, as well as in the Dominican Republic, France and Costa Rica. Everything can be done remotely, in French, English or Spanish.',
    'Sí, Scalia ya ha realizado proyectos en Panamá, así como en República Dominicana, Francia y Costa Rica. Todo puede hacerse a distancia, en español, inglés o francés.'], false],
  [/refaire|refonte|nouveau site|creer|redo|rebuild|new (?:web)?site|rehacer|nueva web|crear/, [
    'Bonne idée. Le plus simple est d’en parler concrètement avec Scalia : on part de ton activité, et une première maquette est prête en 72 heures au plus, sans coût.',
    'Good call. The simplest is to talk it through with Scalia: we start from your business, and a first mockup is ready within 72 hours, at no cost.',
    'Buena idea. Lo más sencillo es hablarlo en concreto con Scalia: partimos de tu actividad y una primera maqueta está lista en 72 horas como máximo, sin coste.'], true],
  [/faites|vous faites|do you (?:make|build|do)|hacen|services|que fait scalia/, [
    'Oui 🙂 Scalia crée des sites web et des expériences digitales, en français, en anglais ou en espagnol. Tu as un projet en tête ?',
    'Yes 🙂 Scalia builds websites and digital experiences, in English, French or Spanish. Do you have a project in mind?',
    'Sí 🙂 Scalia crea sitios web y experiencias digitales, en español, inglés o francés. ¿Tienes un proyecto en mente?'], false],
  [/(?:client|demande|contact|customer|lead|cliente).*(?:aucun|pas|peu|presque|quasi|no |few|nadie|ningun|casi)|(?:aucun|pas de|peu de|presque|quasi|no |few|casi|ningun).*(?:client|demande|contact|customer|lead|cliente)/, [
    'D’accord, donc l’enjeu n’est pas seulement l’image : c’est aussi la conversion, rendre ton offre claire et donner envie de te contacter. Tu envisages plutôt de le refaire ou de l’améliorer ?',
    'Got it, so it’s not just about looks: it’s also about conversion, making your offer clear and making people want to contact you. Are you thinking of rebuilding it or improving it?',
    'Entiendo, entonces no es solo la imagen: también es la conversión, que tu oferta sea clara y den ganas de contactarte. ¿Piensas rehacerla o mejorarla?'], false],
  [/vieux|nul|date|obsolete|ancien|marche plus|old|outdated|broken|bad|viej|feo|antigu|no funciona/, [
    'Je vois. Un site daté peut faire perdre de la crédibilité avant même le premier contact. Aujourd’hui, il t’apporte des demandes clients ou presque rien ?',
    'I see. An outdated site can cost you credibility before the first contact even happens. Does it bring you customer requests today, or hardly any?',
    'Ya veo. Una web anticuada puede restar credibilidad antes incluso del primer contacto. ¿Hoy te trae solicitudes de clientes o casi nada?'], false],
  [/\bclim|climatisation|aire acondicionado|air condition|hvac/, [
    'Top. Dans la climatisation, un site clair peut vraiment rassurer et générer des demandes de devis. Tu as déjà un site aujourd’hui ?',
    'Great. In air conditioning, a clear website can really build trust and bring in quote requests. Do you already have a site?',
    'Genial. En climatización, una web clara puede dar mucha confianza y generar solicitudes de presupuesto. ¿Ya tienes una web?'], false],
  [/entreprise|boite|societe|business|company|empresa|negocio|restaurant|commerce/, [
    'Super. C’est dans quel secteur ? Et tu as déjà un site aujourd’hui ?',
    'Nice. What field are you in? And do you already have a website?',
    'Genial. ¿En qué sector? ¿Y ya tienes una web?'], false],
  [/rendez|rdv|appel|meeting|call|book|cita|reunion|agendar|contact/, [
    'Tu peux réserver un échange de ' + MIN + ' minutes avec Scalia directement ici, en visioconférence. Tu choisis simplement le créneau qui te convient.',
    'You can book a ' + MIN + '-minute video call with Scalia right here. Just pick the time that suits you.',
    'Puedes reservar una llamada de ' + MIN + ' minutos con Scalia aquí mismo, por videollamada. Solo elige el horario que te venga bien.'], true]
];
const FALLBACK = [
  'Je ne suis pas sûr d’avoir bien compris 🙂 Tu peux me le dire autrement ? Je peux t’aider sur Scalia, ton site ou ton projet.',
  'I’m not sure I got that 🙂 Could you put it another way? I can help with Scalia, your website or your project.',
  'No estoy seguro de haberte entendido 🙂 ¿Me lo dices de otra forma? Puedo ayudarte con Scalia, tu web o tu proyecto.'
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
