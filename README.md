# Scalia — site vitrine

Site statique (HTML / CSS / JS, sans build) servi par Vercel sur `https://scalia.do`.
Moteur d'animation : ScrollCraft (`scrollcraft.js` / `scrollcraft.css`).

Prévisualisation locale : `node ../.claude/skills/scroll-craft/scripts/serve.mjs --root . --port 4510`
puis http://localhost:4510 (ajouter `?drafts=0` pour voir les témoignages comme en production).

## Structure

| Fichier | Rôle |
|---|---|
| `index.html`, `scalians/`, `mentions-legales/`, `confidentialite/`, `404.html` | Pages |
| `styles.css`, `scalians.css` | Styles (police Inter auto-hébergée dans `assets/fonts/`) |
| `main.js` | Accueil : hero, navigation, Calendly (`CALENDLY_URLS`), prix (`PRICING`) |
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
| `calendly_open` | `place`, `lang` |
| `whatsapp_click` | `place` (dont `fab`) |
| `email_click` | `place` |
| `testimonial_play` | `video` (id Wistia, jamais le nom) |
| `language_change` | `to` |
| `currency_change` | `to` |

## Témoignages

- Les 9 cartes s'affichent partout (deux rails). Une carte `photoDraft` / `quoteDraft` montre en
  production uniquement le vrai nom et la vraie entreprise sur le fond Scalia (initiales).
- Les portraits et citations provisoires ne sont pas versionnés : `voices.drafts.json` et
  `assets/voices/drafts/` (ignorés par git) sont fusionnés par `voices.js` en local uniquement.
- Moins de 6 cartes au total : une rangée centrée (balayable sur mobile) remplace les deux rails.
- Sous-titres : `assets/voices/captions/<id>.<fr|en|es>.vtt` (UTF-8, mêmes timecodes), déclarés dans
  `captions` de chaque vidéo. Le lecteur suit la langue du site en direct (une seule piste à la fois).
  FR = transcription Wistia (noms propres relus) ; EN / ES = traductions du FR.

## Reste à fournir

| Élément | Où |
|---|---|
| URLs des événements Calendly EN et ES | `main.js` → `CALENDLY_URLS.en` / `.es` |
| Vraies photos clients 9:16 + citations validées (6 cartes) | `assets/voices/<id>-480/-960.{avif,webp}` + `photo` / `quote` dans `voices.js`, puis `photoDraft` / `quoteDraft: false` (+ EN/ES dans `i18n/`) |
| Téléphone de l'hébergeur (non publié par Vercel) | mentions légales, si exigé |
| Vidéos hero définitives 9:16 et 16:9 | `main.js` → `HERO_MEDIA` |
