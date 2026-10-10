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

// [test on the last visitor message (normalized), [fr, en, es], showProjectCTA, expression?]
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
  [/riche|millionnaire|\brich\b|millonario/, [
    'Si j’avais ce bouton-là, je le vendrais très cher 😄 Par contre, on peut clairement travailler pour que ton site présente mieux ton activité et convertisse davantage. Tu fais quoi exactement ?',
    'If I had that button, I’d sell it for a lot 😄 What we can do is make your site present your business better and convert more. What do you do exactly?',
    'Si tuviera ese botón, lo vendería carísimo 😄 Lo que sí podemos hacer es que tu web presente mejor tu actividad y convierta más. ¿A qué te dedicas exactamente?'], false],
  [/chatgpt|meilleur que|better than|mejor que/, [
    'Disons que je suis spécialisé 😄 Lui sait tout sur tout, moi je connais surtout Scalia et les sites qui ramènent des clients. Toi, tu bosses sur quoi ?',
    'Let’s say I’m specialized 😄 It knows a bit of everything, I mostly know Scalia and websites that bring in customers. What are you working on?',
    'Digamos que soy especialista 😄 Él sabe de todo, yo sobre todo de Scalia y de webs que traen clientes. ¿Y tú en qué estás trabajando?'], false],
  [/copine|girlfriend|novia|crush|amoureux|in love|enamorado/, [
    'Euh… 😅 Pourquoi tu me demandes ça toi ? Déjà que je vis dans une fenêtre de chat…',
    'Uh… 😅 Why are you asking me that? I already live in a chat window…',
    'Eh… 😅 ¿Y por qué me preguntas eso? Si ya vivo en una ventana de chat…'], false, 'embarrassed'],
  [/blague|joke|chiste/, [
    'Pourquoi le site web est allé chez le psy ? Il avait trop de problèmes de cache 😄 Bon, maintenant que j’ai fait mon boulot : t’as pas un site ou un projet à me montrer ?',
    'Why did the website go to therapy? Too many cache issues 😄 Now that I’ve done my job: got a site or a project to show me?',
    '¿Por qué la web fue al psicólogo? Tenía demasiados problemas de caché 😄 Bueno, ya hice mi trabajo: ¿tienes una web o un proyecto que enseñarme?'], false],
  [/tu t ?appelles|ton nom|tu es qui|t es qui|who are you|your name|como te llamas|quien eres/, [
    'Moi c’est Scaly 😄 L’agent IA de Scalia. Je suis là pour t’aider à y voir plus clair sur ton site ou ton projet. Et toi, tu bosses sur quoi ?',
    'I’m Scaly 😄 Scalia’s AI agent. I’m here to help you see clearer about your website or your project. What are you working on?',
    'Soy Scaly 😄 El agente IA de Scalia. Estoy aquí para ayudarte a ver más claro tu web o tu proyecto. ¿Y tú en qué estás trabajando?'], false],
  [/cree quand|ete cree|created|creado|pourquoi tu existes|why do you exist|por que existes|tu es ne/, [
    'Le 9 octobre 2026 😄 Je suis encore jeune. J’ai surtout été créé pour aider les gens à y voir plus clair sur leurs sites et leurs projets avant de passer avec l’équipe Scalia. D’ailleurs, toi, tu bosses sur quoi ?',
    'On October 9, 2026 😄 I’m still young. I was mostly created to help people see clearer about their websites and projects before talking with the Scalia team. By the way, what are you working on?',
    'El 9 de octubre de 2026 😄 Todavía soy joven. Me crearon sobre todo para ayudar a la gente a ver más claro su web y sus proyectos antes de hablar con el equipo de Scalia. Por cierto, ¿tú en qué estás trabajando?'], false],
  [/\bceo\b|patron|qui dirige|who runs|director general|jefe/, [
    'Kevi Moronta. Il dirige Scalia et coordonne l’équipe autour des projets. Tu voulais en savoir plus sur l’agence ou tu regardes surtout pour ton propre projet ?',
    'Kevi Moronta. He runs Scalia and coordinates the team around the projects. Did you want to know more about the agency, or are you mostly looking for your own project?',
    'Kevi Moronta. Dirige Scalia y coordina al equipo en torno a los proyectos. ¿Querías saber más sobre la agencia o estás mirando sobre todo para tu propio proyecto?'], false],
  [/(?:qui|who|quien).*(?:design|ux|identite|graphi|creati)/, [
    'Sohany Galan, notre Creative Director : design, UX et identité. Tu cherches justement à revoir l’identité de ton entreprise ou ton site ?',
    'Sohany Galan, our Creative Director: design, UX and identity. Are you looking to rework your brand identity or your site?',
    'Sohany Galan, nuestra Creative Director: diseño, UX e identidad. ¿Buscas justamente renovar la identidad de tu empresa o tu web?'], false],
  [/qui travaille|l equipe|equipe|\bteam\b|equipo|scalians/, [
    'L’équipe : Kevi Moronta (CEO), Yeice Triana (stratégie), Adan Moronta (tech), Yolaine Gomez (growth) et Sohany Galan (design et identité). Tu cherches quelqu’un en particulier pour ton projet ?',
    'The team: Kevi Moronta (CEO), Yeice Triana (strategy), Adan Moronta (tech), Yolaine Gomez (growth) and Sohany Galan (design and identity). Looking for someone in particular for your project?',
    'El equipo: Kevi Moronta (CEO), Yeice Triana (estrategia), Adan Moronta (tech), Yolaine Gomez (growth) y Sohany Galan (diseño e identidad). ¿Buscas a alguien en particular para tu proyecto?'], false],
  [/^(?:oui |si |yes |ouais )?(?:tranquille|bien|tres bien|nickel|ca va|fine|good|great|todo bien|muy bien)\b/, [
    'Top 😄 D’ailleurs, tu passais juste voir ou tu as un petit projet en tête ?',
    'Nice 😄 By the way, just looking around or got a little project in mind?',
    'Genial 😄 Por cierto, ¿solo estabas mirando o tienes algún proyecto en mente?'], false],
  [/(?:j ai|j ai deja|i (?:already )?have|ya tengo|tengo) (?:deja )?(?:un |a |una )?(?:site|website|web|sitio)/, [
    'Ah cool. Il te convient, ou il y a quelque chose qui te gêne dessus ?',
    'Nice. Are you happy with it, or is something bothering you about it?',
    'Genial. ¿Te convence o hay algo que no te gusta?'], false],
  [/prend combien|combien de temps|delai|how long|takes|tarda|cuanto tiempo|plazo/, [
    'La maquette arrive en 72 heures max. Une fois validée, on vise une mise en ligne en une semaine environ, dans le cadre prévu.',
    'The mockup is ready within 72 hours. Once it’s approved, we aim to go live in about a week, within the agreed scope.',
    'La maqueta está lista en 72 horas como máximo. Una vez validada, apuntamos a publicar en una semana más o menos, dentro de lo previsto.'], false],
  [/combien|prix|\bcout|tarif|how much|price|\bcosts?\b|precio|cuesta|cuanto/, [
    'Le tarif Scalia, c’est {PRICE} pour le périmètre présenté sur le site. Si ton projet sort de ce cadre, on en parle avant de lancer quoi que ce soit.',
    'Scalia’s rate is {PRICE} for the scope presented on the site. If your project goes beyond it, we talk about it before starting anything.',
    'La tarifa de Scalia es de {PRICE} para el alcance presentado en el sitio. Si tu proyecto va más allá, lo hablamos antes de empezar.'], true],
  [/\bseo\b/, [
    'Le SEO sert à améliorer la visibilité d’un site dans les moteurs de recherche. Ça passe notamment par le contenu, la structure du site, la performance et la pertinence des pages.',
    'SEO is about making a site more visible in search engines. It mostly comes down to content, site structure, performance and how relevant the pages are.',
    'El SEO sirve para mejorar la visibilidad de una web en los buscadores. Depende sobre todo del contenido, la estructura, el rendimiento y la relevancia de las páginas.'], false],
  [/responsive/, [
    'Responsive, ça veut dire que le site s’adapte bien aux téléphones, tablettes et ordinateurs. La navigation et le contenu restent confortables quelle que soit la taille de l’écran.',
    'Responsive means the site adapts properly to phones, tablets and computers, so browsing and reading stay comfortable on any screen.',
    'Responsive significa que la web se adapta bien a móviles, tabletas y ordenadores, y que se navega cómodo en cualquier pantalla.'], false],
  [/panama|costa rica|france|francia|dominic|\bpays\b|\bpais|ou (?:avez|travaill)|bosse|where|donde|countries|internation/, [
    'Scalia travaille notamment avec des entreprises en France et accompagne aussi des projets en Amérique latine : en République dominicaine, au Panama et au Costa Rica. Tout se fait à distance. Et toi, ton projet est dans quel pays ?',
    'Scalia works notably with companies in France and also supports projects in Latin America: the Dominican Republic, Panama and Costa Rica. Everything is done remotely. Where is your project based?',
    'Scalia trabaja especialmente con empresas en Francia y también acompaña proyectos en América Latina: República Dominicana, Panamá y Costa Rica. Todo se hace a distancia. ¿Y tu proyecto en qué país está?'], false],
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

// price: the active "700 €" / "700 $" (server/faq.js priceText).
function reply(messages, loc, price) {
  const users = messages.filter(m => m.role === 'user').map(m => norm(m.content));
  const last = users[users.length - 1] || '';
  const i = IDX[loc] || 0;
  for (const [re, texts, cta, face] of RULES) if (re.test(last)) return { answer: texts[i].replace('{PRICE}', price || '700 €'), showProjectCTA: cta, expression: face || 'neutral' };
  return { answer: FALLBACK[i], showProjectCTA: false, expression: 'neutral' };
}

module.exports = { reply };
