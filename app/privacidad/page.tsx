"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/components/LanguageProvider";
import Navbar from "@/components/Navbar";

import Link from "next/link";

export default function PrivacyPolicyPage() {
    const { t } = useLanguage();

    return (
        <main className="bg-[#030303] text-white min-h-screen">
            <Navbar forceDark />

            {/* Hero Header */}
            <section className="pt-32 pb-16 md:pt-40 md:pb-24 relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[400px] bg-white/[0.02] blur-[120px] rounded-full pointer-events-none" />

                <div className="max-w-4xl mx-auto px-6 md:px-12 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="mb-6"
                    >
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 text-sm transition-colors duration-300"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 12H5" />
                                <path d="M12 19l-7-7 7-7" />
                            </svg>
                            <span className="uppercase tracking-widest text-xs">Home</span>
                        </Link>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                        className="flex items-center gap-3 mb-8"
                    >
                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                        </div>
                        <span className="text-green-500/70 text-xs uppercase tracking-widest font-medium">SSL/TLS</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                        className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight mb-6 leading-[1.1]"
                    >
                        {t.privacyPolicy.title}
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                        className="text-white/30 text-sm uppercase tracking-widest"
                    >
                        {t.privacyPolicy.lastUpdated}
                    </motion.p>
                </div>
            </section>

            {/* Content */}
            <section className="pb-24 md:pb-32">
                <div className="max-w-4xl mx-auto px-6 md:px-12">

                    {/* Introduction */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 md:p-10 mb-12"
                    >
                        <p className="text-white/60 text-base md:text-lg leading-relaxed font-light">
                            {t.privacyPolicy.intro}
                        </p>
                    </motion.div>

                    {/* Sections */}
                    <div className="flex flex-col gap-0">
                        {t.privacyPolicy.sections.map((section: { title: string; content: string }, idx: number) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: idx * 0.05 }}
                                className="border-b border-white/5 py-8 md:py-10 first:pt-0"
                            >
                                <h2 className="text-lg md:text-xl font-bold text-white mb-4 tracking-tight">
                                    {section.title}
                                </h2>
                                <p className="text-white/50 text-sm md:text-base leading-relaxed font-light">
                                    {section.content}
                                </p>
                            </motion.div>
                        ))}
                    </div>

                    {/* Contact CTA */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="mt-16 bg-white/[0.03] border border-white/10 rounded-2xl p-6 md:p-10 text-center"
                    >
                        <div className="flex items-center justify-center gap-2 mb-4">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500/80">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                            <span className="text-green-500/60 text-xs uppercase tracking-widest font-medium">
                                {t.footer.ssl}
                            </span>
                        </div>
                        <a
                            href="mailto:contact@scalia.do"
                            className="text-white/80 hover:text-white text-sm md:text-base transition-colors duration-300 underline underline-offset-4 decoration-white/20 hover:decoration-white/50"
                        >
                            contact@scalia.do
                        </a>
                    </motion.div>
                </div>
            </section>


        </main>
    );
}
