const fs = require('fs');
const es = JSON.parse(fs.readFileSync('messages/es.json', 'utf8'));

es.DroneShowcase = {
  "introTag": "Producción Visual Élite",
  "introTitle": "¿Necesitas vistas aéreas?",
  "introDesc": "Déjeme enseñarle.",
  "loading": "Cargando secuencia",
  "specsTitle": "Especificaciones Técnicas",
  "specsIncluded": "Incluido en Plan VANTAGE y ZENITH",
  "spec1Title": "Sistema de Doble Cámara",
  "spec1Desc": "Gran angular y Teleobjetivo 3x.",
  "spec2Title": "4K @ 60fps HDR",
  "spec2Desc": "Calidad de alto nivel.",
  "spec3Title": "Slow-Motion Épico",
  "spec3Desc": "Hasta 100fps para fluidez total (en 2.7K).",
  "spec4Title": "Vertical Nativo",
  "spec4Desc": "Listos para redes sociales en máxima calidad."
};

fs.writeFileSync('messages/es.json', JSON.stringify(es, null, 2));

const en = {
  HomePage: {
    subtitle: "If you look like everyone else, no one sees you. Break the standard.",
    footerTitle: "EXCELLENCE IS NOT AN OPTION.",
    footerCTA: "Request Diagnostic"
  },
  GhostNav: {
    about: "DNA",
    contact: "Contact"
  },
  EditorialShowcase: {
    introTitle: "Building the legacy",
    introItalic: "of your brand.",
    introDesc: "The Dominican market doesn't buy products, it buys belonging. At SCALIA, we are not a volume agency. We build 'Lovemarks' through precise business diagnostics, fusing Caribbean authenticity with world-class luxury standards.",
    block1Tag: "Mobile-First",
    block1Title: "85% of your clients browse on mobile.",
    block1Desc: "PWA architecture, instant load interfaces, and surgical SEO optimization. Your brand must be tactile, fast, and omnipresent from Punta Cana to Santo Domingo.",
    block2Tag: "Cinematic",
    block2Title: "Aerial immersion.",
    block3Tag: "Technology",
    block3Title: "Predictable AI & ROI.",
    block4Tag: "VIP Conversion",
    block4Title: "WhatsApp Engineering",
    block4Desc: "Luxury demands frictionless attention. We implement conversational flows using artificial intelligence to ensure your high-value prospects move from web to human contact in a single click."
  },
  ComparisonTable: {
    feature: "Feature",
    scalia: "SCALIA SERVICE",
    others: "Average Digital Agency (DR)",
    r1_feature: "Modifications",
    r1_scalia: "UNLIMITED (Zero friction)",
    r1_others: "Limited (2 or 3 max)",
    r2_feature: "Availability",
    r2_scalia: "24/7 (Direct WhatsApp)",
    r2_others: "Office hours (M-F)",
    r3_feature: "Design",
    r3_scalia: "Cinematic & Premium",
    r3_others: "Static & outdated templates",
    r4_feature: "Creativity",
    r4_scalia: "Disruptive vision (Tailored)",
    r4_others: "\"Copy-Paste\" of what exists",
    r5_feature: "Delivery times",
    r5_scalia: "High Priority (Flash Delivery)",
    r5_others: "Projects that drag on forever",
    r6_feature: "Support",
    r6_scalia: "Strategic Partner",
    r6_others: "Simple executor"
  },
  PricingTiers: {
    sectionTag: "The Invitation",
    includedTitle: "What's included",
    title: "Strategy of ",
    titleHighlight: "Acquisition.",
    subtitle: "An exclusive positioning requires an infrastructure that eliminates the competition.",
    tier1Name: "Essence",
    tier1Desc: "The foundation of prestige. A digital presence designed to capture attention and build immediate trust.",
    tier1Feature1: "Immediate Authority Perception (Minimalist Design)",
    tier1Feature2: "Instant Load Experience (Mobile-First)",
    tier1Feature3: "Direct & Frictionless Attention (WhatsApp)",
    tier1CTA: "Start Now",
    tier2Name: "Ascension",
    tier2Badge: "Recommended",
    tier2Desc: "The ultimate ecosystem. For brands that demand visual perfection and 24/7 automated conversion.",
    tier2Feature1: "High User Retention (Scrollytelling)",
    tier2Feature2: "Advanced Conversion Flows (Premium Animations)",
    tier2Feature3: "Autopilot Sales (AI Automation)",
    tier2Feature4: "Local Market Dominance (Intensive SEO)",
    tier2CTA: "Apply for Diagnostic",
    tier3Name: "Apex",
    tier3Desc: "The pinnacle. Designed exclusively to monopolize the industry through immersive technology.",
    tier3Feature1: "Absolute Monopoly in your Industry (Phygital Architecture)",
    tier3Feature2: "Decisions Based on Clear Data (Predictive AI)",
    tier3Feature3: "Undisputable Audiovisual Authority (VIP Production)",
    tier3Feature4: "Continuous Evolution & Scalability (Elite Support)",
    tier3CTA: "By Private Invitation"
  },
  SocialProof: {
    subtitle: "They trust us for their growth"
  },
  VideoTestimonial: {
    quote: "\"Scalia didn't just create a page, they materialized my vision in record time.\"",
    play: "Watch Testimonial"
  },
  FAQ: {
    title: "Frequently Asked Questions",
    q1: "How long does it take to deliver the web infrastructure?",
    a1: "We operate with an agile and highly optimized model. The architecture is ready in 48 hours, and your project is live in a maximum of 1 week.",
    q2: "Will I really see a return on my investment?",
    a2: "Absolutely. We don't design webs to look pretty; we design acquisition ecosystems. Everything is optimized (speed, UX, copy) to convert traffic into qualified prospects.",
    q3: "Do I have to write the text for the page myself?",
    a3: "No. Our team takes care of the persuasive engineering (Copywriting). We understand your business goals and write texts psychologically designed to sell."
  },
  Footer: {
    brand: "SCALIA",
    tagline: "Design. Data. Dominance.",
    linksTitle: "Navigation",
    legalTitle: "Legal",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
    allRightsReserved": "All rights reserved."
  },
  DroneShowcase: {
    introTag: "Elite Visual Production",
    introTitle: "Need aerial views?",
    introDesc: "Let me show you.",
    loading: "Loading sequence",
    specsTitle: "Technical Specifications",
    specsIncluded: "Included in VANTAGE and ZENITH Plans",
    spec1Title: "Dual-Camera System",
    spec1Desc: "Wide-angle and 3x Telephoto.",
    spec2Title: "4K @ 60fps HDR",
    spec2Desc: "High-level quality.",
    spec3Title: "Epic Slow-Motion",
    spec3Desc: "Up to 100fps for total fluidity (in 2.7K).",
    spec4Title: "Native Vertical",
    spec4Desc: "Ready for social media in maximum quality."
  }
};

