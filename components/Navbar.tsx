"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function Navbar({ forceDark = false }: { forceDark?: boolean }) {
    const { t } = useLanguage();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const isDark = scrolled || forceDark;

    return (
        <motion.nav
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isDark ? "bg-[#050505]/80 backdrop-blur-md py-4" : "bg-transparent py-6"
                }`}
        >
            <div className="max-w-7xl mx-auto px-6 md:px-12 flex justify-between items-center">
                <Link href="/" className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo.png" alt="SCALIA Logo" className="h-10 md:h-12 w-auto object-contain" />
                </Link>
                <div className="flex items-center gap-6">
                    <Link href="/sobre-nosotros" className="text-white/60 hover:text-white text-sm transition-colors uppercase tracking-widest hidden md:block">
                        {t.nav.about}
                    </Link>
                    <Link href="/proyectos" className="text-white/60 hover:text-white text-sm transition-colors uppercase tracking-widest hidden md:block">
                        {t.nav.work}
                    </Link>
                    <Link
                        href="/contacto"
                        className="text-white/90 border border-white/20 hover:border-white/50 px-5 py-2 rounded-full text-sm transition-all duration-300 uppercase tracking-widest"
                    >
                        {t.nav.contact}
                    </Link>
                    <LanguageSwitcher />
                </div>
            </div>
        </motion.nav>
    );
}
