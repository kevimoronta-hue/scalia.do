# Spécification de Design : Harmonisation PC (Option 3 - Ajustements Millimétrés)

## Objectif
Standardiser et harmoniser l'expérience utilisateur (UI/UX) sur les écrans d'ordinateur (Desktop) pour la landing page Scalia, sans impacter la version mobile.

## Règles Fondamentales
1. **Zéro impact mobile** : Toutes les modifications utiliseront strictement les préfixes Tailwind `md:`, `lg:`, ou `xl:`. Les classes de base (mobile) restent inchangées.
2. **Cohérence globale** : Toutes les sections doivent respecter une grille spatiale et typographique unifiée.

## 1. Espacements & Marges (Paddings)
Actuellement, les sections utilisent des paddings disparates (`py-24`, `py-32`).
- **Standardisation verticale** : Toutes les balises `<section>` majeures adopteront la classe : `py-24 md:py-32 lg:py-40`. Cela donnera beaucoup plus de respiration (negative space) sur les très grands écrans.
- **Conteneurs (Max-Width)** : Les conteneurs internes utiliseront uniformément `max-w-7xl mx-auto px-6 md:px-12 lg:px-20` pour un alignement horizontal parfait sur PC.

## 2. Typographie (Mise à l'échelle)
Les polices vont être très légèrement augmentées (+15% en moyenne) sur PC pour occuper l'espace de manière luxueuse.
- **Titres de section (H2)** : Standardisés vers `text-4xl md:text-5xl lg:text-6xl`.
- **Sous-titres & Descriptions (P)** : Standardisés vers `text-base md:text-lg lg:text-xl` (avec souvent un `leading-relaxed` pour la lisibilité).

## 3. Cartes & Bordures (UI Elements)
Les éléments flottants (Tiers de prix, Vidéo Testimonial, Tableaux de l'Editorial Showcase) doivent sembler provenir du même "moule" (Design System).
- **Rayon de courbure (Border Radius)** : `rounded-2xl md:rounded-[2rem]` pour toutes les cartes principales.
- **Bordures** : Harmonisation stricte sur `border-white/10` (certains éléments utilisent actuellement `border-white/5` ou `border-white/8`).
- **Arrière-plans (Backgrounds)** : Les cartes utiliseront uniformément la couleur `#0A0A0A` ou un effet glassmorphism `bg-[#050505]/60 backdrop-blur-3xl`.

## 4. Effets de Survol (Hover Effects)
- Les effets de "scale" et de survol sur PC seront adoucis : `transition-all duration-500` (au lieu de 300 parfois) pour un effet de lenteur premium.