const fr = {
  HomePage: {
    subtitle: "Si vous ressemblez à tout le monde, personne ne vous voit. Brisez la norme.",
    footerTitle: "L'EXCELLENCE N'EST PAS UNE OPTION.",
    footerCTA: "Demander un Diagnostic"
  },
  GhostNav: {
    about: "ADN",
    contact: "Contact"
  },
  EditorialShowcase: {
    introTitle: "Construire l'héritage",
    introItalic: "de votre marque.",
    introDesc: "Le marché dominicain n'achète pas des produits, il achète une appartenance. Chez SCALIA, nous ne sommes pas une agence de volume. Nous construisons des 'Lovemarks' via des diagnostics précis, fusionnant l'authenticité caribéenne avec les standards du luxe mondial.",
    block1Tag: "Mobile-First",
    block1Title: "85% de vos clients naviguent sur mobile.",
    block1Desc: "Architecture PWA, chargement instantané et optimisation SEO chirurgicale. Votre marque doit être tactile, rapide et omniprésente de Punta Cana à Saint-Domingue.",
    block2Tag: "Cinématique",
    block2Title: "Immersion aérienne.",
    block3Tag: "Technologie",
    block3Title: "IA et ROI Prédictible.",
    block4Tag: "Conversion VIP",
    block4Title: "Ingénierie WhatsApp",
    block4Desc: "Le luxe exige une attention sans friction. Nous implémentons des flux conversationnels via intelligence artificielle pour garantir que vos prospects de haute valeur passent du web au contact humain en un seul clic."
  },
  ComparisonTable: {
    feature: "Caractéristique",
    scalia: "SERVICE SCALIA",
    others: "Agence Digitale Moyenne (RD)",
    r1_feature: "Modifications",
    r1_scalia: "ILLIMITÉES (Zéro friction)",
    r1_others: "Limitées (2 ou 3 max)",
    r2_feature: "Disponibilité",
    r2_scalia: "24/7 (WhatsApp Direct)",
    r2_others: "Heures de bureau (L-V)",
    r3_feature: "Design",
    r3_scalia: "Cinématique & Premium",
    r3_others: "Templates statiques et dépassés",
    r4_feature: "Créativité",
    r4_scalia: "Vision disruptive (Sur mesure)",
    r4_others: "\"Copier-Coller\" de l'existant",
    r5_feature: "Délais de livraison",
    r5_scalia: "Haute Priorité (Livraison Flash)",
    r5_others: "Projets qui s'éternisent",
    r6_feature: "Support",
    r6_scalia: "Partenaire Stratégique",
    r6_others: "Simple exécutant"
  },
  PricingTiers: {
    sectionTag: "L'Invitation",
    includedTitle: "Ce qui est inclus",
    title: "Stratégie d'",
    titleHighlight: "Acquisition.",
    subtitle: "Un positionnement exclusif exige une infrastructure qui élimine la concurrence.",
    tier1Name: "Essence",
    tier1Desc: "La base du prestige. Une présence digitale conçue pour capter l'attention et générer une confiance immédiate.",
    tier1Feature1: "Perception d'Autorité Immédiate (Design Minimaliste)",
    tier1Feature2: "Expérience de Chargement Instantané (Mobile-First)",
    tier1Feature3: "Attention Directe et Sans Friction (WhatsApp)",
    tier1CTA: "Démarrer",
    tier2Name: "Ascension",
    tier2Badge: "Recommandé",
    tier2Desc: "L'écosystème définitif. Pour les marques qui exigent une perfection visuelle et une conversion automatisée 24/7.",
    tier2Feature1: "Rétention Utilisateur Élevée (Scrollytelling)",
    tier2Feature2: "Flux de Conversion Avancés (Animations Premium)",
    tier2Feature3: "Ventes en Pilote Automatique (Automatisation IA)",
    tier2Feature4: "Domination du Marché Local (SEO Intensif)",
    tier2CTA: "Appliquer au Diagnostic",
    tier3Name: "Apex",
    tier3Desc: "Le sommet. Conçu exclusivement pour monopoliser l'industrie via la technologie immersive.",
    tier3Feature1: "Monopole Absolu dans votre Industrie (Architecture Phygitale)",
    tier3Feature2: "Décisions Basées sur des Données Claires (IA Prédictive)",
    tier3Feature3: "Autorité Audiovisuelle Indiscutible (Production VIP)",
    tier3Feature4: "Évolution et Scalabilité Continue (Support Élite)",
    tier3CTA: "Sur Invitation Privée"
  },
  SocialProof: {
    subtitle: "Ils nous font confiance pour leur croissance"
  },
  VideoTestimonial: {
    quote: "\"Scalia n'a pas créé une page, ils ont matérialisé ma vision en un temps record.\"",
    play: "Voir le Témoignage"
  },
  FAQ: {
    title: "Questions Fréquentes",
    q1: "Combien de temps faut-il pour livrer l'infrastructure web ?",
    a1: "Nous opérons avec un modèle agile et hautement optimisé. L'architecture est prête en 48 heures, et votre projet est en ligne en 1 semaine maximum.",
    q2: "Vais-je vraiment voir un retour sur mon investissement ?",
    a2: "Absolument. Nous ne concevons pas des sites pour qu'ils soient beaux ; nous concevons des écosystèmes d'acquisition. Tout est optimisé (vitesse, UX, copy) pour convertir le trafic en prospects qualifiés.",
    q3: "Dois-je rédiger moi-même les textes de la page ?",
    a3: "Non. Notre équipe se charge de l'ingénierie persuasive (Copywriting). Nous comprenons vos objectifs commerciaux et rédigeons des textes conçus psychologiquement pour vendre."
  },
  Footer: {
    brand: "SCALIA",
    tagline: "Design. Données. Domination.",
    linksTitle: "Navigation",
    legalTitle: "Légal",
    privacy: "Politique de Confidentialité",
    terms: "Conditions de Service",
    allRightsReserved": "Tous droits réservés."
  },
  DroneShowcase: {
    introTag: "Production Visuelle Élite",
    introTitle: "Besoin de vues aériennes ?",
    introDesc: "Laissez-moi vous montrer.",
    loading: "Chargement de la séquence",
    specsTitle: "Spécifications Techniques",
    specsIncluded: "Inclus dans les Plans VANTAGE et ZENITH",
    spec1Title: "Système à Double Caméra",
    spec1Desc: "Grand angle et Téléobjectif 3x.",
    spec2Title: "4K @ 60fps HDR",
    spec2Desc: "Qualité de haut niveau.",
    spec3Title: "Slow-Motion Épique",
    spec3Desc: "Jusqu'à 100fps pour une fluidité totale (en 2.7K).",
    spec4Title: "Vertical Natif",
    spec4Desc: "Prêts pour les réseaux sociaux en qualité maximale."
  }
};

fs.writeFileSync('messages/en.json', JSON.stringify(en, null, 2));
fs.writeFileSync('messages/fr.json', JSON.stringify(fr, null, 2));

console.log('Translations generated.');
