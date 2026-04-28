# Plan d'implémentation de Harmonisation UI PC (Néo-Luxe)

**Objectif :** Standardiser les espacements, la typographie, les bordures et les effets de survol sur la version Bureau (PC) de la landing page, sans altérer la version mobile.
**Architecture :** Modification purement visuelle via les classes utilitaires de Tailwind CSS dans les composants React existants, en utilisant systématiquement les préfixes `md:` et `lg:`.
**Stack Technique (Tech Stack) :** Next.js, React, Tailwind CSS, Framer Motion.

---

### Tâche 1 : Harmonisation globale des espacements (Paddings)
**Fichiers :**
- Modifier : `src/app/[locale]/page.tsx`
- Modifier : `src/components/EditorialShowcase.tsx`
- Modifier : `src/components/VideoTestimonial.tsx`
- Modifier : `src/components/FAQ.tsx`

**Actions détaillées :**
- [ ] Dans `src/app/[locale]/page.tsx`, repérer la section "SPACER FINAL & FOOTER CTA" (`className="py-32...`) et remplacer par `className="py-24 md:py-32 lg:py-40 bg-black relative z-20 flex flex-col items-center justify-center text-center px-6"`
- [ ] Dans `src/components/EditorialShowcase.tsx`, modifier la section principale (`className="py-32...`) par `className="py-24 md:py-32 lg:py-40 px-6 md:px-12 max-w-7xl mx-auto bg-black relative z-10"`
- [ ] Dans `src/components/VideoTestimonial.tsx`, modifier la section principale (`className="py-32...`) par `className="py-24 md:py-32 lg:py-40 px-6 md:px-12 max-w-7xl mx-auto bg-black relative z-10"`
- [ ] Dans `src/components/FAQ.tsx`, modifier la section principale (`className="py-32...`) par `className="py-24 md:py-32 lg:py-40 px-6 md:px-12 max-w-4xl mx-auto bg-black relative z-10"`

### Tâche 2 : Harmonisation des Titres (H2) et Sous-titres
**Fichiers :**
- Modifier : `src/app/[locale]/page.tsx`
- Modifier : `src/components/PricingTiers.tsx`
- Modifier : `src/components/DroneShowcase.tsx`
- Modifier : `src/components/FAQ.tsx`
- Modifier : `src/components/VideoTestimonial.tsx`

**Actions détaillées :**
- [ ] Dans `src/app/[locale]/page.tsx`, remplacer `text-2xl md:text-4xl` par `text-3xl md:text-5xl lg:text-6xl`.
- [ ] Dans `src/components/PricingTiers.tsx`, remplacer `text-4xl md:text-6xl` par `text-4xl md:text-5xl lg:text-6xl`.
- [ ] Dans `src/components/FAQ.tsx`, remplacer `text-3xl md:text-5xl` par `text-4xl md:text-5xl lg:text-6xl`.
- [ ] Dans `src/components/VideoTestimonial.tsx`, remplacer `text-4xl md:text-5xl` par `text-4xl md:text-5xl lg:text-6xl`.
- [ ] Dans `src/components/DroneShowcase.tsx`, remplacer `text-4xl md:text-6xl` de l'intro par `text-4xl md:text-5xl lg:text-6xl`, et remplacer le `text-3xl md:text-4xl` des specs par `text-3xl md:text-4xl lg:text-5xl`.

### Tâche 3 : Arrondis et Bordures des Cartes (Cards & Glassmorphism)
**Fichiers :**
- Modifier : `src/components/PricingTiers.tsx`
- Modifier : `src/components/EditorialShowcase.tsx`

**Actions détaillées :**
- [ ] Dans `src/components/PricingTiers.tsx`, s'assurer que toutes les cartes ont `rounded-2xl md:rounded-[2rem]` et que les bordures sont uniformément `border-white/10`. Remplacer `duration-300` par `duration-500` sur les hover des cartes.
- [ ] Dans `src/components/EditorialShowcase.tsx`, remplacer le `rounded-[2rem]` de la table de comparaison par `rounded-2xl md:rounded-[2rem]`.

### Tâche 4 : Vérification de la Compilation
**Fichiers :**
- N/A

**Actions détaillées :**
- [ ] Lancer `npm run build` pour garantir qu'aucune erreur de syntaxe n'a été introduite.
- [ ] Confirmer le succès à l'utilisateur.
