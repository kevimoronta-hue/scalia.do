# Plan d'implémentation du Header & Footer PC

**Objectif :** Réorganiser le Header et le Footer uniquement sur PC (Logo à gauche, Menu à droite) tout en préservant intacte la mise en page mobile.
**Architecture :** Modification des classes Tailwind Flexbox (`md:flex-row`, `md:static`, `md:order-last`, `md:hidden`, etc.) dans les composants existants.
**Stack Technique (Tech Stack) :** Next.js, React, Tailwind CSS.

---

### Tâche 1 : Header (GhostNav.tsx)
**Fichiers :**
- Modifier : `src/components/GhostNav.tsx`

**Actions détaillées :**
- [ ] Dans le conteneur principal `div className="max-w-7xl..."`, ajouter `md:justify-end`.
- [ ] Modifier le conteneur du Logo pour qu'il soit absolu sur mobile et statique à gauche sur PC : `absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 md:static md:translate-x-0 md:translate-y-0 md:mr-auto`.
- [ ] Ajouter les liens PC (ADN, Contact) justes avant le Language Switcher avec la classe `hidden md:flex items-center gap-8 mr-6`.
- [ ] Modifier le conteneur du Language Switcher pour le placer en premier sur mobile et en dernier sur PC : `order-first md:order-last`.
- [ ] Ajouter `md:hidden` sur le bouton du menu Burger.

### Tâche 2 : Footer (Footer.tsx)
**Fichiers :**
- Modifier : `src/components/Footer.tsx`

**Actions détaillées :**
- [ ] Modifier le conteneur principal du contenu `div className="flex flex-col..."` par `className="flex flex-col md:flex-row items-center md:items-start md:justify-between gap-10 mb-16 w-full"`.
- [ ] S'assurer que le bloc des réseaux sociaux se décale proprement vers la droite sur PC.
- [ ] Lancer un Build pour confirmer qu'aucune erreur de syntaxe n'est présente.
