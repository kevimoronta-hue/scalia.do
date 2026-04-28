'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useScroll, useMotionValueEvent, motion, AnimatePresence, type Variants } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/routing';

// SVG flag components (no emoji for nav — UI skill guideline)
const FlagDO = () => (
  <svg width="22" height="16" viewBox="0 0 22 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="22" height="16" rx="2" fill="white"/>
    {/* Top-left: blue */}
    <rect x="0" y="0" width="10" height="7" fill="#002D62"/>
    {/* Top-right: red */}
    <rect x="12" y="0" width="10" height="7" fill="#CF142B"/>
    {/* Bottom-left: red */}
    <rect x="0" y="9" width="10" height="7" fill="#CF142B"/>
    {/* Bottom-right: blue */}
    <rect x="12" y="9" width="10" height="7" fill="#002D62"/>
    {/* White cross horizontal */}
    <rect x="0" y="7" width="22" height="2" fill="white"/>
    {/* White cross vertical */}
    <rect x="10" y="0" width="2" height="16" fill="white"/>
    {/* Coat of arms placeholder */}
    <circle cx="11" cy="8" r="2" fill="#002D62" opacity="0.8"/>
  </svg>
);

const FlagUS = () => (
  <svg width="22" height="16" viewBox="0 0 22 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="22" height="16" rx="2" fill="#B22234"/>
    <rect y="1.23" width="22" height="1.23" fill="white"/>
    <rect y="3.69" width="22" height="1.23" fill="white"/>
    <rect y="6.15" width="22" height="1.23" fill="white"/>
    <rect y="8.62" width="22" height="1.23" fill="white"/>
    <rect y="11.08" width="22" height="1.23" fill="white"/>
    <rect y="13.54" width="22" height="1.23" fill="white"/>
    <rect width="9" height="8.62" rx="0" fill="#3C3B6E"/>
  </svg>
);

const FlagFR = () => (
  <svg width="22" height="16" viewBox="0 0 22 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="22" height="16" rx="2" fill="white"/>
    <rect width="7.33" height="16" rx="0" fill="#002395"/>
    <rect x="14.67" width="7.33" height="16" rx="0" fill="#ED2939"/>
  </svg>
);

const localeConfig: Record<string, { label: string; Flag: React.FC }> = {
  es: { label: 'Español', Flag: FlagDO },
  en: { label: 'English', Flag: FlagUS },
  fr: { label: 'Français', Flag: FlagFR },
};

// Shared animation spec — same Glass effect as burger menu
const glassVariants: Variants = {
  hidden: {
    opacity: 0,
    y: -16,
    scale: 0.95,
    filter: 'blur(10px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as any },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.95,
    filter: 'blur(10px)',
    transition: { duration: 0.2, ease: [0.32, 0, 0.67, 0] as any },
  },
};

