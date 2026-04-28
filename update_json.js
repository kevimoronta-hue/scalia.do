const fs = require('fs');

const es = JSON.parse(fs.readFileSync('./messages/es.json', 'utf8'));
const en = JSON.parse(fs.readFileSync('./messages/en.json', 'utf8'));
const fr = JSON.parse(fs.readFileSync('./messages/fr.json', 'utf8'));

// Delete old keys if present
delete es.ComparisonTable;
delete en.ComparisonTable;
delete fr.ComparisonTable;

es.PricingTiers = {
    "title": "Les muestro por qué con SCALIA",
    "titleHighlight": "la competencia desaparece.",
    "tier1Name": "Plan ALPHA",
    "tier1Subtitle": "El Origen",
    "tier1Desc": "Para los que salen de la sombra y quieren marcar su territorio.",
    "tier1F1Title": "Diseño de Autoridad",
    "tier1F1Text": "Estructura limpia e intimidante para la competencia.",
    "tier1F2Title": "Optimización",
    "tier1F2Text": "Carga antes de terminar el clic.",
    "tier1F3Title": "Soporte Directo",
    "tier1F3Text": "Respondo cuando llamas. Punto final.",
    "tier1F4Title": "Producción Visual",
    "tier1F4Text": "Shooting Foto Pro.",
    "tier1CTA": "Activar mi Plan",

    "tier2Name": "Plan VANTAGE",
    "tier2Subtitle": "El Estándar de Oro",
    "tier2Desc": "El plan para los que no quieren solo participar, sino ganar.",
    "tier2F1Title": "Todo lo de ALPHA +",
    "tier2F1Text": "",
    "tier2F2Title": "Movimiento Cinético",
    "tier2F2Text": "Animaciones futuristas.",
    "tier2F3Title": "Ingeniería de Conversión",
    "tier2F3Text": "Diseño psicológico para forzar la acción.",
    "tier2F4Title": "Campaña de Video",
    "tier2F4Text": "Lista para uso en redes sociales.",
    "tier2Badge": "MÁS SOLICITADO",
    "tier2CTA": "Activar mi Plan",

    "tier3Name": "Plan ZENITH",
    "tier3Subtitle": "Monopolio Absoluto",
    "tier3Desc": "La oferta reservada para la élite que busca un socio de guerra de por vida.",
    "tier3F1Title": "Todo lo de VANTAGE +",
    "tier3F1Text": "",
    "tier3F2Title": "Modificaciones ILIMITADAS",
    "tier3F2Text": "Servicio sin límites, sin fricción.",
    "tier3F3Title": "Acceso Prioritario",
    "tier3F3Text": "Estamos disponibles 24/7, pero su proyecto es nuestra prioridad.",
    "tier3F4Title": "Producción Continua",
    "tier3F4Text": "¿Cambió sus planes? No se preocupe, adaptamos la idea en cualquier momento.",
    "tier3CTA": "Activar mi Plan"
};

en.PricingTiers = {
    "title": "Let me show you why with SCALIA",
    "titleHighlight": "the competition disappears.",
    "tier1Name": "ALPHA Plan",
    "tier1Subtitle": "The Origin",
    "tier1Desc": "For those stepping out of the shadows and marking their territory.",
    "tier1F1Title": "Authority Design",
    "tier1F1Text": "Clean, intimidating structure for your competition.",
    "tier1F2Title": "Optimization",
    "tier1F2Text": "Loads before the click finishes.",
    "tier1F3Title": "Direct Support",
    "tier1F3Text": "I answer when you call. Period.",
    "tier1F4Title": "Visual Production",
    "tier1F4Text": "Pro Photo Shooting.",
    "tier1CTA": "Activate My Plan",

    "tier2Name": "VANTAGE Plan",
    "tier2Subtitle": "The Gold Standard",
    "tier2Desc": "The plan for those who don't just want to participate, but win.",
    "tier2F1Title": "Everything in ALPHA +",
    "tier2F1Text": "",
    "tier2F2Title": "Kinetic Movement",
    "tier2F2Text": "Futuristic animations.",
    "tier2F3Title": "Conversion Engineering",
    "tier2F3Text": "Psychological design to force action.",
    "tier2F4Title": "Video Campaign",
    "tier2F4Text": "Ready for social media.",
    "tier2Badge": "MOST REQUESTED",
    "tier2CTA": "Activate My Plan",

    "tier3Name": "ZENITH Plan",
    "tier3Subtitle": "Absolute Monopoly",
    "tier3Desc": "The offer reserved for the elite seeking a lifelong war partner.",
    "tier3F1Title": "Everything in VANTAGE +",
    "tier3F1Text": "",
    "tier3F2Title": "UNLIMITED Modifications",
    "tier3F2Text": "Limitless service, zero friction.",
    "tier3F3Title": "Priority Access",
    "tier3F3Text": "We are available 24/7, but your project is our priority.",
    "tier3F4Title": "Continuous Production",
    "tier3F4Text": "Plans changed? Don't worry, we adapt the idea at any moment.",
    "tier3CTA": "Activate My Plan"
};

