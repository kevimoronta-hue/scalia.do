"use client";

import Image from "next/image";
import { useLanguage } from "@/components/LanguageProvider";
import { useState, useEffect } from "react";

export default function CalendlyWidget() {
    const { locale } = useLanguage();
    const [isVisible, setIsVisible] = useState(false);

    const textMap: Record<string, string> = {
        es: "Programe una auditoría con Scalia",
        fr: "Planifiez un audit avec Scalia",
        en: "Schedule an audit with Scalia",
        it: "Programma un audit con Scalia",
        de: "Buchen Sie ein Audit mit Scalia"
    };

    useEffect(() => {
        const handleScroll = () => {
            // Show widget after scrolling past the hero sequence (approx 1 viewports)
            if (window.scrollY > window.innerHeight * 1.0) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };

        // Initial check
        handleScroll();

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const openCalendly = () => {
        window.open('https://calendar.app.google/vD24jBuWwThDGF8u5', '_blank');
    };

    return (
        <>
            <div className={"fixed bottom-6 right-6 z-[100] md:bottom-8 md:right-8 transition-all duration-700 " + (isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none')}>
                <button
                    onClick={openCalendly}
                    className="relative group flex items-center p-[2px] rounded-full overflow-hidden bg-black shadow-[0_4px_25px_rgba(220,38,38,0.25)] hover:shadow-[0_6px_30px_rgba(220,38,38,0.4)] transition-all duration-500 hover:scale-[1.02] active:scale-95"
                >
                    {/* Animated Red Orbiting Line / Dot */}
                    <div className="absolute inset-[-1000%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#000000_0%,#000000_80%,#ef4444_100%)] group-hover:bg-[conic-gradient(from_90deg_at_50%_50%,#000000_0%,#000000_60%,#ef4444_100%)] transition-all duration-500" />

                    {/* Inner Button Box */}
                    <div className="relative flex items-center justify-center gap-3 bg-[#0A0A0A] rounded-full px-4 md:px-5 py-3 md:py-3 z-10 w-full h-full border border-red-500/10 group-hover:border-red-500/30 transition-colors duration-500">
                        {/* Logo */}
                        <div className="relative w-4 h-5 flex-shrink-0">
                            <Image
                                src="/logo-red.png"
                                alt="Scalia Logo"
                                fill
                                className="object-contain"
                            />
                        </div>

                        {/* Mobile: Phone Icon Only */}
                        <div className="md:hidden flex items-center border-l w-5 border-white/20 pl-3 ml-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/90">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                            </svg>
                        </div>

                        {/* Desktop: Full Text */}
                        <span className="hidden md:inline-block text-white text-sm font-semibold tracking-wide md:text-base pr-1">
                            {textMap[locale] || textMap.es}
                        </span>
                    </div>
                </button>
            </div>
        </>
    );
}