export default function GhostNav() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const pathname = usePathname();
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('GhostNav');
  const navRef = useRef<HTMLElement>(null);

  const switchLocale = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
    setLangMenuOpen(false);
    setMenuOpen(false);
  };

  // Close menus on outside click (mobile UX)
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, []);

  useMotionValueEvent(scrollY, 'change', (latest) => {
    const isHome = pathname === '/';
    const threshold = isHome 
      ? (typeof window !== 'undefined' ? window.innerHeight * 2.8 : 2000) 
      : 50;
    setScrolled(latest > threshold);
  });

  const ActiveFlag = localeConfig[locale]?.Flag || FlagDO;

  return (
    <header
      ref={navRef}
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${
        scrolled
          ? 'py-4 bg-black/80 backdrop-blur-3xl border-b border-white/5 shadow-2xl'
          : 'py-6 bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex justify-between md:justify-end items-center relative w-full h-[70px]">

        {/* ===== Language Switcher ===== */}
        <div className="relative z-50 order-first md:order-last">
          {/* Trigger button — 44×44pt touch target (UI skill rule) */}
          <button
            onClick={() => {
              setLangMenuOpen((prev) => !prev);
              setMenuOpen(false);
            }}
            className="w-11 h-11 flex items-center justify-center cursor-pointer rounded-xl hover:bg-white/5 active:scale-95 transition-all duration-200"
            aria-label="Changer de langue"
            aria-expanded={langMenuOpen}
          >
            <span className="flex items-center gap-1.5">
              <ActiveFlag />
              <svg
                width="10" height="10" viewBox="0 0 10 10" fill="none"
                className={`text-white/40 transition-transform duration-300 ${langMenuOpen ? 'rotate-180' : ''}`}
              >
                <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </button>

          {/* Glass dropdown — same animation as burger menu */}
          <AnimatePresence>
            {langMenuOpen && (
              <motion.div
                variants={glassVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="absolute top-full left-0 mt-2 w-[160px]"
              >
                {/* Glass Panel */}
                <div className="bg-[#111111]/60 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.8)] overflow-hidden">
                  <div className="flex flex-col py-3 px-2 gap-1">
                    {Object.entries(localeConfig)
                      .filter(([l]) => l !== locale)
                      .map(([l, { label, Flag }]) => (
                        <button
                          key={l}
                          onClick={() => switchLocale(l)}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:text-white hover:bg-white/8 active:scale-95 transition-all duration-200 cursor-pointer text-left w-full min-h-[44px]"
                        >
                          <Flag />
                          <span className="font-sans text-xs tracking-[0.2em] uppercase font-medium">
                            {label}
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Logo SCALIA — hard reload + scroll to top */}
        <a
          href={`/${locale}`}
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'auto' });
            // Hard reload to homepage in current locale
            window.location.href = `/${locale}`;
          }}
          className="hover:opacity-80 transition-opacity absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 md:static md:translate-x-0 md:translate-y-0 md:mr-auto w-[140px] h-[70px] z-[60] cursor-pointer"
        >
          <Image
            src="/logo.png"
            alt="SCALIA Logo"
            fill
            className="object-contain drop-shadow-xl"
            priority
          />
        </a>

        {/* PC LINKS (Hidden on mobile) */}
        <div className="hidden md:flex items-center gap-8 mr-6 z-50">
          <Link href="/about" className="text-sm tracking-[0.3em] uppercase font-light text-white/80 hover:text-white transition-colors">
            {t('about')}
          </Link>
          <Link href="/contact" className="text-sm tracking-[0.3em] uppercase font-light text-white/80 hover:text-white transition-colors">
            {t('contact')}
          </Link>
        </div>

        {/* Burger button */}
        <button
          onClick={() => {
            setMenuOpen((prev) => !prev);
            setLangMenuOpen(false);
          }}
          className="md:hidden text-white p-2 z-50 relative group w-11 h-11 flex items-center justify-center"
          aria-label="Toggle Menu"
          aria-expanded={menuOpen}
        >
          <div className="w-6 flex flex-col justify-center items-end gap-[5px]">
            <motion.span
              animate={menuOpen ? { rotate: 45, y: 7, width: '100%' } : { rotate: 0, y: 0, width: '100%' }}
              className="h-[1.5px] bg-white block rounded-full group-hover:bg-gold-light transition-colors"
            />
            <motion.span
              animate={menuOpen ? { opacity: 0, x: -8 } : { opacity: 1, x: 0 }}
              className="h-[1.5px] bg-white block rounded-full w-4 group-hover:bg-gold-light transition-colors"
            />
            <motion.span
              animate={menuOpen ? { rotate: -45, y: -7, width: '100%' } : { rotate: 0, y: 0, width: '100%' }}
              className="h-[1.5px] bg-white block rounded-full group-hover:bg-gold-light transition-colors"
            />
          </div>
        </button>
      </div>

      {/* Smart Glass Menu — same style as lang dropdown */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            variants={glassVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute top-full left-0 w-full overflow-hidden px-4 pt-2 pb-6"
          >
            <div className="bg-[#111111]/60 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.8)] mx-auto overflow-hidden">
              <div className="flex flex-col py-8 px-8 gap-4 items-center text-center">
                <Link
                  href="/about"
                  onClick={() => setMenuOpen(false)}
                  className={`text-sm tracking-[0.3em] uppercase font-light transition-all duration-300 w-full py-4 rounded-xl min-h-[52px] flex items-center justify-center ${
                    pathname.includes('about')
                      ? 'bg-gold-base/10 text-gold-base border border-gold-base/20'
                      : 'text-white/80 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {t('about')}
                </Link>

                <div className="w-16 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent" />

                <Link
                  href="/contact"
                  onClick={() => setMenuOpen(false)}
                  className={`text-sm tracking-[0.3em] uppercase font-light transition-all duration-300 w-full py-4 rounded-xl min-h-[52px] flex items-center justify-center ${
                    pathname.includes('contact')
                      ? 'bg-gold-base/10 text-gold-base border border-gold-base/20'
                      : 'text-white/80 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {t('contact')}
                </Link>

                <div className="w-16 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
