"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function Navbar({ forceDark = false }: { forceDark?: boolean }) {
    const { t } = useLanguage();
    const [scrolled, setScrolled] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Prevent scrolling when mobile menu is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    const isDark = scrolled || forceDark || isOpen;

    return (
        <motion.nav
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-500 ${isDark ? "bg-[#050505]/90 backdrop-blur-md py-4" : "bg-transparent py-4 md:py-6"
                }`}
        >
            <div className="max-w-7xl mx-auto px-6 md:px-12 flex justify-between items-center">
                <Link href="/" className="flex items-center gap-2 relative z-50" onClick={() => setIsOpen(false)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo.png" alt="SCALIA Logo" className="h-8 md:h-12 w-auto object-contain" />
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-6">
                    <Link href="/sobre-nosotros" className="text-white/60 hover:text-white text-sm transition-colors uppercase tracking-widest">
                        {t.nav.about}
                    </Link>
                    <Link href="/proyectos" className="text-white/60 hover:text-white text-sm transition-colors uppercase tracking-widest">
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

                {/* Mobile Controls (Language + Hamburger) */}
                <div className="flex md:hidden items-center gap-4 relative z-50">
                    <LanguageSwitcher />
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="text-white p-2 -mr-2 flex flex-col justify-center items-center w-8 h-8 focus:outline-none"
                        aria-label="Toggle menu"
                    >
                        <span className={`bg-white block transition-all duration-300 ease-out h-[2px] w-6 rounded-sm ${isOpen ? 'rotate-45 translate-y-[5px]' : '-translate-y-1'}`}></span>
                        <span className={`bg-white block transition-all duration-300 ease-out h-[2px] w-6 rounded-sm my-[2px] ${isOpen ? 'opacity-0' : 'opacity-100'}`}></span>
                        <span className={`bg-white block transition-all duration-300 ease-out h-[2px] w-6 rounded-sm ${isOpen ? '-rotate-45 -translate-y-[5px]' : 'translate-y-1'}`}></span>
                    </button>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="md:hidden fixed inset-0 top-[60px] h-[calc(100vh-60px)] bg-[#050505] flex flex-col justify-between px-6 pb-12 pt-8"
                    >
                        <div className="flex flex-col gap-8 text-center mt-8">
                            <Link
                                href="/sobre-nosotros"
                                onClick={() => setIsOpen(false)}
                                className="text-3xl text-white font-semibold transition-colors uppercase tracking-widest"
                            >
                                {t.nav.about}
                            </Link>
                            <div className="w-12 h-[1px] bg-white/20 mx-auto"></div>
                            <Link
                                href="/proyectos"
                                onClick={() => setIsOpen(false)}
                                className="text-3xl text-white font-semibold transition-colors uppercase tracking-widest"
                            >
                                {t.nav.work}
                            </Link>
                            <div className="w-12 h-[1px] bg-white/20 mx-auto"></div>
                            <Link
                                href="/contacto"
                                onClick={() => setIsOpen(false)}
                                className="text-3xl text-white font-semibold transition-colors uppercase tracking-widest"
                            >
                                {t.nav.contact}
                            </Link>
                        </div>

                        <div className="text-center text-white/40 text-xs mt-12 mb-8">
                            SCALIA AI © {new Date().getFullYear()}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.nav>
    );
}
