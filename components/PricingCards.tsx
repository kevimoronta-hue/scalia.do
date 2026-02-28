import { motion } from "framer-motion";

const tiers = [
    {
        name: "BRONZE",
        subtitle: "Cube en Bronze (Starter)",
        price: "Starter",
        description: "L'essentiel pour démarrer l'automatisation de vos processus.",
        features: ["Audit IA de base", "Automatisation simple", "Support email"],
        accent: "from-amber-700 to-amber-900",
    },
    {
        name: "SILVER",
        subtitle: "Cube en Argent (Growth)",
        price: "Growth",
        description: "Accélérez votre croissance avec des workflows intelligents.",
        features: ["Audit IA complet", "Automatisations multi-canales", "Support prioritaire", "Intégration CRM"],
        accent: "from-slate-400 to-slate-600",
        popular: true,
    },
    {
        name: "GOLD",
        subtitle: "Cube en Or (Enterprise)",
        price: "Enterprise",
        description: "Transformation IA totale pour une scalabilité maximale.",
        features: ["Agent IA dédié", "Développement sur-mesure", "Support 24/7", "Formation des équipes"],
        accent: "from-yellow-400 to-yellow-600",
    },
];

export default function PricingCards() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl mx-auto pointer-events-auto">
            {tiers.map((tier) => (
                <div
                    key={tier.name}
                    className={`relative group rounded-2xl border border-white/10 bg-[#0A0A0A]/80 backdrop-blur-md p-8 overflow-hidden transition-all duration-500 hover:border-white/30 hover:-translate-y-2 ${tier.popular ? 'md:-translate-y-4 md:hover:-translate-y-6 shadow-[0_0_40px_rgba(255,255,255,0.05)] hover:shadow-[0_0_40px_rgba(255,255,255,0.1)]' : ''}`}
                >
                    {tier.popular && (
                        <div className="absolute top-0 right-0 bg-white text-black text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-xl tracking-wider z-10">
                            RECOMMANDÉ
                        </div>
                    )}

                    <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${tier.accent} opacity-70 group-hover:opacity-100 transition-opacity duration-500`} />

                    <h3 className="text-2xl font-bold tracking-tight text-white/90 mb-1">{tier.name}</h3>
                    <p className="text-sm font-medium text-white/40 mb-6">{tier.subtitle}</p>

                    <p className="text-white/60 text-sm mb-8 line-clamp-2 h-10">{tier.description}</p>

                    <ul className="space-y-4 mb-8">
                        {tier.features.map((feature, i) => (
                            <li key={i} className="flex items-start text-sm text-white/70">
                                <svg className="w-5 h-5 mr-3 text-white/30 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                {feature}
                            </li>
                        ))}
                    </ul>

                    <button className={`w-full py-3 px-4 rounded-lg font-medium text-sm transition-all duration-300 ${tier.popular ? 'bg-white text-black hover:bg-white/90' : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'}`}>
                        Commencer
                    </button>
                </div>
            ))}
        </div>
    );
}
