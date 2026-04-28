'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoadingScreen() {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // 1. Démarrer les timers immédiatement en tout premier pour garantir le déverrouillage
    const fadeTimer = setTimeout(() => setFadeOut(true), 1600);
    const unmountTimer = setTimeout(() => {
      setVisible(false);
      try { window.scrollTo(0, 0); } catch(e) {}
    }, 2200);
    
    // 2. Tenter de modifier l'historique et le scroll
    try {
      if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'manual';
      }
      window.scrollTo(0, 0);
    } catch (err) {
      console.warn("Scroll restoration not supported", err);
    }

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(unmountTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-[#050505] transition-opacity duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      aria-hidden="true"
    >
          {/* Subtle ambient glow — same gold as the brand */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#B8860B]/8 blur-[120px]" />
          </div>

          {/* Logo + animated bar */}
          <div className="flex flex-col items-center gap-8 relative z-10">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-[160px] h-[80px]"
            >
              <Image
                src="/logo.png"
                alt="SCALIA"
                fill
                className="object-contain drop-shadow-2xl"
                priority
              />
            </motion.div>

            {/* Gold progress bar */}
            <motion.div
              className="w-[120px] h-[1px] bg-white/10 rounded-full overflow-hidden"
            >
              <motion.div
                className="h-full bg-gradient-to-r from-transparent via-[#B8860B] to-transparent"
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ duration: 1.2, ease: 'easeInOut', repeat: Infinity }}
              />
            </motion.div>
          </div>
    </div>
  );
}