fr.PricingTiers = {
    "title": "Laissez-moi vous montrer pourquoi avec SCALIA",
    "titleHighlight": "la concurrence disparaît.",
    "tier1Name": "Plan ALPHA",
    "tier1Subtitle": "L'Origine",
    "tier1Desc": "Pour ceux qui sortent de l'ombre et veulent marquer leur territoire.",
    "tier1F1Title": "Design d'Autorité",
    "tier1F1Text": "Structure épurée et intimidante pour la concurrence.",
    "tier1F2Title": "Optimisation",
    "tier1F2Text": "Se charge avant même la fin du clic.",
    "tier1F3Title": "Support Direct",
    "tier1F3Text": "Je réponds quand vous appelez. Point final.",
    "tier1F4Title": "Production Visuelle",
    "tier1F4Text": "Shooting Photo Pro.",
    "tier1CTA": "Activer mon Plan",

    "tier2Name": "Plan VANTAGE",
    "tier2Subtitle": "Le Standard Or",
    "tier2Desc": "Le plan pour ceux qui ne veulent pas juste participer, mais gagner.",
    "tier2F1Title": "Tout ce qui est dans ALPHA +",
    "tier2F1Text": "",
    "tier2F2Title": "Mouvement Cinétique",
    "tier2F2Text": "Animations futuristes.",
    "tier2F3Title": "Ingénierie de Conversion",
    "tier2F3Text": "Design psychologique pour forcer l'action.",
    "tier2F4Title": "Campagne Vidéo",
    "tier2F4Text": "Prêt pour les réseaux sociaux.",
    "tier2Badge": "LE PLUS DEMANDÉ",
    "tier2CTA": "Activer mon Plan",

    "tier3Name": "Plan ZENITH",
    "tier3Subtitle": "Monopole Absolu",
    "tier3Desc": "L'offre réservée à l'élite cherchant un partenaire de guerre à vie.",
    "tier3F1Title": "Tout ce qui est dans VANTAGE +",
    "tier3F1Text": "",
    "tier3F2Title": "Modifications ILLIMITÉES",
    "tier3F2Text": "Service sans limites, zéro friction.",
    "tier3F3Title": "Accès Prioritaire",
    "tier3F3Text": "Nous sommes disponibles 24/7, mais votre projet est notre priorité.",
    "tier3F4Title": "Production Continue",
    "tier3F4Text": "Vos plans ont changé ? Pas de problème, nous adaptons l'idée à tout moment.",
    "tier3CTA": "Activer mon Plan"
};

