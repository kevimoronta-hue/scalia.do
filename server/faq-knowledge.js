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

const FACTS = [
  'Scalia est une agence de création de sites web et d’expérience digitale.',
  'Le site de Scalia existe en français, en anglais et en espagnol. Les échanges avec Scalia peuvent se faire en ' + LANGUAGES.join(', ').replace(/, ([^,]*)$/, ' ou $1') + '.',
  'Scalia a déjà réalisé des projets en ' + COUNTRIES_WITH_PROJECTS.slice(0, -1).join(', ') + ' et ' + COUNTRIES_WITH_PROJECTS.slice(-1) + '. Il s’agit d’expérience de projets, pas de bureaux : ne jamais parler de bureaux ou d’implantations dans ces pays. Le travail peut se faire à distance.',
  'Prix : Scalia propose actuellement une offre à ' + PRICE.EUR + ' € ou ' + PRICE.USD + ' $ selon la devise sélectionnée sur le site, taxes applicables incluses. Ce prix concerne le projet présenté dans l’offre Scalia (landing page) et peut évoluer si le besoin sort du périmètre prévu. Aucun autre tarif n’est publié : pour tout autre type de projet, le prix se définit après échange.',
  'Maquette : la maquette est sans coût. Elle est prête en 72 heures au plus et permet de découvrir une première direction avant de poursuivre le projet.',
  'Mise en ligne : une fois le projet validé, l’objectif est une mise en ligne en une semaine environ, dans le périmètre prévu. Un changement de périmètre peut modifier ce délai.',
  'Contenus : Scalia peut travailler à partir des éléments déjà disponibles (textes, images, identité) et guider le client sur ce qui manque. Le besoin exact dépend du projet.',
  'Modifications : la phase de validation sert à ajuster la direction avant la mise en ligne. Des changements importants qui modifient fortement le périmètre peuvent nécessiter une nouvelle estimation. Aucun nombre de révisions n’est fixé publiquement.',
  'Types de projets proposés dans le formulaire de rendez-vous : ' + Object.keys(BOOKING.projectTypes).map(k => BOOKING.projectTypes[k].fr).join(', ') + '.',
  'Démarche : échange initial, compréhension du besoin, maquette, validation, réalisation, mise en ligne.',
  'Rendez-vous : Scalia a son propre système de prise de rendez-vous, directement sur le site (bouton « Parler de mon projet »). L’échange dure ' + BOOKING.durationMin + ' minutes, en visioconférence.',
  'Contact : par la prise de rendez-vous sur le site, par email à contact@scalia.do ou par WhatsApp au +33 7 69 96 57 98.',
  'Candidatures : les personnes qui souhaitent rejoindre l’équipe peuvent postuler depuis la page Les Scalians.'
];

module.exports = { FACTS, PRICE, COUNTRIES_WITH_PROJECTS };
