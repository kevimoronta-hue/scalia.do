"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/components/LanguageProvider";

export default function ZeroRiskOffer() {
    const { t } = useLanguage();

    return (
        <section className="w-full bg-[#030303] text-white py-24 md:py-32 overflow-hidden border-t border-white/5 flex flex-col justify-center relative">

            {/* Subtle background glow */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent opacity-50"></div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[500px] bg-red-600/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10 w-full">

                {/* Header Sequence */}
                <div className="text-center mb-16 md:mb-24">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="inline-flex items-center gap-3 px-5 py-2 rounded-full border border-red-500/50 bg-red-500/10 shadow-[0_0_30px_rgba(239,68,68,0.15)] mb-8 relative group overflow-hidden"
                    >
                        <span className="relative flex h-2.5 w-2.5 z-10 shadow-[0_0_12px_rgba(239,68,68,0.8)]">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-80"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
                        </span>
                        <span className="text-xs font-bold tracking-[0.1em] uppercase text-red-500 z-10 drop-shadow-sm">
                            {t.zeroRisk.badge}
                        </span>
                    </motion.div>

                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                        className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight mb-8 leading-[1.15] max-w-4xl mx-auto text-white"
                    >
                        {t.zeroRisk.title}
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                        className="text-lg md:text-2xl text-white/50 max-w-3xl mx-auto font-light leading-relaxed"
                    >
                        {t.zeroRisk.subtitle}
                    </motion.p>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 auto-rows-min">

                    {/* Offer Section (Spans 2 columns on desktop) */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                        className="lg:col-span-2 bg-[#0A0A0A] border border-white/10 rounded-3xl p-8 md:p-12 relative overflow-hidden group hover:border-white/20 transition-colors"
                    >
                        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 blur-[80px] rounded-full pointer-events-none transition-opacity group-hover:opacity-100 opacity-50" />

                        <h3 className="text-2xl md:text-3xl font-bold tracking-tight mb-10 text-white flex items-center gap-4">
                            <span className="w-1.5 h-8 bg-red-600 rounded-full inline-block"></span>
                            {/* @ts-ignore */}
                            {t.zeroRisk.offer.title}
                        </h3>

                        <div className="grid gap-8">
                            {/* @ts-ignore */}
                            {t.zeroRisk.offer.points.map((point: any, idx: number) => (
                                <div key={idx} className="flex flex-col gap-2 relative pl-6 border-l border-white/10">
                                    <div className="absolute left-[-5px] top-1.5 w-2 h-2 rounded-full bg-red-600" />
                                    <h4 className="text-xl font-semibold text-white tracking-wide">
                                        {point.title}
                                    </h4>
                                    <p className="text-white/60 font-light leading-relaxed text-lg">
                                        {point.desc}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Right Column: Conditions & Limits */}
                    <div className="flex flex-col gap-6 md:gap-8 lg:col-span-1">

                        {/* Conditions */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
                            className="bg-[#0A0A0A] border border-white/10 rounded-3xl p-8 relative overflow-hidden flex-1"
                        >
                            <h3 className="text-xl font-bold tracking-tight mb-6 text-white pb-4 border-b border-white/10">
                                {/* @ts-ignore */}
                                {t.zeroRisk.conditions.title}
                            </h3>
                            <ul className="flex flex-col gap-5 text-white/70 font-light text-base leading-relaxed">
                                {/* @ts-ignore */}
                                {t.zeroRisk.conditions.points.map((point: string, idx: number) => (
                                    <li key={idx} className="flex gap-3">
                                        <span className="text-red-500 mt-0.5 opacity-80">✔</span>
                                        <span>{point}</span>
                                    </li>
                                ))}
                            </ul>
                        </motion.div>

                        {/* Limits (Scarcity Banner) */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, ease: "easeOut", delay: 0.5 }}
                            className="bg-gradient-to-br from-red-950/40 to-[#0A0A0A] border border-red-500/20 rounded-3xl p-8 relative overflow-hidden"
                        >
                            <div className="relative z-10 flex flex-col gap-3">
                                <h3 className="text-xl font-bold tracking-wider uppercase text-red-500 flex items-center gap-2">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                    {/* @ts-ignore */}
                                    {t.zeroRisk.limits.title}
                                </h3>
                                {/* @ts-ignore */}
                                <p className="text-white font-medium text-lg leading-snug">
                                    {/* @ts-ignore */}
                                    {t.zeroRisk.limits.desc}
                                </p>
                            </div>
                        </motion.div>

                    </div>

                    {/* Process Section (Full Width Bottom) */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, ease: "easeOut", delay: 0.6 }}
                        className="lg:col-span-3 bg-[#0A0A0A] border border-white/10 rounded-3xl p-8 md:p-12 relative overflow-hidden"
                    >
                        <h3 className="text-2xl md:text-3xl font-bold tracking-tight mb-12 text-white text-center">
                            {/* @ts-ignore */}
                            {t.zeroRisk.process.title}
                        </h3>

                        <div className="flex flex-col lg:flex-row gap-8 lg:gap-4 relative">
                            {/* Desktop timeline connecting line */}
                            <div className="hidden lg:block absolute top-[28px] left-[5%] right-[5%] h-px bg-white/10 z-0"></div>

                            {/* @ts-ignore */}
                            {t.zeroRisk.process.points.map((point: any, idx: number) => (
                                <div key={idx} className="flex-1 flex flex-col items-start lg:items-center relative z-10 group">
                                    {/* Step Number Badge */}
                                    <div className="w-14 h-14 rounded-2xl bg-[#111] border border-white/10 flex items-center justify-center text-xl font-bold text-white mb-6 group-hover:border-red-500/50 group-hover:bg-red-500/10 transition-all shadow-lg">
                                        {idx + 1}
                                    </div>
                                    <h4 className="text-lg font-bold text-white mb-3 lg:text-center">
                                        {point.title.split('. ')[1] || point.title}
                                    </h4>
                                    <p className="text-white/50 text-sm font-light leading-relaxed lg:text-center">
                                        {point.desc}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                </div>

            </div>
        </section>
    );
}
