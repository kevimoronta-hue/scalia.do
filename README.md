# Scalia — site vitrine

Site statique (HTML / CSS / JS, sans build) servi par Vercel sur `https://scalia.do`.
Moteur d'animation : ScrollCraft (`scrollcraft.js` / `scrollcraft.css`).

Prévisualisation locale : `node ../.claude/skills/scroll-craft/scripts/serve.mjs --root . --port 4510`
puis http://localhost:4510.

## Structure

| Fichier | Rôle |
|---|---|
| `index.html`, `scalians/`, `mentions-legales/`, `confidentialite/`, `404.html` | Pages |
| `styles.css`, `scalians.css` | Styles (police Inter auto-hébergée dans `assets/fonts/`) |
| `main.js` | Accueil : hero, navigation, prix (`PRICING`) |
| `booking.js`, `booking.css` | Réservation Scalia (panneau, créneaux, formulaire) |
| `api/` | Fonctions Vercel : `availability`, `book`, `reminders` |
| `server/` | Modules serveur (règles dans `server/config.js`, Google, emails, tickets) |
| `scripts/` | Outils locaux (serveur de dev, smoke test Google), non déployés |
| `voices.js` | Témoignages : données `VOICES`, rails, lecteur vidéo Scalia (sources MP4 Wistia), sous-titres |
| `fab.js` | Bouton WhatsApp flottant (accueil + Les Scalians) |
| `contact.js` | Coordonnées (email, WhatsApp, LinkedIn, Instagram) |
| `analytics.js` | Vercel Web Analytics sans cookie + événements |
| `i18n/` | FR source dans le HTML, dictionnaires `en.js` / `es.js` (clé = texte français) |
| `vercel.json` | En-têtes de sécurité, CSP, `www` → apex, slash final |
| `robots.txt`, `sitemap.xml` | Indexation |

## Mesure d'audience (Vercel Web Analytics, sans cookie)

Chargée uniquement sur un domaine déployé (jamais en local). Pages vues automatiques. Événements
personnalisés (forfait Vercel Pro ou Enterprise requis) :

| Événement | Données |
|---|---|
| `cta_click` | `place` (nav, menu, hero, footer, id de section) |
| `booking_open` | `place`, `lang` |
| `booking_confirmed` | `lang` |
| `whatsapp_click` | `place` (dont `fab`) |
| `email_click` | `place` |
| `testimonial_play` | `video` (id Wistia, jamais le nom) |
| `language_change` | `to` |
| `currency_change` | `to` |

## Réservation Scalia

- Disponibilités : Google Calendar de contact@scalia.do (compte de service + délégation Workspace).
- Règles (durée, horaires, tampons, préavis, horizon, plafond) : `server/config.js`.
- Variables Vercel : voir `.env.example` (jamais de secret dans le dépôt).
- Rappel ~1 h avant : `GET /api/reminders/` avec `Authorization: Bearer <CRON_SECRET>`, à déclencher
  toutes les 10 minutes par Google Cloud Scheduler (pas encore activé).
- Local : `node scripts/dev-server.mjs` (lit `.env.local`), `BOOKING_MOCK=1` pour un agenda de test.

## Témoignages

- 9 cartes sur deux rails : 3 vidéos et 6 cartes portrait + citation (contenu validé par les clients).
  Portraits : `assets/voices/<id>-480/-960.{avif,webp}` ; citations dans `voices.js`, traductions dans `i18n/`.
- Moins de 6 cartes au total : une rangée centrée (balayable sur mobile) remplace les deux rails.
- Sous-titres : `assets/voices/captions/<id>.<fr|en|es>.vtt` (UTF-8, mêmes timecodes), déclarés dans
  `captions` de chaque vidéo. Le lecteur suit la langue du site en direct (une seule piste à la fois).
  FR = transcription Wistia (noms propres relus) ; EN / ES = traductions du FR.

## Reste à fournir

| Élément | Où |
|---|---|
| Téléphone de l'hébergeur (non publié par Vercel) | mentions légales, si exigé |
| Vidéos hero définitives 9:16 et 16:9 | `main.js` → `HERO_MEDIA` |
