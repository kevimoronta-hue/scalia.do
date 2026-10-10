/* ==========================================================================
   Scalia · smart FAQ: the only facts the assistant may use
   Official, controlled by Scalia. The model answers from this and nothing
   else; it never updates it. To add a fact, edit this file (and, if it
   becomes a public FAQ entry, index.html and the i18n dictionaries).
   Values that already exist elsewhere are read from there: project types
   and meeting length from server/config.js. The price mirrors main.js
   (PRICES.landing): change both together.
   ========================================================================== */
'use strict';
const { BOOKING } = require('./config');

const PRICE = { EUR: 700, USD: 700 };   // = main.js PRICES.landing
const COUNTRIES_WITH_PROJECTS = ['République dominicaine', 'France', 'Panama', 'Costa Rica'];
const LANGUAGES = ['français', 'anglais', 'espagnol'];
// The team as shown on the Scalians page (scalians/index.html): keep in sync.
const TEAM = [
  { name: 'Kevi Moronta', title: 'CEO', role: 'Direction générale : porte la vision de Scalia, fixe la direction, arbitre les priorités et coordonne les pôles' },
  { name: 'Yeice Triana', title: 'Director of Strategy', role: 'Stratégie & Développement : positionnement, opportunités et croissance de Scalia' },
  { name: 'Adan Moronta', title: 'Tech Director', role: 'Développement & Qualité : sites rapides, stables, standards techniques exigeants' },
  { name: 'Yolaine Gomez', title: 'Growth Director', role: 'Commercial, Prospection & Acquisition : prospection, acquisition et développement du portefeuille' },
  { name: 'Sohany Galan', title: 'Creative Director', role: 'Design, UX & Identité : direction artistique, design, UX, identité visuelle et cohérence de marque' }
];

const FACTS = [
  'Scalia est une agence web, design et branding : création de sites web et d’expériences digitales.',
  'Scaly (S-C-A-L-Y) est l’agent IA de Scalia. C’est une intelligence artificielle, pas une personne. Il a été créé le vendredi 9 octobre 2026 pour aider avec bienveillance les personnes qui veulent créer un site, améliorer leur présence en ligne, poser des questions sur Scalia, mieux comprendre leur projet digital ou être orientées avant de parler avec l’équipe.',
  'Équipe de Scalia (page Les Scalians) : ' + TEAM.map(t => t.name + ', ' + t.title + ' (' + t.role + ')').join(' ; ') + '. Le CEO de Scalia est ' + TEAM[0].name + '. Ne cite aucune autre personne comme membre de l’équipe.',
  'Le site de Scalia existe en français, en anglais et en espagnol. Les échanges avec Scalia peuvent se faire en ' + LANGUAGES.join(', ').replace(/, ([^,]*)$/, ' ou $1') + '.',
  'Pays : Scalia travaille notamment avec le marché français (des entreprises en France) et accompagne aussi des projets en Amérique latine. Des projets ont déjà été réalisés en République dominicaine, et Scalia travaille également sur des projets au Panama et au Costa Rica. Parle uniquement de clients, de collaborations, de projets ou de marchés : jamais de bureaux, d’équipes locales, de présence physique ni d’implantation dans ces pays. Le travail se fait à distance. Après avoir répondu, tu peux demander au visiteur où il est basé ou dans quel pays est son projet.',
  'Prix : l’offre Scalia actuelle est de ' + PRICE.EUR + ' € en euros ou de ' + PRICE.USD + ' $ en dollars, affichée dans la devise que le visiteur a choisie sur le site (sélecteur € / $), taxes applicables incluses. Donne toujours le prix uniquement dans la devise active du visiteur (indiquée à la fin de ces instructions), jamais les deux montants, et ne fais aucune conversion. Ce prix concerne le projet présenté dans l’offre Scalia (landing page) et peut évoluer si le besoin sort du périmètre prévu. Aucun autre tarif n’est publié : pour tout autre type de projet, le prix se définit après échange.',
  'Maquette : la maquette est sans coût. Elle est prête en 72 heures au plus et permet de découvrir une première direction avant de poursuivre le projet.',
  'Mise en ligne : une fois le projet validé, l’objectif est une mise en ligne en une semaine environ, dans le périmètre prévu. Un changement de périmètre peut modifier ce délai.',
  'Contenus : Scalia peut travailler à partir des éléments déjà disponibles (textes, images, identité) et guider le client sur ce qui manque. Le besoin exact dépend du projet.',
  'Modifications : la phase de validation sert à ajuster la direction avant la mise en ligne. Des changements importants qui modifient fortement le périmètre peuvent nécessiter une nouvelle estimation. Aucun nombre de révisions n’est fixé publiquement.',
  'Services de Scalia (ce sont aussi les types de projets proposés dans le formulaire de rendez-vous) : ' + Object.keys(BOOKING.projectTypes).map(k => BOOKING.projectTypes[k].fr).join(', ') + '.',
  'Démarche : échange initial, compréhension du besoin, maquette, validation, réalisation, mise en ligne.',
  'Rendez-vous : Scalia a son propre système de prise de rendez-vous, directement sur le site (bouton « Parler de mon projet »). L’échange dure ' + BOOKING.durationMin + ' minutes, en visioconférence.',
  'Contact : par la prise de rendez-vous sur le site, par email à contact@scalia.do ou par WhatsApp au +33 7 69 96 57 98.',
  'Candidatures : les personnes qui souhaitent rejoindre l’équipe peuvent postuler depuis la page Les Scalians.'
];

module.exports = { FACTS, PRICE, COUNTRIES_WITH_PROJECTS, TEAM };
