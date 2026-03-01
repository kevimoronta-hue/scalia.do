export type Locale = "es" | "fr" | "en" | "it" | "de";

export const localeFlags: Record<Locale, string> = {
    es: "🇩🇴",
    fr: "🇫🇷",
    en: "🇺🇸",
    it: "🇮🇹",
    de: "🇩🇪",
};

export const dictionaries = {
    es: {
        nav: {
            about: "Sobre nosotros",
            work: "Proyectos",
            contact: "Contacto",
        },
        hero: {
            scroll: "Desliza para descubrir",
            beatA: {
                title: "Ingeniería de sistemas para el hipercrecimiento.",
                subtitle: "Eliminamos los procesos manuales para que su negocio crezca en piloto automático.",
            },
            beatB: {
                title: "Blindaje de Flujo Comercial",
                subtitle: "Ingeniería de contacto diseñada para el cierre constante. Eliminamos la fricción operativa, asegurando que cada lead sea atendido con precisión quirúrgica.",
            },
            beatC: {
                title: "Arquitectura de Alto Rendimiento",
                subtitle: "El ADN operativo de la nueva era. Infraestructura inteligente para empresas que dominan su mercado.",
            },
            beatD: {
                title1: "Menos procesos.",
                title2: "Más ingresos.",
                title3: "Cero límites.",
                subtitle: "Únete a la élite. Redefine tus límites.",
                btn: "Reserva tu consulta",
            }
        },
        testimonials: {
            title: "Trayectoria Internacional, Ejecución Local",
            subtitle: "Con experiencia en la optimización de sistemas para organizaciones en Europa, Scalia inicia su expansión en República Dominicana con un enfoque claro: ayudar a las empresas a crecer con estructura, simplicidad y control.",
            reviews: [
                {
                    quote: "Escalar con SCALIA nos permitió automatizar tareas clave y aumentar nuestra retención un 40% en solo tres meses.",
                    author: "Elena Rodríguez",
                    role: "Directora de Operaciones, TechFlow",
                },
                {
                    quote: "La transición fue perfecta. La infraestructura ahora soporta 10 veces el tráfico inicial sin una sola caída.",
                    author: "Marc Dupont",
                    role: "CTO, Innova Solutions",
                },
                {
                    quote: "No solo optimizaron nuestra plataforma, sentaron las bases para nuestro crecimiento en toda Europa.",
                    author: "Laura Fernández",
                    role: "CEO, Nexo Digital",
                }
            ]
        },
        sales: {
            tag: "El momento es ahora",
            title: "El estándar operativo de la nueva era.",
            subtitle: "Sincronice su visión con nuestra arquitectura de flujo. Descubra el potencial real de su estructura en una sesión estratégica exclusiva.",
            btnPrimary: "Reserva una consulta",
            btnSecondary: "Ver Casos de Éxito",
        },
        about: {
            title: "Diseñamos sistemas para crecer con claridad",
            subtitle: "",
            p1: "Scalia nace de una visión compartida entre dos hermanos en Toulouse, uno de los principales centros europeos de ingeniería aeroespacial. Nuestra base combina tecnología, organización y experiencia real en entornos exigentes.",
            p2: "Con más de una década de experiencia liderando equipos y operaciones en contextos de alta responsabilidad, aprendimos que el rendimiento sostenible no depende de la improvisación, sino de sistemas claros y bien estructurados.",
            p3: "Hoy trasladamos esa misma filosofía al mundo empresarial: ayudamos a las organizaciones a diseñar, optimizar y automatizar su estructura digital para trabajar con más claridad, eficiencia y control.",
            p4: "En Scalia no se trata solo de implementar herramientas, sino de construir sistemas sólidos que permitan a las empresas crecer con estabilidad y confianza."
        },
        projects: {
            title: "Ingeniería de Flujo y Presencia",
            subtitle: "",
            features: [
                {
                    title: "01. Arquitectura Visual & Conversión",
                    tag: "Web Design",
                    desc: "La credibilidad de su empresa se decide en los primeros 3 segundos. Diseñamos interfaces de alta fidelidad que proyectan autoridad inmediata.",
                    points: [
                        { name: "Diseño estratégico", text: "Estética minimalista y funcional orientada a la claridad visual, la experiencia del usuario y la conversión." },
                        { name: "Sistemas de Identidad", text: "Creamos el lenguaje visual que posiciona a su marca en el sector Premium." }
                    ]
                },
                {
                    title: "02. Ecosistemas de Ejecución Autónoma",
                    tag: "Automatización",
                    desc: "Detrás de cada interfaz de lujo, instalamos una maquinaria invisible que gestiona el crecimiento por usted. Estos son los flujos que blindamos en cada implementación:",
                    points: [
                        { name: "Onboarding Automatizado", text: "Recepción y activación de nuevos clientes mediante un proceso claro y estructurado, sin fricción operativa." },
                        { name: "Ciclo Comercial Inteligente", text: "Generación y envío automatizado de presupuestos vinculados a su flujo operativo y administrativo." },
                        { name: "Gestión Financiera Optimizada", text: "Emisión de facturación y confirmación automática de pagos en tiempo real." },
                        { name: "Gestión Operativa Centralizada", text: "Seguimiento de proyectos y tareas con una visión clara del avance y notificaciones automáticas para el equipo." }
                    ]
                },
                {
                    title: "03. Trayectoria & Validación",
                    tag: "Operaciones",
                    desc: "Nuestra metodología ha sido desarrollada en entornos de alta exigencia, combinando experiencia operativa e innovación tecnológica.",
                    points: [
                        { name: "15 organizaciones en Europa", text: "Experiencia acompañando a empresas en la optimización de procesos y sistemas para mejorar su funcionamiento diario." }
                    ]
                }
            ]
        },
        meta: {
            title: "SCALIA | Ingeniería de Infraestructura Digital",
            description: "Ingeniería de sistemas y automatización inteligente para empresas en hipercrecimiento.",
        },
        footer: {
            copy: "© 2026 Scalia. Todos los derechos reservados.",
            tag: "Hecho con rigor y precisión."
        },
        zeroRisk: {
            badge: "Disponibilidad a partir del 30 de marzo",
            title: "En Scalia creemos que la eficiencia nace de sistemas claros, simples y bien estructurados.",
            subtitle: "Actualmente buscamos 3 empresas en República Dominicana 🇩🇴 para implementar nuestro modelo de optimización operativa.",
            offerTitle: "Oferta de implementación sin riesgo",
            offerDesc: "",
            points: [
                {
                    title: "Despliegue completo",
                    desc: "Diseñamos y automatizamos su infraestructura operativa sin coste inicial."
                },
                {
                    title: "Garantía de resultados",
                    desc: "Si el sistema implementado no cumple con los estándares definidos, no tendrá ningún coste."
                },
                {
                    title: "Compromiso mutuo",
                    desc: "Si el sistema mejora su operativa y queda plenamente satisfecho, solo le pediremos un testimonio en video sobre su experiencia con nuestra metodología."
                }
            ]
        },
        contact: {
            title: "Contacto",
            subtitle: "Buscamos 3 empresas en República Dominicana para implementar nuestro sistema operativo. Complete el formulario y nos pondremos en contacto.",
            fields: {
                name: "Nombre y apellido",
                company: "Empresa",
                role: "Cargo / Rol",
                email: "Email profesional",
                phone: "Teléfono (opcional)",
                website: "Sitio web o redes sociales (opcional)",
                size: "Tamaño de la empresa",
                sizeOptions: {
                    s1: "1–5 empleados",
                    s2: "6–15 empleados",
                    s3: "16–50 empleados",
                    s4: "50+"
                },
                optimization: "¿Qué desea optimizar?",
                additional: "Mensaje adicional (opcional)",
                terms: "Acepto ser contactado por el equipo de Scalia."
            },
            submit: "Enviar solicitud",
            success: "Gracias. Revisaremos su solicitud y le contactaremos si su empresa encaja con esta fase de implementación.",
            skipBooking: "Omitir este paso y volver al inicio",
            footerNote: "O también puede escribirnos directamente:",
            emailLink: "contact@scalia.do"
        }
    },
    fr: {
        nav: {
            about: "À propos",
            work: "Projets",
            contact: "Contact",
        },
        hero: {
            scroll: "Faites défiler pour découvrir",
            beatA: {
                title: "Ingénierie de systèmes pour l'hypercroissance.",
                subtitle: "Nous éliminons les processus manuels pour que votre entreprise évolue en pilote automatique.",
            },
            beatB: {
                title: "Blindage du Flux Commercial",
                subtitle: "Ingénierie de contact conçue pour une conclusion constante. Nous éliminons les frictions opérationnelles, garantissant que chaque prospect est traité avec une précision chirurgicale.",
            },
            beatC: {
                title: "Architecture Haute Performance",
                subtitle: "L'ADN opérationnel de la nouvelle ère. Une infrastructure intelligente pour les entreprises qui dominent leur marché.",
            },
            beatD: {
                title1: "Moins de processus.",
                title2: "Plus de revenus.",
                title3: "Zéro limite.",
                subtitle: "Rejoignez l'élite. Redéfinissez vos limites.",
                btn: "Réservez votre consultation",
            }
        },
        testimonials: {
            title: "Trajectoire Internationale, Exécution Locale",
            subtitle: "Forte d'une expérience dans l'optimisation de systèmes pour des organisations en Europe, Scalia entame son expansion en République Dominicaine avec un objectif clair : aider les entreprises à croître avec structure, simplicité et contrôle.",
            reviews: [
                {
                    quote: "Évoluer avec SCALIA nous a permis d'automatiser des tâches clés et d'augmenter notre rétention de 40% en seulement trois mois.",
                    author: "Elena Rodríguez",
                    role: "Directrice des Opérations, TechFlow",
                },
                {
                    quote: "La transition a été parfaite. L'infrastructure supporte maintenant 10 fois le trafic initial sans aucune panne.",
                    author: "Marc Dupont",
                    role: "CTO, Innova Solutions",
                },
                {
                    quote: "Ils n'ont pas seulement optimisé notre plateforme, ils ont jeté les bases de notre croissance à travers toute l'Europe.",
                    author: "Laura Fernández",
                    role: "CEO, Nexo Digital",
                }
            ]
        },
        sales: {
            tag: "Le moment est venu",
            title: "Le standard opérationnel de la nouvelle ère.",
            subtitle: "Synchronisez votre vision avec notre architecture de flux. Découvrez le véritable potentiel de votre structure lors d'une session stratégique exclusive.",
            btnPrimary: "Réserver une consultation",
            btnSecondary: "Voir les cas de réussite",
        },
        about: {
            title: "Nous concevons des systèmes pour croître avec clarté",
            subtitle: "",
            p1: "Scalia est née d'une vision partagée entre deux frères à Toulouse, l'un des principaux centres européens de l'ingénierie aérospatiale. Notre base combine technologie, organisation et expérience réelle dans des environnements exigeants.",
            p2: "Avec plus d'une décennie d'expérience à diriger des équipes et des opérations dans des contextes à haute responsabilité, nous avons appris que la performance durable ne dépend pas de l'improvisation, mais de systèmes clairs et bien structurés.",
            p3: "Aujourd'hui, nous transposons cette même philosophie au monde de l'entreprise : nous aidons les organisations à concevoir, optimiser et automatiser leur structure numérique pour travailler avec plus de clarté, d'efficacité et de contrôle.",
            p4: "Chez Scalia, il ne s'agit pas seulement de mettre en œuvre des outils, mais de construire des systèmes solides qui permettent aux entreprises de croître avec stabilité et confiance."
        },
        projects: {
            title: "Ingénierie de Flux et de Présence",
            subtitle: "",
            features: [
                {
                    title: "01. Architecture Visuelle & Conversion",
                    tag: "Web Design",
                    desc: "La crédibilité de votre entreprise se joue dans les 3 premières secondes. Nous concevons des interfaces haute fidélité qui projettent une autorité immédiate.",
                    points: [
                        { name: "Design Stratégique", text: "Esthétique minimaliste et fonctionnelle orientée vers la clarté visuelle, l'expérience utilisateur et la conversion." },
                        { name: "Systèmes d'Identité", text: "Nous créons le langage visuel qui positionne votre marque dans le secteur Premium." }
                    ]
                },
                {
                    title: "02. Écosystèmes d'Exécution Autonome",
                    tag: "Automatisation",
                    desc: "Derrière chaque interface de luxe, nous installons une machinerie invisible qui gère la croissance pour vous. Voici les flux que nous blindons :",
                    points: [
                        { name: "Onboarding Automatisé", text: "Réception et activation de nouveaux clients via un processus clair et structuré, sans friction opérationnelle." },
                        { name: "Cycle Commercial Intelligent", text: "Génération et envoi automatisés de devis liés à votre flux opérationnel et administratif." },
                        { name: "Gestion Financière Optimisée", text: "Émission de facturation et confirmation automatique des paiements en temps réel." },
                        { name: "Gestion Opérationnelle Centralisée", text: "Suivi des projets et des tâches avec une vision claire de l'avancement et notifications automatiques pour l'équipe." }
                    ]
                },
                {
                    title: "03. Trajectoire & Validation",
                    tag: "Opérations",
                    desc: "Notre méthodologie a été développée dans des environnements très exigeants, combinant expérience opérationnelle et innovation technologique.",
                    points: [
                        { name: "15 organisations en Europe", text: "Expérience dans l'accompagnement des entreprises dans l'optimisation des processus et des systèmes pour améliorer leur fonctionnement quotidien." }
                    ]
                }
            ]
        },
        meta: {
            title: "SCALIA | Ingénierie d'Infrastructure Numérique",
            description: "Ingénierie de systèmes et automatisation intelligente pour les entreprises en hypercroissance.",
        },
        footer: {
            copy: "© 2026 Scalia. Tous droits réservés.",
            tag: "Fait avec rigueur et précision."
        },
        zeroRisk: {
            badge: "Disponibilité à partir du 30 mars",
            title: "Chez Scalia, nous croyons que l'efficacité naît de systèmes clairs, simples et bien structurés.",
            subtitle: "Nous recherchons actuellement 3 entreprises en République Dominicaine 🇩🇴 pour mettre en œuvre notre modèle d'optimisation opérationnelle.",
            offerTitle: "Offre d'implémentation sans risque",
            offerDesc: "",
            points: [
                {
                    title: "Déploiement complet",
                    desc: "Nous concevons et automatisons votre infrastructure opérationnelle sans coût initial."
                },
                {
                    title: "Garantie de résultats",
                    desc: "Si le système implémenté ne répond pas aux normes définies, vous n'aurez aucun coût."
                },
                {
                    title: "Engagement mutuel",
                    desc: "Si le système améliore vos opérations et que vous êtes pleinement satisfait, nous vous demanderons uniquement un témoignage vidéo sur votre expérience avec notre méthodologie."
                }
            ]
        },
        contact: {
            title: "Contact",
            subtitle: "Nous recherchons 3 entreprises en République Dominicaine pour mettre en œuvre notre système d'exploitation. Remplissez le formulaire et nous vous contacterons.",
            fields: {
                name: "Nom et prénom",
                company: "Entreprise",
                role: "Poste / Rôle",
                email: "Email professionnel",
                phone: "Téléphone (optionnel)",
                website: "Site web ou réseaux sociaux (optionnel)",
                size: "Taille de l'entreprise",
                sizeOptions: {
                    s1: "1–5 employés",
                    s2: "6–15 employés",
                    s3: "16–50 employés",
                    s4: "50+"
                },
                optimization: "Que souhaitez-vous optimiser ?",
                additional: "Message supplémentaire (optionnel)",
                terms: "J'accepte d'être contacté par l'équipe de Scalia."
            },
            submit: "Envoyer la demande",
            success: "Merci. Nous examinerons votre demande et vous contacterons si votre entreprise correspond à cette phase d'implémentation.",
            skipBooking: "Passer cette étape et retourner à l'accueil",
            footerNote: "Ou vous pouvez également nous écrire directement :",
            emailLink: "contact@scalia.do"
        }
    },
    en: {
        nav: {
            about: "About Us",
            work: "Work",
            contact: "Contact",
        },
        hero: {
            scroll: "Scroll to Explore",
            beatA: {
                title: "Systems engineering for hypergrowth.",
                subtitle: "We eliminate manual processes so your business scales on autopilot.",
            },
            beatB: {
                title: "Commercial Flow Shielding",
                subtitle: "Contact engineering designed for consistent closing. We eliminate operational friction, ensuring every lead is handled with surgical precision.",
            },
            beatC: {
                title: "High-Performance Architecture",
                subtitle: "The operational DNA of the new era. Intelligent infrastructure for companies that dominate their market.",
            },
            beatD: {
                title1: "Fewer processes.",
                title2: "More revenue.",
                title3: "Zero limits.",
                subtitle: "Join the elite. Redefine your limits.",
                btn: "Book your consultation",
            }
        },
        testimonials: {
            title: "International Trajectory, Local Execution",
            subtitle: "With experience in optimizing systems for organizations in Europe, Scalia begins its expansion in the Dominican Republic with a clear focus: helping companies grow with structure, simplicity, and control.",
            reviews: [
                {
                    quote: "Scaling with SCALIA allowed us to automate key tasks and increase our retention by 40% in just three months.",
                    author: "Elena Rodríguez",
                    role: "Director of Operations, TechFlow",
                },
                {
                    quote: "The transition was seamless. The infrastructure now supports 10 times the initial traffic without a single downtime.",
                    author: "Marc Dupont",
                    role: "CTO, Innova Solutions",
                },
                {
                    quote: "They didn't just optimize our platform, they laid the foundation for our growth across Europe.",
                    author: "Laura Fernández",
                    role: "CEO, Nexo Digital",
                }
            ]
        },
        sales: {
            tag: "The time is now",
            title: "The operational standard of the new era.",
            subtitle: "Synchronize your vision with our flow architecture. Discover the real potential of your structure in an exclusive strategic session.",
            btnPrimary: "Book a consultation",
            btnSecondary: "View Success Stories",
        },
        about: {
            title: "We design systems to grow with clarity",
            subtitle: "",
            p1: "Scalia was born from a shared vision between two brothers in Toulouse, one of the main European centers of aerospace engineering. Our foundation combines technology, organization, and real experience in demanding environments.",
            p2: "With over a decade of experience leading teams and operations in high-responsibility contexts, we learned that sustainable performance does not depend on improvisation, but on clear and well-structured systems.",
            p3: "Today we bring that same philosophy to the business world: we help organizations design, optimize, and automate their digital structure to work with more clarity, efficiency, and control.",
            p4: "At Scalia, it is not just about implementing tools, but about building solid systems that allow companies to grow with stability and confidence."
        },
        projects: {
            title: "Flow and Presence Engineering",
            subtitle: "",
            features: [
                {
                    title: "01. Visual Architecture & Conversion",
                    tag: "Web Design",
                    desc: "Your company's credibility is decided in the first 3 seconds. We design high-fidelity interfaces that project immediate authority.",
                    points: [
                        { name: "Strategic Design", text: "Minimalist and functional aesthetics oriented towards visual clarity, user experience, and conversion." },
                        { name: "Identity Systems", text: "We create the visual language that positions your brand in the Premium sector." }
                    ]
                },
                {
                    title: "02. Autonomous Execution Ecosystems",
                    tag: "Automation",
                    desc: "Behind every luxury interface, we install invisible machinery that manages growth for you. These are the flows we secure:",
                    points: [
                        { name: "Automated Onboarding", text: "Reception and activation of new clients through a clear and structured process, without operational friction." },
                        { name: "Intelligent Commercial Cycle", text: "Automated generation and dispatch of quotes linked to your operational and administrative flow." },
                        { name: "Optimized Financial Management", text: "Invoicing issuance and automatic confirmation of payments in real time." },
                        { name: "Centralized Operational Management", text: "Tracking of projects and tasks with a clear vision of progress and automatic notifications for the team." }
                    ]
                },
                {
                    title: "03. Trajectory & Validation",
                    tag: "Operations",
                    desc: "Our methodology has been developed in highly demanding environments, combining operational experience and technological innovation.",
                    points: [
                        { name: "15 organizations in Europe", text: "Experience accompanying companies in the optimization of processes and systems to improve their daily functioning." }
                    ]
                }
            ]
        },
        meta: {
            title: "SCALIA | Digital Infrastructure Engineering",
            description: "Systems engineering and intelligent automation for hypergrowth companies.",
        },
        footer: {
            copy: "© 2026 Scalia. All rights reserved.",
            tag: "Made with rigor and precision."
        },
        zeroRisk: {
            badge: "Availability starting March 30th",
            title: "At Scalia, we believe efficiency is born from clear, simple, and well-structured systems.",
            subtitle: "We are currently looking for 3 companies in the Dominican Republic 🇩🇴 to implement our operational optimization model.",
            offerTitle: "Risk-free implementation offer",
            offerDesc: "",
            points: [
                {
                    title: "Full deployment",
                    desc: "We design and automate your operational infrastructure with no upfront cost."
                },
                {
                    title: "Results guarantee",
                    desc: "If the implemented system does not meet the defined standards, there will be no cost."
                },
                {
                    title: "Mutual commitment",
                    desc: "If the system improves your operations and you are fully satisfied, we will only ask for a video testimonial about your experience with our methodology."
                }
            ]
        },
        contact: {
            title: "Contact",
            subtitle: "We are looking for 3 companies in the Dominican Republic to implement our operating system. Complete the form and we will contact you.",
            fields: {
                name: "Full Name",
                company: "Company",
                role: "Job Title / Role",
                email: "Professional Email",
                phone: "Phone (optional)",
                website: "Website or Social Media (optional)",
                size: "Company Size",
                sizeOptions: {
                    s1: "1–5 employees",
                    s2: "6–15 employees",
                    s3: "16–50 employees",
                    s4: "50+"
                },
                optimization: "What do you want to optimize?",
                additional: "Additional message (optional)",
                terms: "I agree to be contacted by the Scalia team."
            },
            submit: "Submit Request",
            success: "Thank you. We will review your request and contact you if your company fits with this implementation phase.",
            skipBooking: "Skip this step and return home",
            footerNote: "Or you can also write to us directly:",
            emailLink: "contact@scalia.do"
        }
    },
    it: {
        nav: {
            about: "Chi siamo",
            work: "Progetti",
            contact: "Contatto",
        },
        hero: {
            scroll: "Scorri per esplorare",
            beatA: {
                title: "Ingegneria di sistema per l'ipercrescita.",
                subtitle: "Eliminiamo i processi manuali in modo che la tua azienda cresca col pilota automatico.",
            },
            beatB: {
                title: "Ingegneria di Contatto",
                subtitle: "Progettata per chiusure costanti. Rimuoviamo l'attrito operativo, garantendo che ogni cliente potenziale venga gestito con precisione chirurgica.",
            },
            beatC: {
                title: "Architettura ad Alte Prestazioni",
                subtitle: "Il DNA operativo della nuova era. Infrastruttura intelligente per aziende che dominano il mercato.",
            },
            beatD: {
                title1: "Meno processi.",
                title2: "Più entrate.",
                title3: "Zero limiti.",
                subtitle: "Unisciti all'élite. Ridefinisci i tuoi limiti.",
                btn: "Prenota la tua consulenza",
            }
        },
        testimonials: {
            title: "Traiettoria Internazionale, Esecuzione Locale",
            subtitle: "Con esperienza nell'ottimizzazione di sistemi per organizzazioni in Europa, Scalia inizia la sua espansione nella Repubblica Dominicana con un focus chiaro: aiutare le aziende a crescere con struttura, semplicità e controllo.",
            reviews: [
                {
                    quote: "Crescere con SCALIA ci ha permesso di automatizzare compiti chiave e aumentare la fidelizzazione del 40% in soli tre mesi.",
                    author: "Elena Rodríguez",
                    role: "Direttore delle Operazioni, TechFlow",
                },
                {
                    quote: "La transizione è stata perfetta. L'infrastruttura ora supporta 10 volte il traffico iniziale senza un singolo tempo di inattività.",
                    author: "Marc Dupont",
                    role: "CTO, Innova Solutions",
                },
                {
                    quote: "Non hanno solo ottimizzato la nostra piattaforma, hanno gettato le basi per la nostra crescita in tutta Europa.",
                    author: "Laura Fernández",
                    role: "CEO, Nexo Digital",
                }
            ]
        },
        sales: {
            tag: "Il momento è adesso",
            title: "Lo standard operativo della nuova era.",
            subtitle: "Sincronizza la tua visione con la nostra architettura di flusso. Scopri il vero potenziale della tua struttura in una sessione strategica esclusiva.",
            btnPrimary: "Prenota una consulenza",
            btnSecondary: "Vedi Casi di Successo",
        },
        about: {
            title: "Progettiamo sistemi per crescere con chiarezza",
            subtitle: "",
            p1: "Scalia nasce da una visione condivisa tra due fratelli a Tolosa, uno dei principali centri europei dell'ingegneria aerospaziale. La nostra base combina tecnologia, organizzazione ed esperienza reale in ambienti esigenti.",
            p2: "Con oltre un decennio di esperienza alla guida di team e operazioni in contesti ad alta responsabilità, abbiamo imparato che le prestazioni sostenibili non dipendono dall'improvvisazione, ma da sistemi chiari e ben strutturati.",
            p3: "Oggi portiamo quella stessa filosofia nel mondo degli affari: aiutiamo le organizzazioni a progettare, ottimizzare e automatizzare la loro struttura digitale per lavorare con più chiarezza, efficienza e controllo.",
            p4: "In Scalia non si tratta solo di implementare strumenti, ma di costruire sistemi solidi che permettano alle aziende di crescere con stabilità e fiducia."
        },
        projects: {
            title: "Ingegneria di Flusso e Presenza",
            subtitle: "",
            features: [
                {
                    title: "01. Architettura Visiva & Conversione",
                    tag: "Web Design",
                    desc: "La credibilità della tua azienda si decide nei primi 3 secondi. Progettiamo interfacce ad alta fedeltà che proiettano un'autorità immediata.",
                    points: [
                        { name: "Design Strategico", text: "Estetica minimalista e funzionale orientata alla chiarezza visiva, all'esperienza utente e alla conversione." },
                        { name: "Sistemi di Identità", text: "Creiamo il linguaggio visivo che posiziona il tuo brand nel settore Premium." }
                    ]
                },
                {
                    title: "02. Ecosistemi di Esecuzione Autonoma",
                    tag: "Automazione",
                    desc: "Dietro ogni interfaccia di lusso, installiamo un macchinario invisibile che gestisce la crescita per te. Ecco i flussi che blindiamo:",
                    points: [
                        { name: "Onboarding Automatizzato", text: "Ricezione e attivazione di nuovi clienti attraverso un processo chiaro e strutturato, senza attrito operativo." },
                        { name: "Ciclo Commerciale Intelligente", text: "Generazione e invio automatizzato di preventivi collegati al flusso operativo e amministrativo." },
                        { name: "Gestione Finanziaria Ottimizzata", text: "Emissione di fatture e conferma automatica dei pagamenti in tempo reale." },
                        { name: "Gestione Operativa Centralizzata", text: "Monitoraggio di progetti e attività con una chiara visione dell'avanzamento e notifiche automatiche per il team." }
                    ]
                },
                {
                    title: "03. Traiettoria & Validazione",
                    tag: "Operazioni",
                    desc: "La nostra metodologia è stata sviluppata in ambienti molto esigenti, combinando esperienza operativa e innovazione tecnologica.",
                    points: [
                        { name: "15 organizzazioni in Europa", text: "Esperienza nell'accompagnare le aziende nell'ottimizzazione di processi e sistemi per migliorare il loro funzionamento quotidiano." }
                    ]
                }
            ]
        },
        meta: {
            title: "SCALIA | Ingegneria delle Infrastrutture Digitali",
            description: "Ingegneria di sistema e automazione intelligente per aziende in ipercrescita.",
        },
        footer: {
            copy: "© 2026 Scalia. Tutti i diritti riservati.",
            tag: "Realizzato con rigore e precisione."
        },
        zeroRisk: {
            badge: "Disponibilità dal 30 marzo",
            title: "In Scalia crediamo che l'efficienza nasca da sistemi chiari, semplici e ben strutturati.",
            subtitle: "Attualmente stiamo cercando 3 aziende nella Repubblica Dominicana 🇩🇴 per implementare il nostro modello di ottimizzazione operativa.",
            offerTitle: "Offerta di implementazione senza rischi",
            offerDesc: "",
            points: [
                {
                    title: "Implementazione completa",
                    desc: "Progettiamo e automatizziamo la tua infrastruttura operativa senza costi iniziali."
                },
                {
                    title: "Garanzia di risultati",
                    desc: "Se il sistema implementato non soddisfa gli standard definiti, non ci sarà alcun costo."
                },
                {
                    title: "Impegno reciproco",
                    desc: "Se il sistema migliora le tue operazioni e sei pienamente soddisfatto, ti chiederemo solo una testimonianza video sulla tua esperienza con la nostra metodologia."
                }
            ]
        },
        contact: {
            title: "Contatto",
            subtitle: "Stiamo cercando 3 aziende nella Repubblica Dominicana per implementare il nostro sistema operativo. Compila il modulo e ti contatteremo.",
            fields: {
                name: "Nome e cognome",
                company: "Azienda",
                role: "Qualifica / Ruolo",
                email: "Email professionale",
                phone: "Telefono (opzionale)",
                website: "Sito web o Social Media (opzionale)",
                size: "Dimensioni dell'azienda",
                sizeOptions: {
                    s1: "1–5 dipendenti",
                    s2: "6–15 dipendenti",
                    s3: "16–50 dipendenti",
                    s4: "50+"
                },
                optimization: "Cosa desideri ottimizzare?",
                additional: "Messaggio aggiuntivo (opzionale)",
                terms: "Accetto di essere contattato dal team Scalia."
            },
            submit: "Invia Richiesta",
            success: "Grazie. Esamineremo la tua richiesta e ti contatteremo se la tua azienda è in linea con questa fase di implementazione.",
            skipBooking: "Salta questo passaggio e torna alla home",
            footerNote: "Oppure puoi scriverci direttamente a:",
            emailLink: "contact@scalia.do"
        }
    },
    de: {
        nav: {
            about: "Über uns",
            work: "Projekte",
            contact: "Kontakt",
        },
        hero: {
            scroll: "Scrollen zum Entdecken",
            beatA: {
                title: "System-Engineering für Hyperwachstum.",
                subtitle: "Wir beseitigen manuelle Prozesse, damit Ihr Unternehmen im Autopiloten wächst.",
            },
            beatB: {
                title: "Vertriebsfluss-Absicherung",
                subtitle: "Kontakt-Engineering für konstante Abschlüsse. Wir beseitigen operative Reibung und stellen sicher, dass jeder Lead mit chirurgischer Präzision bearbeitet wird.",
            },
            beatC: {
                title: "Hochleistungsarchitektur",
                subtitle: "Die operative DNA der neuen Ära. Intelligente Infrastruktur für Unternehmen, die ihren Markt dominieren.",
            },
            beatD: {
                title1: "Weniger Prozesse.",
                title2: "Mehr Umsatz.",
                title3: "Keine Limits.",
                subtitle: "Werden Sie Teil der Elite. Definieren Sie Ihre Grenzen neu.",
                btn: "Beratung buchen",
            }
        },
        testimonials: {
            title: "Internationale Laufbahn, Lokale Ausführung",
            subtitle: "Mit Erfahrung in der Optimierung von Systemen für Organisationen in Europa, Scalia beginnt seine Expansion in der Dominikanischen Republik mit einem klaren Fokus: Unternehmen dabei zu helfen, mit Struktur, Einfachheit und Kontrolle zu wachsen.",
            reviews: [
                {
                    quote: "Die Skalierung mit SCALIA hat es uns ermöglicht, wichtige Aufgaben zu automatisieren und unsere Kundenbindung in nur drei Monaten um 40 % zu steigern.",
                    author: "Elena Rodríguez",
                    role: "Director of Operations, TechFlow",
                },
                {
                    quote: "Der Übergang war reibungslos. Die Infrastruktur unterstützt nun das Zehnfache des ursprünglichen Traffics ohne eine einzige Ausfallzeit.",
                    author: "Marc Dupont",
                    role: "CTO, Innova Solutions",
                },
                {
                    quote: "Sie haben nicht nur unsere Plattform optimiert, sondern auch den Grundstein für unser Wachstum in ganz Europa gelegt.",
                    author: "Laura Fernández",
                    role: "CEO, Nexo Digital",
                }
            ]
        },
        sales: {
            tag: "Die Zeit ist jetzt",
            title: "Der operative Standard der neuen Ära.",
            subtitle: "Synchronisieren Sie Ihre Vision mit unserer Flow-Architektur. Entdecken Sie in einer exklusiven Strategie-Session das reale Potenzial Ihrer Struktur.",
            btnPrimary: "Beratung buchen",
            btnSecondary: "Erfolgsgeschichten ansehen",
        },
        about: {
            title: "Wir entwerfen Systeme, um mit Klarheit zu wachsen",
            subtitle: "",
            p1: "Scalia entstand aus einer gemeinsamen Vision zweier Brüder in Toulouse, einem der wichtigsten europäischen Zentren der Luft- und Raumfahrttechnik. Unser Fundament kombiniert Technologie, Organisation und echte Erfahrung in anspruchsvollen Umgebungen.",
            p2: "Mit über einem Jahrzehnt Erfahrung in der Führung von Teams und Operationen in Kontexten mit hoher Verantwortung haben wir gelernt, dass nachhaltige Leistung nicht von Improvisation abhängt, sondern von klaren und gut strukturierten Systemen.",
            p3: "Heute übertragen wir dieselbe Philosophie auf die Geschäftswelt: Wir helfen Organisationen, ihre digitale Struktur zu entwerfen, zu optimieren und zu automatisieren, um mit mehr Klarheit, Effizienz und Kontrolle zu arbeiten.",
            p4: "Bei Scalia geht es nicht nur um die Implementierung von Tools, sondern um den Aufbau solider Systeme, die es Unternehmen ermöglichen, mit Stabilität und Vertrauen zu wachsen."
        },
        projects: {
            title: "Flow- und Präsenz-Engineering",
            subtitle: "",
            features: [
                {
                    title: "01. Visuelle Architektur & Konversion",
                    tag: "Webdesign",
                    desc: "Die Glaubwürdigkeit Ihres Unternehmens entscheidet sich in den ersten 3 Sekunden. Wir entwerfen High-Fidelity-Schnittstellen, die sofortige Autorität ausstrahlen.",
                    points: [
                        { name: "Strategisches Design", text: "Minimalistische und funktionale Ästhetik, ausgerichtet auf visuelle Klarheit, Benutzererfahrung und Konversion." },
                        { name: "Identitätssysteme", text: "Wir kreieren die visuelle Sprache, die Ihre Marke im Premium-Sektor positioniert." }
                    ]
                },
                {
                    title: "02. Autonome Ausführungsökosysteme",
                    tag: "Automatisierung",
                    desc: "Hinter jeder Luxus-Schnittstelle installieren wir eine unsichtbare Maschinerie, die das Wachstum für Sie verwaltet. Dies sind die Prozesse, die wir absichern:",
                    points: [
                        { name: "Automatisiertes Onboarding", text: "Empfang und Aktivierung neuer Kunden durch einen klaren und strukturierten Prozess ohne operative Reibungsverluste." },
                        { name: "Intelligenter Handelszyklus", text: "Automatisierte Erstellung und Versendung von Angeboten, die mit Ihrem operativen und administrativen Fluss verknüpft sind." },
                        { name: "Optimiertes Finanzmanagement", text: "Rechnungsstellung und automatische Bestätigung von Zahlungen in Echtzeit." },
                        { name: "Zentralisiertes operatives Management", text: "Verfolgung von Projekten und Aufgaben mit einem klaren Überblick über den Fortschritt und automatischen Benachrichtigungen für das Team." }
                    ]
                },
                {
                    title: "03. Werdegang & Validierung",
                    tag: "Operationen",
                    desc: "Unsere Methodik wurde in sehr anspruchsvollen Umgebungen entwickelt und kombiniert operative Erfahrung mit technologischer Innovation.",
                    points: [
                        { name: "15 Organisationen in Europa", text: "Erfahrung bei der Begleitung von Unternehmen bei der Optimierung von Prozessen und Systemen zur Verbesserung des täglichen Betriebs." }
                    ]
                }
            ]
        },
        meta: {
            title: "SCALIA | Digitale Infrastrukturtechnik",
            description: "Systemtechnik und intelligente Automatisierung für Hyperwachstumsunternehmen.",
        },
        footer: {
            copy: "© 2026 Scalia. Alle Rechte vorbehalten.",
            tag: "Mit Strenge und Präzision gemacht."
        },
        zeroRisk: {
            badge: "Verfügbarkeit ab dem 30. März",
            title: "Wir bei Scalia glauben, dass Effizienz aus klaren, einfachen und gut strukturierten Systemen entsteht.",
            subtitle: "Wir suchen derzeit 3 Unternehmen in der Dominikanischen Republik 🇩🇴, um unser operatives Optimierungsmodell umzusetzen.",
            offerTitle: "Risikofreies Implementierungsangebot",
            offerDesc: "",
            points: [
                {
                    title: "Vollständige Implementierung",
                    desc: "Wir entwerfen und automatisieren Ihre operative Infrastruktur ohne Vorlaufkosten."
                },
                {
                    title: "Erfolgsgarantie",
                    desc: "Wenn das implementierte System nicht den definierten Standards entspricht, entstehen keine Kosten."
                },
                {
                    title: "Gegenseitiges Bekenntnis",
                    desc: "Wenn das System Ihre Abläufe verbessert und Sie vollauf zufrieden sind, bitten wir Sie lediglich um ein Video-Testimonial über Ihre Erfahrung mit unserer Methodik."
                }
            ]
        },
        contact: {
            title: "Kontakt",
            subtitle: "Wir suchen 3 Unternehmen in der Dominikanischen Republik, um unser Betriebssystem zu implementieren. Füllen Sie das Formular aus und wir werden Sie kontaktieren.",
            fields: {
                name: "Vor- und Nachname",
                company: "Unternehmen",
                role: "Position / Rolle",
                email: "Berufliche E-Mail",
                phone: "Telefon (optional)",
                website: "Website oder Social Media (optional)",
                size: "Unternehmensgröße",
                sizeOptions: {
                    s1: "1–5 Mitarbeiter",
                    s2: "6–15 Mitarbeiter",
                    s3: "16–50 Mitarbeiter",
                    s4: "50+"
                },
                optimization: "Was möchten Sie optimieren?",
                additional: "Zusätzliche Nachricht (optional)",
                terms: "Ich bin damit einverstanden, vom Scalia-Team kontaktiert zu werden."
            },
            submit: "Anfrage senden",
            success: "Danke. Wir prüfen Ihre Anfrage und kontaktieren Sie, sofern Ihr Unternehmen in diese Implementierungsphase passt.",
            skipBooking: "Diesen Schritt überspringen und zur Startseite zurückkehren",
            footerNote: "Oder Sie können uns auch direkt schreiben:",
            emailLink: "contact@scalia.do"
        }
    }
};

export type Dictionary = typeof dictionaries.es;
