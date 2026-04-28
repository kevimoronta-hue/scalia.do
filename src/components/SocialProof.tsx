'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';

export default function SocialProof() {
  const t = useTranslations('SocialProof');

  const baseLogos = [
    { src: "/logos/warmup.png", alt: "THE-WARMUP.IO", width: 280, extraClass: "" },
    { src: "/logos/bhevia.png", alt: "Bhevia pharma", width: 240, extraClass: "" },
    { src: "/logos/dora.png", alt: "Dora Electroservices", width: 220, extraClass: "" },
    { src: "/logos/verticalview.png", alt: "Vertical View", width: 240, extraClass: "" },
  ];

  // We multiply the base array by 4 to ensure it's wide enough for ultra-wide screens.
  const logos = [...baseLogos, ...baseLogos, ...baseLogos, ...baseLogos];

  return (
    <section className="py-24 md:py-36 bg-black border-t border-white/5 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 mb-16 md:mb-20 text-center flex flex-col items-center">
        <span className="text-white/80 font-sans text-xs md:text-sm tracking-[0.4em] uppercase font-medium mb-6">
          {t('subtitle')}
        </span>
        <div className="w-20 h-[1px] bg-gradient-gold mx-auto" />
      </div>

      <div className="relative w-full flex overflow-x-hidden">
        {/* Gradients to fade edges */}
        <div className="absolute top-0 bottom-0 left-0 w-32 md:w-64 bg-gradient-to-r from-[#050505] to-transparent z-10" />
        <div className="absolute top-0 bottom-0 right-0 w-32 md:w-64 bg-gradient-to-l from-[#050505] to-transparent z-10" />

        <style>{`
          @keyframes infiniteScroll {
            0% { transform: translate3d(0, 0, 0); }
            100% { transform: translate3d(-25%, 0, 0); }
          }
          .marquee-container {
            animation: infiniteScroll 35s linear infinite;
            will-change: transform;
          }
        `}</style>

        <div className="flex w-max gap-20 md:gap-40 px-12 items-center marquee-container">
          {logos.map((logo, idx) => (
            <div 
              key={idx} 
              className="flex items-center justify-center min-w-[160px] md:min-w-[280px]"
            >
              <img 
                src={logo.src} 
                alt={logo.alt} 
                style={{ width: logo.width }} 
                className={`hover:scale-105 transition-all duration-500 object-contain h-auto max-h-20 md:max-h-28 opacity-100 ${logo.extraClass}`}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
