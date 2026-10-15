# Scalia — portail client et admin (V1)

`scalia.do/portal` : le client suit son projet. `scalia.do/admin` : Scalia le met à jour, sans toucher au code.
Une seule application : ce que chacun voit dépend des données, jamais d'une URL par client.

## Architecture

| Couche | Fichiers |
|---|---|
| Pages (HTML statique, comme le site) | `portal/` (dashboard), `portal/login/`, `portal/welcome/`, `admin/`, `admin/project/` |
| Navigateur | `portal-core.js` (API, formats, i18n), `portal.js`, `portal-auth.js`, `admin.js`, `portal.css`, `i18n/portal.js` (ES / EN, clé = texte FR) |
| API (fonctions Vercel) | `api/portal.js` (client : login, lien email, mot de passe, projet, fichiers), `api/portal-admin.js` (admin) |
| Métier | `server/portal/service.js` : **toutes** les modifications passent par ces fonctions |
| Données | `server/portal/supabase.js` (Supabase via fetch, sans dépendance npm), `server/portal/mock.js` (backend local de test) |
| Session | `server/portal/session.js` : cookies httpOnly `scalia_pa` / `scalia_pr`, rôle lu en base à chaque requête |
| Schéma | `server/portal/schema.sql` : tables, RLS, bucket Storage privé |

Supabase est retenu parce que le site n'avait ni base, ni auth, ni stockage. Il apporte les trois (Auth, Postgres avec RLS, Storage privé) sans serveur à maintenir. Il est appelé uniquement côté serveur, la CSP du site reste `connect-src 'self'` (seul `/admin/` autorise `*.supabase.co`, pour l'upload direct des fichiers).

## Rôles et sécurité

- **admin** : tout. **client** : lecture seule de ses propres projets.
- Chaque requête client utilise **la session du client** : la base (RLS) filtre elle-même ; l'API vérifie aussi (`service.js`). Un ID d'un autre client donne 404, `/api/portal-admin` donne 403.
- La clé secrète (`SUPABASE_SERVICE_ROLE_KEY`) ne sert qu'à créer les liens d'invitation / de nouveau mot de passe.
- Mises à jour, documents : `visible_to_client = false` = interne, jamais renvoyé au client (RLS + API + Storage).
- Fichiers : bucket privé `portal`, liens signés de 60 s créés avec la session du lecteur.
- `/portal/*` et `/admin/*` sans cookie de session → `/portal/login/` (`middleware.js`) ; `/admin` vérifie le rôle en base et renvoie un client vers `/portal`.

## Tables

`profiles` (rôle, langue, contact) · `organizations` · `organization_members` · `projects` · `project_stages` (5 par projet) · `project_updates` · `payments` · `documents` · `project_actions` (« action requise » ; `kind = approval` réservé à la validation client, V2).
`updated_at` / `updated_by` remplis par trigger (petit journal d'audit).

## Progression

5 étapes × 20 %. Terminée = 20 %, en cours (ou en attente du client) = 20 % × sa progression, à venir = 0.
Ex. : Brief + Maquette terminés, Développement à 50 % → 40 + 10 = **50 %**. L'étape courante = la première non terminée.

## Paiements

`total_amount` + devise (EUR, USD, DOP) par projet. Payé = somme des paiements `paid` ; restant = total − payé.
Les paiements sont dans la devise du projet ; elle ne peut plus changer une fois un paiement enregistré.

## Mise en service (une fois)

1. Créer un projet Supabase (région proche des clients), puis **SQL Editor** → coller et exécuter `server/portal/schema.sql`.
2. Premier admin : **Authentication → Users → Add user → Create new user** (email de l'admin, mot de passe choisi par lui, « Auto confirm » coché), puis en SQL :
   `update public.profiles set role = 'admin', full_name = 'Kevi Moronta', title = 'Founder · Head of AI', whatsapp = '+33…' where email = 'contact@scalia.do';`
3. **Authentication → URL Configuration** : Site URL `https://scalia.do`.
   Admins suivants : même méthode (Add user + la requête SQL). Le rôle ne se change qu'en base, jamais depuis le site.
4. Vercel → Environment Variables : `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (voir `.env.example`). Les emails partent par l'expéditeur déjà configuré pour la réservation (Gmail `contact@scalia.do` ou Resend).

## Créer un client

`/admin` → **+ Nouveau client** (entreprise, contact, email, téléphone, langue) → l'organisation et l'accès sont créés, l'invitation part dans la langue du client → le formulaire du projet s'ouvre (nom, type, devise, montant, dates, contact Scalia) avec les 5 étapes créées automatiquement.
Le client clique le lien (valable 24 h, usage unique), choisit son mot de passe et arrive sur son projet. Ensuite : `https://scalia.do/portal`.
**Renvoyer l'invitation** (onglet Clients) : nouvelle invitation, ou lien « nouveau mot de passe » si le compte est déjà activé.

## Mettre à jour un projet (30 s)

Fiche projet → **Mise à jour rapide** : étape → statut → progression → dernière mise à jour → prochaine étape → Enregistrer.
Plus bas : action requise, 5 étapes, paiements, contrat et documents (upload jusqu'à 50 Mo, interne ou visible), notes internes, détails, clôture.
**Voir comme le client** ouvre exactement sa vue.

## Fonctions métier (prêtes pour un agent)

`server/portal/service.js` : `createClient`, `createProject`, `updateProject`, `updateProjectStage`, `addProjectUpdate`, `setNextStep`, `recordPayment`, `updatePayment`, `setRequiredAction`, `resolveRequiredAction`, `requestDocumentUpload` + `uploadProjectDocument`, `quickUpdate`, `resendInvite`…
Chacune prend `ctx` (session admin), valide ses entrées et vérifie le rôle : un agent les appellera telles quelles, jamais d'écriture directe en base.

## Local

```bash
PORTAL_MOCK=1 PORT=3001 HOST=0.0.0.0 node scripts/dev-server.mjs
node scripts/portal-mock.mjs admin admin@scalia.test 'mot-de-passe-local'
```

Backend de test (aucun Supabase, refusé sur Vercel) : données, fichiers et emails `.eml` dans le dossier temporaire (`node scripts/portal-mock.mjs mails`). Le lien d'invitation est dans l'email. `node scripts/portal-mock.mjs reset` vide tout.
Avec Supabase : mettre les 3 variables dans `.env.local` et lancer sans `PORTAL_MOCK`.
