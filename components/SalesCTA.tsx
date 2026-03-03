"use client";

import { motion } from "framer-motion";
import { ShimmerButton } from "@/components/ShimmerButton";
import { useLanguage } from "@/components/LanguageProvider";

export default function SalesCTA() {
    const { t, locale } = useLanguage();

    return (
        <section className="w-full bg-white text-black py-40 px-6 md:px-12 flex flex-col items-center justify-center text-center relative overflow-hidden">
            {/* Bottom fade: white → dark */}
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-b from-transparent via-white/60 to-[#050505] z-10" />
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="max-w-4xl mx-auto"
            >
                <span className="text-sm font-semibold tracking-[0.2em] text-zinc-400 uppercase mb-6 block">
                    {t.sales.tag}
                </span>
                <h2 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight mb-8 leading-[1.1] max-w-4xl mx-auto">
                    {t.sales.title}
                </h2>
                <p className="text-xl md:text-2xl text-zinc-500 font-light mb-16 max-w-2xl mx-auto">
                    {t.sales.subtitle}
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-8">
                    <button onClick={() => {
                        // @ts-expect-error Calendly is injected externally
                        if (window.Calendly) window.Calendly.initPopupWidget({ url: 'https://calendly.com/contact-scalia?primary_color=000000&locale=' + locale });
                    }}>
                        <ShimmerButton
                            className="w-full sm:w-auto text-sm uppercase tracking-widest font-bold shadow-xl shadow-black/10 transition-transform hover:scale-105"
                            background="#050505"
                            shimmerColor="#ffffff"
                        >
                            <span>{t.sales.btnPrimary}</span>
                        </ShimmerButton>
                    </button>
                </div>
            </motion.div>
        </section>
    );
}