const ed_es = {
    "introTitle": "Construyendo el legado",
    "introItalic": "de tu marca.",
    "introDesc": "El mercado dominicano no compra productos, compra pertenencia. En SCALIA, no somos una agencia de volumen. Construimos 'Lovemarks' mediante diagnósticos de negocio precisos, fusionando la autenticidad caribeña con los estándares de lujo mundial.",
    
    "step1Title": "Extracción de Visión",
    "step1Sub": "(Mind-Reading)",
    "step1Desc": "No perdemos tiempo con cuestionarios infinitos. Un café o un audio de WhatsApp bastan para que capture la esencia de tu negocio y lo que tus clientes buscan.",
    
    "step2Title": "Arquitectura de Conversión",
    "step2Sub": "",
    "step2Desc": "Diseño la estructura lógica de tu sitio. No solo es estético, es estratégico: cada sección está pensada para guiar al usuario hacia el botón de compra sin distracciones.",

    "step3Title": "Maquetas de Alta Costura",
    "step3Sub": "(Design Reveal)",
    "step3Desc": "Aquí es donde ocurre la magia. Te presento maquetas visuales únicas, creadas desde cero. Nada de plantillas baratas; diseño puro que posiciona tu marca como líder en RD.",

    "step4Title": "Desarrollo Cinético",
    "step4Sub": "",
    "step4Desc": "Transformo el diseño en una experiencia viva. Implemento animaciones fluidas y micro-interacciones que hacen que navegar por tu web se sienta como un lujo.",

    "step5Title": "Despliegue y Soporte",
    "step5Sub": "(24/7)",
    "step5Desc": "Lanzamos tu máquina de ventas. Y aquí es donde realmente brillo: tienes acceso directo a mí 24/7 para cambios y ajustes ilimitados. Tu éxito es nuestra única prioridad.",

    "th1": "",
    "th2": "SERVICIO SCALIA",
    "th3": "Agencia Promedio (RD)",

    "r1_feature": "Modificaciones",
    "r1_scalia": "ILIMITADAS (Cero fricción)",
    "r1_others": "Limitadas (2 o 3 máximo)",
    
    "r2_feature": "Disponibilidad",
    "r2_scalia": "24/7 (WhatsApp Directo)",
    "r2_others": "Horarios de oficina (L-V)",
    
    "r3_feature": "Diseño",
    "r3_scalia": "Cinemático & Premium",
    "r3_others": "Templates estáticos",
    
    "r4_feature": "Creatividad",
    "r4_scalia": "Visión disruptiva (A medida)",
    "r4_others": "\"Copiar-Pegar\" de lo que existe",
    
    "r5_feature": "Tiempos",
    "r5_scalia": "Prioridad Alta (Entrega Flash)",
    "r5_others": "Proyectos que se eternizan",
    
    "r6_feature": "Soporte",
    "r6_scalia": "Socio Estratégico",
    "r6_others": "Simple ejecutor"
};

const ed_en = {
    "introTitle": "Building the legacy",
    "introItalic": "of your brand.",
    "introDesc": "The market doesn't buy products, it buys belonging. At SCALIA, we are not a volume agency. We build 'Lovemarks' through precise business diagnostics, merging Caribbean authenticity with global luxury standards.",
    
    "step1Title": "Vision Extraction",
    "step1Sub": "(Mind-Reading)",
    "step1Desc": "We don't waste time with endless questionnaires. A coffee or a WhatsApp audio is enough for me to capture the essence of your business and what your clients seek.",
    
    "step2Title": "Conversion Architecture",
    "step2Sub": "",
    "step2Desc": "I design the logical structure of your site. It's not just aesthetic, it's strategic: each section is designed to guide the user to the buy button without distractions.",

    "step3Title": "Haute Couture Mockups",
    "step3Sub": "(Design Reveal)",
    "step3Desc": "This is where the magic happens. I present unique visual mockups, created from scratch. No cheap templates; pure design that positions your brand as a leader.",

    "step4Title": "Kinetic Development",
    "step4Sub": "",
    "step4Desc": "I transform the design into a living experience. I implement fluid animations and micro-interactions that make navigating your website feel like a luxury.",

    "step5Title": "Deployment and Support",
    "step5Sub": "(24/7)",
    "step5Desc": "We launch your sales machine. And this is where I truly shine: you have direct access to me 24/7 for unlimited changes and adjustments. Your success is our only priority.",

    "th1": "",
    "th2": "SCALIA SERVICE",
    "th3": "Average Agency",

    "r1_feature": "Modifications",
    "r1_scalia": "UNLIMITED (Zero friction)",
    "r1_others": "Limited (2 or 3 max)",
    
    "r2_feature": "Availability",
    "r2_scalia": "24/7 (Direct WhatsApp)",
    "r2_others": "Office hours (M-F)",
    
    "r3_feature": "Design",
    "r3_scalia": "Cinematic & Premium",
    "r3_others": "Static templates",
    
    "r4_feature": "Creativity",
    "r4_scalia": "Disruptive vision (Tailor-made)",
    "r4_others": "\"Copy-Paste\" of what exists",
    
    "r5_feature": "Timeframes",
    "r5_scalia": "High Priority (Flash Delivery)",
    "r5_others": "Projects that last forever",
    
    "r6_feature": "Support",
    "r6_scalia": "Strategic Partner",
    "r6_others": "Simple executor"
};

