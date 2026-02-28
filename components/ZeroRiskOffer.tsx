"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/components/LanguageProvider";

export default function ZeroRiskOffer() {
    const { t } = useLanguage();

    return (
        <section className="w-full bg-white text-black py-24 md:py-32 overflow-hidden border-t border-zinc-100 flex flex-col justify-center relative">

            {/* Extremely subtle background pattern for the white area */}
            <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none" />

            <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10 w-full">

                {/* Header Sequence */}
                <div className="text-center mb-16 md:mb-24">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="inline-flex items-center gap-3 px-5 py-2 rounded-full border border-red-500/50 bg-red-500/5 shadow-[0_0_30px_rgba(239,68,68,0.2)] mb-8 relative group overflow-hidden"
                    >
                        {/* Shimmering sweeping highlight across the badge */}
                        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-red-500/20 to-transparent z-0 pointer-events-none" />

                        {/* Intense Pulsating Red Dot */}
                        <span className="relative flex h-2.5 w-2.5 z-10 shadow-[0_0_12px_rgba(239,68,68,0.8)]">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-80"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
                        </span>

                        <span className="text-xs font-bold tracking-[0.15em] uppercase text-red-600 z-10 drop-shadow-sm">
                            {t.zeroRisk.badge}
                        </span>
                    </motion.div>

                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                        className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight mb-6 leading-[1.15] max-w-4xl mx-auto text-black"
                    >
                        {t.zeroRisk.title}
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                        className="text-lg md:text-xl text-zinc-600 max-w-3xl mx-auto font-light leading-relaxed"
                    >
                        {t.zeroRisk.subtitle}
                    </motion.p>
                </div>

                {/* Offer Container - Redesigned for Premium Readability */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                    className="w-full max-w-6xl mx-auto bg-[#050505] text-white rounded-[2rem] shadow-2xl relative overflow-hidden flex flex-col lg:flex-row group border border-zinc-900"
                >
                    {/* Left: Premium Image */}
                    <div className="w-full lg:w-2/5 h-64 lg:h-auto relative overflow-hidden bg-zinc-900 border-b lg:border-b-0 lg:border-r border-zinc-900">
                        <div className="absolute inset-0 bg-black/20 z-10 group-hover:bg-transparent transition-colors duration-700" />
                        <img
                            src="https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2000&auto=format&fit=crop"
                            alt="Scalia Infrastructure Model"
                            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-[1.03] opacity-80 mix-blend-luminosity"
                        />
                        {/* Gradient overlay to blend with the dark section */}
                        <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-[#050505] via-[#050505]/40 to-transparent z-20" />
                    </div>

                    {/* Right: Content & Points */}
                    <div className="w-full lg:w-3/5 p-8 md:p-12 lg:p-16 relative z-30 flex flex-col justify-center">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/5 blur-[100px] rounded-full pointer-events-none" />

                        <h3 className="text-2xl md:text-3xl font-bold tracking-tight mb-10 text-white">
                            {t.zeroRisk.offerTitle}
                        </h3>

                        {/* Conditionally render offerDesc if present */}
                        {t.zeroRisk.offerDesc && (
                            <p className="text-zinc-400 font-light leading-relaxed mb-8">
                                {t.zeroRisk.offerDesc}
                            </p>
                        )}

                        <div className="flex flex-col gap-10">
                            {t.zeroRisk.points.map((point, idx) => (
                                <div key={idx} className="flex gap-5 relative group/point">
                                    {/* Line connecting points, except for the last one */}
                                    {idx !== t.zeroRisk.points.length - 1 && (
                                        <div className="absolute left-[11px] top-8 bottom-[-40px] w-[1px] bg-red-500/20" />
                                    )}
                                    {/* Point indicator */}
                                    <div className="relative z-10 w-6 h-6 rounded-full border border-red-500/30 bg-[#0a0a0a] flex items-center justify-center shrink-0 mt-1 transition-colors group-hover/point:border-red-500/60">
                                        <div className="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <h4 className="text-xl font-semibold text-white">
                                            {point.title}
                                        </h4>
                                        <p className="text-zinc-400 font-light leading-relaxed">
                                            {point.desc}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>

            </div>
        </section>
    );
}
