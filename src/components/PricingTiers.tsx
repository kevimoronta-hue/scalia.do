'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, Clapperboard, Star, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function PricingTiers() {
  const t = useTranslations('PricingTiers');
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    // Detect desktop screens to conditionally apply stagger delay
    const checkSize = () => setIsDesktop(window.innerWidth >= 1024);
    checkSize(); // Initial check
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  const tiers = [
    {
      id: 0,
      name: t('tier1Name'),
      subtitle: t('tier1Subtitle'),
      desc: t('tier1Desc'),
      features: [
        { title: t('tier1F1Title'), text: t('tier1F1Text') },
        { title: t('tier1F2Title'), text: t('tier1F2Text') },
        { title: t('tier1F3Title'), text: t('tier1F3Text') },
        { title: t('tier1F4Title'), text: t('tier1F4Text'), icon: <Camera size={16} className="text-white/60" /> }
      ],
      cta: t('tier1CTA'),
      isHighlight: false,
      isPlatinum: false
    },
    {
      id: 1,
      name: t('tier2Name'),
      subtitle: t('tier2Subtitle'),
      desc: t('tier2Desc'),
      features: [
        { title: t('tier2F1Title'), text: t('tier2F1Text') },
        { title: t('tier2F2Title'), text: t('tier2F2Text') },
        { title: t('tier2F3Title'), text: t('tier2F3Text') },
        { title: t('tier2F4Title'), text: t('tier2F4Text'), icon: <Clapperboard size={16} className="text-gold-base" /> }
      ],
      cta: t('tier2CTA'),
      isHighlight: true,
      isPlatinum: false,
      badge: t('tier2Badge')
    },
    {
      id: 2,
      name: t('tier3Name'),
      subtitle: t('tier3Subtitle'),
      desc: t('tier3Desc'),
      features: [
        { title: t('tier3F1Title'), text: t('tier3F1Text') },
        { title: t('tier3F2Title'), text: t('tier3F2Text') },
        { title: t('tier3F3Title'), text: t('tier3F3Text') },
        { title: t('tier3F4Title'), text: t('tier3F4Text'), icon: <Star size={16} className="text-white" /> }
      ],
      cta: t('tier3CTA'),
      isHighlight: false,
      isPlatinum: true
    }
  ];

  return (
    <section className="py-32 px-6 md:px-12 bg-black relative overflow-hidden">
      
      <div className="max-w-7xl mx-auto relative z-10">
        
        <div className="text-center mb-24 max-w-4xl mx-auto flex flex-col items-center">
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl text-white font-light leading-tight mb-8">
            {t('title')} <br className="hidden md:block"/>
            <span className="italic text-gradient-gold font-bold">{t('titleHighlight')}</span>
          </h2>
          <div className="w-20 h-[1px] bg-gradient-gold mx-auto" />
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          {tiers.map((tier, index) => (
            <motion.div 
              key={tier.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ 
                duration: 0.7, 
                ease: [0.22, 1, 0.36, 1], 
                delay: isDesktop ? index * 0.15 : 0 
              }}
              className={`relative flex flex-col h-full bg-[#0A0A0A]/80 backdrop-blur-xl border rounded-[2rem] p-8 md:p-10 transition-all duration-500 
                ${tier.isHighlight 
                  ? 'border-gold-base/30 lg:-translate-y-4 lg:scale-105 z-20 bg-gradient-to-b from-[#0A0A0A] to-gold-base/5' 
                  : tier.isPlatinum 
                    ? 'border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.05)] bg-gradient-to-b from-[#0A0A0A] to-white/5' 
                    : 'border-white/10 z-10'
                }`}
            >
              
              {/* Animated Glow for Highlight */}
              {tier.isHighlight && (
                <motion.div 
                  className="absolute inset-0 rounded-[2rem] border-2 border-gold-base/60 pointer-events-none"
                  animate={{ 
                    boxShadow: ["0 0 20px rgba(201,160,80,0.1)", "0 0 60px rgba(201,160,80,0.5)", "0 0 20px rgba(201,160,80,0.1)"],
                    opacity: [0.6, 1, 0.6]
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                />
              )}

              {/* Badge for Highlight */}
              {tier.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-gold text-black text-[10px] font-sans tracking-[0.2em] uppercase font-bold py-2 px-6 rounded-full shadow-[0_0_20px_rgba(201,160,80,0.4)]">
                    {tier.badge}
                  </span>
                </div>
              )}

              {/* Platinum Badge */}
              {tier.isPlatinum && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-white text-black text-[10px] font-sans tracking-[0.2em] uppercase font-bold py-2 px-6 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.5)]">
                    {t('elite')}
                  </span>
                </div>
              )}

              <div className="flex flex-col flex-grow">
                {/* Tier Title */}
                <h3 className={`font-display text-2xl md:text-3xl mb-8 text-center ${tier.isHighlight ? 'text-gold-base' : 'text-white'}`}>
                  {tier.name}
                </h3>

                <p className="font-sans text-white/70 text-sm md:text-base leading-relaxed mb-10 min-h-[60px] text-center">
                  {tier.desc}
                </p>

                {/* Features List */}
                <div className="flex-grow">
                  <span className="text-xs font-sans tracking-widest uppercase text-white/30 block mb-6 border-b border-white/10 pb-4">{t('featuresLabel')}</span>
                  <ul className="space-y-6 mb-12">
                    {tier.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-4">
                        <div className="mt-1 shrink-0">
                          {feature.icon ? feature.icon : <Check size={16} className={tier.isHighlight ? "text-gold-base" : "text-white/40"} />}
                        </div>
                        <div className="flex flex-col">
                          <span className={`font-sans font-medium text-sm md:text-base ${tier.isHighlight ? 'text-white' : 'text-white/90'}`}>{feature.title}</span>
                          {feature.text && (
                            <span className="text-white/50 text-xs md:text-sm font-light mt-1 leading-relaxed">{feature.text}</span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA Button */}
                <div className="mt-auto">
                  <motion.a 
                    href="https://calendly.com/scalia"
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`block text-center w-full py-5 rounded-full text-xs font-bold tracking-[0.2em] uppercase transition-all duration-500 
                      ${tier.isHighlight 
                        ? 'bg-gradient-gold text-black shadow-[0_0_20px_rgba(201,160,80,0.3)] hover:shadow-[0_0_40px_rgba(201,160,80,0.6)]' 
                        : tier.isPlatinum 
                          ? 'bg-white text-black hover:bg-white/90 shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]'
                          : 'bg-transparent border border-white/20 text-white hover:bg-white/10'
                      }`}
                  >
                    {tier.cta}
                  </motion.a>
                </div>

              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