const ed_fr = {
    "introTitle": "Construire l'héritage",
    "introItalic": "de votre marque.",
    "introDesc": "Le marché n'achète pas des produits, il achète une appartenance. Chez SCALIA, nous ne sommes pas une agence de volume. Nous construisons des 'Lovemarks' grâce à des diagnostics commerciaux précis, fusionnant l'authenticité avec les standards de luxe mondiaux.",
    
    "step1Title": "Extraction de Vision",
    "step1Sub": "(Mind-Reading)",
    "step1Desc": "Nous ne perdons pas de temps avec des questionnaires interminables. Un café ou un audio WhatsApp suffit pour capturer l'essence de votre entreprise et ce que vos clients recherchent.",
    
    "step2Title": "Architecture de Conversion",
    "step2Sub": "",
    "step2Desc": "Je conçois la structure logique de votre site. Ce n'est pas seulement esthétique, c'est stratégique : chaque section est conçue pour guider l'utilisateur vers l'achat sans distractions.",

    "step3Title": "Maquettes Haute Couture",
    "step3Sub": "(Design Reveal)",
    "step3Desc": "C'est ici que la magie opère. Je présente des maquettes visuelles uniques, créées de zéro. Pas de templates bon marché ; du pur design qui positionne votre marque en tant que leader.",

    "step4Title": "Développement Cinétique",
    "step4Sub": "",
    "step4Desc": "Je transforme le design en une expérience vivante. J'intègre des animations fluides et des micro-interactions qui rendent la navigation sur votre site Web luxueuse.",

    "step5Title": "Déploiement et Support",
    "step5Sub": "(24/7)",
    "step5Desc": "Nous lançons votre machine de vente. Et c'est là que je brille vraiment : vous avez un accès direct à moi 24/7 pour des modifications illimitées. Votre succès est notre seule priorité.",

    "th1": "",
    "th2": "SERVICE SCALIA",
    "th3": "Agence Moyenne",

    "r1_feature": "Modifications",
    "r1_scalia": "ILLIMITÉES (Zéro friction)",
    "r1_others": "Limitées (2 ou 3 max)",
    
    "r2_feature": "Disponibilité",
    "r2_scalia": "24/7 (WhatsApp Direct)",
    "r2_others": "Heures de bureau (L-V)",
    
    "r3_feature": "Design",
    "r3_scalia": "Cinématique & Premium",
    "r3_others": "Templates statiques",
    
    "r4_feature": "Créativité",
    "r4_scalia": "Vision disruptive (Sur-mesure)",
    "r4_others": "\"Copier-Coller\" de l'existant",
    
    "r5_feature": "Délais",
    "r5_scalia": "Priorité Haute (Livraison Flash)",
    "r5_others": "Projets qui s'éternisent",
    
    "r6_feature": "Support",
    "r6_scalia": "Partenaire Stratégique",
    "r6_others": "Simple exécutant"
};

es.EditorialShowcase = ed_es;
en.EditorialShowcase = ed_en;
fr.EditorialShowcase = ed_fr;

fs.writeFileSync('./messages/es.json', JSON.stringify(es, null, 2));
fs.writeFileSync('./messages/en.json', JSON.stringify(en, null, 2));
fs.writeFileSync('./messages/fr.json', JSON.stringify(fr, null, 2));

console.log("JSON updated!");

// Add VideoTestimonial.tag
const es2 = JSON.parse(require('fs').readFileSync('./messages/es.json', 'utf8'));
const en2 = JSON.parse(require('fs').readFileSync('./messages/en.json', 'utf8'));
const fr2 = JSON.parse(require('fs').readFileSync('./messages/fr.json', 'utf8'));

es2.VideoTestimonial.tag = "Testimonio";
en2.VideoTestimonial.tag = "Testimonial";
fr2.VideoTestimonial.tag = "Témoignage";

require('fs').writeFileSync('./messages/es.json', JSON.stringify(es2, null, 2));
require('fs').writeFileSync('./messages/en.json', JSON.stringify(en2, null, 2));
require('fs').writeFileSync('./messages/fr.json', JSON.stringify(fr2, null, 2));
console.log("Tags updated!");
