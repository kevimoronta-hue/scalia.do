# Scalia — portail client et admin (V1)

`scalia.do/portal` : le client suit son projet. `scalia.do/admin` : Scalia le met à jour, sans toucher au code.
Une seule application : ce que chacun voit dépend des données, jamais d'une URL par client.
Tout reste dans GitHub + Vercel : Vercel Functions, Postgres (Neon, onglet Storage de Vercel), Vercel Blob privé.

## Architecture

| Couche | Fichiers |
|---|---|
| Pages (HTML statique, comme le site) | `portal/`, `portal/login/`, `portal/welcome/`, `admin/`, `admin/project/` |
| Navigateur | `portal-core.js`, `portal.js`, `portal-auth.js`, `admin.js`, `portal.css`, `i18n/portal.js` (ES / EN, clé = texte FR) |
| API (Vercel Functions) | `api/portal.js` (connexion, lien email, projet, fichiers), `api/portal-admin.js` (admin) |
| Métier | `server/portal/service.js` : **toutes** les lectures et modifications passent par ces fonctions |
| SQL | `server/portal/repositories/*.js` : seul endroit où il y a du SQL (paramètres `$1…`, jamais concaténés) |
| Base | `server/portal/db.js` : `query` / `one` / `transaction` sur `pg` (prod) ou PGlite (tests locaux) |
| Auth | `server/portal/auth.js` (Argon2id, sessions, jetons, limites), `server/portal/session.js` (cookie) |
| Fichiers | `server/portal/storage.js` : Vercel Blob privé (URL signées) ou dossier local en test |
| Schéma | `server/portal/migrations/NNN_*.sql` (source de vérité), `server/portal/schema.sql` (photo complète) |

Dépendances npm : `pg`, `@vercel/blob`, `@node-rs/argon2` (+ `@electric-sql/pglite` en dev, jamais chargé en production).

## Base de données

Postgres standard (SQL portable, aucune fonction propriétaire). Tables : `users`, `sessions`, `auth_tokens`, `rate_limits`, `organizations`, `organization_members`, `projects`, `project_stages`, `project_updates`, `payments`, `documents`, `project_actions` (+ `schema_migrations`).
**Montants en centimes entiers** (`bigint`) : 700 EUR = `70000`. L'API reçoit et renvoie des décimales (`"700.50"` → `70050`), sans calcul flottant.
`created_at`, `updated_at`, `updated_by` sur les données métier.
Évolution : ajouter `server/portal/migrations/002_….sql` (ne jamais modifier une migration appliquée), mettre à jour `schema.sql`, puis `npm run portal:migrate`.

## Auth et sessions

- Mots de passe : **Argon2id** (19 Mio, t=2, p=1), 10 caractères minimum, mots de passe évidents et égaux à l'email refusés. Jamais stockés ni envoyés en clair.
- Session : cookie `scalia_ps` = valeur aléatoire opaque (256 bits), `HttpOnly`, `Secure` en HTTPS, `SameSite=Lax`, `Path=/`, 30 jours. La base ne garde que son SHA-256. Déconnexion = session supprimée en base + cookie expiré.
- Invitation : l'admin crée le client → compte inactif sans mot de passe → jeton aléatoire (SHA-256 en base), usage unique, **24 h** → email `/portal/welcome/?token=…` → le client choisit son mot de passe → jeton consommé, compte actif. « Renvoyer l'invitation » crée un nouveau jeton et annule les anciens.
- Mot de passe oublié : même principe, jeton **1 h**, réponse identique que l'email existe ou non ; à la réussite, toutes les autres sessions du compte sont fermées.
- Limites (en base, partagées par toutes les instances) : connexion 8 essais / 15 min par email et 30 par IP ; mot de passe oublié 3 / h par email et 5 / 15 min par IP ; liens 30 / 15 min par IP.
- Emails : l'expéditeur déjà utilisé par la réservation (Gmail `contact@scalia.do`, ou Resend), en ES / FR / EN.

## Accès et isolation

- Rôle `admin` ou `client`, relu en base à chaque requête. `/api/portal-admin` : 401 sans session, 403 pour un client. `/portal/*` et `/admin/*` sans cookie → `/portal/login/` (`middleware.js`).
- Les lectures client sont filtrées **dans le SQL** par l'appartenance à l'organisation : un projet ou un document d'un autre client, ou un document interne, répond 404 (comme un document inexistant).
- Écritures : `Origin` du site obligatoire, session, rôle, validation de chaque champ côté serveur.

