"use client";

import Script from "next/script";
import Image from "next/image";
import { useLanguage } from "@/components/LanguageProvider";

export default function CalendlyWidget() {
    const { locale } = useLanguage();

    const textMap: Record<string, string> = {
        es: "Programe una reunión con Scalia",
        fr: "Planifiez une réunion avec Scalia",
        en: "Schedule a meeting with Scalia",
        it: "Programma una riunione con Scalia",
        de: "Buchen Sie ein Meeting mit Scalia"
    };

    const openCalendly = () => {
        // @ts-expect-error
        if (window.Calendly) {
            // @ts-expect-error
            window.Calendly.initPopupWidget({
                url: 'https://calendly.com/contact-scalia?primary_color=000000',
            });
        }
    };

    return (
        <>
            {/* eslint-disable-next-line @next/next/no-css-tags */}
            <link href="https://assets.calendly.com/assets/external/widget.css" rel="stylesheet" />
            <Script
                src="https://assets.calendly.com/assets/external/widget.js"
                strategy="lazyOnload"
            />

            <div className="fixed bottom-6 right-6 z-[100] md:bottom-8 md:right-8">
                <button
                    onClick={openCalendly}
                    className="relative group flex items-center p-[2px] rounded-full overflow-hidden bg-black shadow-[0_4px_25px_rgba(220,38,38,0.25)] hover:shadow-[0_6px_30px_rgba(220,38,38,0.4)] transition-all duration-500 hover:scale-[1.02] active:scale-95"
                >
                    {/* Animated Red Orbiting Line / Dot */}
                    <div className="absolute inset-[-1000%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#000000_0%,#000000_80%,#ef4444_100%)] group-hover:bg-[conic-gradient(from_90deg_at_50%_50%,#000000_0%,#000000_60%,#ef4444_100%)] transition-all duration-500" />

                    {/* Inner Button Box */}
                    <div className="relative flex items-center gap-3 bg-[#0A0A0A] rounded-full px-5 py-3 z-10 w-full h-full border border-red-500/10 group-hover:border-red-500/30 transition-colors duration-500">
                        <div className="relative w-4 h-5 flex-shrink-0">
                            <Image
                                src="/logo-red.png"
                                alt="Scalia Logo"
                                fill
                                className="object-contain"
                            />
                        </div>
                        <span className="text-white text-sm font-semibold tracking-wide md:text-base pr-1">
                            {textMap[locale] || textMap.es}
                        </span>
                    </div>
                </button>
            </div>
        </>
    );
}
