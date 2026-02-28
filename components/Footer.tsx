"use client";

import { useLanguage } from "@/components/LanguageProvider";

export default function Footer() {
    const { t } = useLanguage();

    return (
        <footer className="w-full bg-[#050505] text-zinc-400 py-8 md:py-10 border-t border-white/5 relative z-50">
            <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center justify-center gap-4 text-xs md:text-sm tracking-wide font-light">
                <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6">
                    <img
                        src="/footer-logo.png"
                        alt="Scalia Logo"
                        className="h-8 md:h-10 w-auto object-contain drop-shadow-sm"
                    />
                    <div className="flex items-center text-center">
                        <span className="text-zinc-300">{t.footer.copy}</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