## Fichiers (Vercel Blob privé)

- Upload : le serveur vérifie l'admin, le projet, l'extension (PDF, images, Office, ZIP, vidéo ; pas d'exécutable, HTML ni SVG) et la taille (50 Mo max.), choisit lui-même le chemin `projects/<projet>/<uuid>/<nom-nettoyé>` et le type, puis signe **une** URL d'upload (ce chemin, ce type, cette taille, 15 min). Le navigateur de l'admin envoie le fichier directement à Vercel Blob (les fonctions Vercel limitent les requêtes à 4,5 Mo). Le serveur revérifie ensuite le fichier stocké avant de l'enregistrer.
- Téléchargement : `/api/portal/?a=file&id=…` vérifie la session et l'accès, puis redirige vers une URL signée valable **60 s**. Le jeton Blob ne quitte jamais le serveur.
- CSP : seule `/admin/` autorise `https://vercel.com/api/blob/` (upload). Le reste du site garde `connect-src 'self'`.

## Fonctions métier (prêtes pour un agent)

`server/portal/service.js` : `createClient`, `createProject`, `updateProject`, `updateProjectStage`, `addProjectUpdate`, `setNextStep`, `recordPayment`, `updatePayment`, `setRequiredAction`, `resolveRequiredAction`, `requestDocumentUpload` + `uploadProjectDocument`, `quickUpdate`, `resendInvite`…
Chacune prend `ctx = { user, admin }`, valide ses entrées et vérifie le rôle. Un agent les appellera telles quelles, jamais de SQL.

## Variables d'environnement

| Variable | Origine |
|---|---|
| `DATABASE_URL` (ou `POSTGRES_URL`) | ajoutée par Vercel en connectant la base Postgres au projet |
| `DATABASE_URL_UNPOOLED` / `POSTGRES_URL_NON_POOLING` | si présente : utilisée par les migrations |
| `BLOB_READ_WRITE_TOKEN` | ajoutée par Vercel en connectant le store Blob au projet |
| `PORTAL_SITE_URL` | facultative (liens des emails) |
| `PORTAL_MOCK`, `PORTAL_MOCK_DIR` | tests locaux uniquement, ignorées sur Vercel |

Pas de secret de session : les sessions sont des valeurs aléatoires hashées en base.

## Mise en service dans Vercel

1. Vercel → projet du site → **Storage** → créer une base **Postgres** (fournisseur Neon, via le Marketplace) → la connecter au projet pour Production (et Preview si besoin). Vercel ajoute `DATABASE_URL` et ses variantes.
2. **Storage** → créer un store **Blob** (accès **Private** si Vercel le demande) → le connecter au projet. Vercel ajoute `BLOB_READ_WRITE_TOKEN`.
3. En local, récupérer les variables : `npm i -g vercel`, `vercel link` (dans ce dossier), puis `vercel env pull .env.local`.
4. Créer les tables : `npm run portal:migrate`.
5. Créer le premier admin : `npm run portal:create-admin -- --email contact@scalia.do --name "Kevi Moronta" --locale fr` → le script affiche un lien (24 h) pour choisir le mot de passe. Il refuse dès qu'un admin existe. Admins suivants : créer le compte comme un client puis, dans la base (onglet Storage → Neon → SQL), `update users set role = 'admin' where email = '…';`. Nom, titre et WhatsApp affichés aux clients : colonnes `first_name`, `last_name`, `title`, `whatsapp` de `users`.
6. Déployer (push sur GitHub). L'adresse client à envoyer : `https://scalia.do/portal`.

## Local

```bash
npm install
PORTAL_MOCK=1 npm run portal:create-admin -- --email admin@scalia.test --name "Admin Test"
PORTAL_MOCK=1 PORT=3001 HOST=0.0.0.0 node scripts/dev-server.mjs
npm run portal:test
```

Mode test : vrai Postgres (PGlite) avec les vraies migrations, fichiers et emails `.eml` dans le dossier temporaire (`PORTAL_MOCK_DIR`). Lancer `create-admin` serveur arrêté (un seul processus à la fois sur cette base). Les liens d'invitation sont dans les `.eml`.
