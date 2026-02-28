"use client";

import { useLanguage } from "./LanguageProvider";
import { Locale, localeFlags } from "@/lib/dictionaries";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function LanguageSwitcher() {
    const { locale, setLocale } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const locales: Locale[] = ["es", "fr", "en", "it", "de"];

    // Close menu on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 text-xl hover:scale-110 transition-transform duration-300"
                aria-label="Select Language"
            >
                <span>{localeFlags[locale]}</span>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute right-0 mt-4 py-2 bg-[#111111]/90 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl flex flex-col gap-1 min-w-[120px]"
                    >
                        {locales.map((l) => (
                            <button
                                key={l}
                                onClick={() => {
                                    setLocale(l);
                                    setIsOpen(false);
                                }}
                                className={`flex items-center gap-3 px-4 py-2 hover:bg-white/10 transition-colors text-sm font-medium ${locale === l ? "text-white" : "text-white/50"
                                    }`}
                            >
                                <span className="text-xl">{localeFlags[l]}</span>
                                <span className="uppercase tracking-widest">{l}</span>
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
