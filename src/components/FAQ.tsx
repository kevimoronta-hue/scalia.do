'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';

export default function FAQ() {
  const t = useTranslations('FAQ');
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    { q: t('q1'), a: t('a1') },
    { q: t('q2'), a: t('a2') },
    { q: t('q3'), a: t('a3') }
  ];

  return (
    <section className="py-24 md:py-32 lg:py-40 px-6 md:px-12 max-w-4xl mx-auto bg-black relative z-10">
      
      <div className="mb-16 text-center flex flex-col items-center">
        <h2 className="font-display text-4xl md:text-5xl lg:text-6xl text-white font-medium tracking-tight mb-8">
          {t('title')}
        </h2>
        <div className="w-20 h-[1px] bg-gradient-gold mx-auto" />
      </div>

      <div className="flex flex-col border-t border-white/10">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          
          return (
            <div key={idx} className="border-b border-white/10">
              <button 
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="w-full py-8 flex items-center justify-between gap-6 text-left group"
              >
                <h3 className={`font-display text-xl md:text-2xl transition-colors duration-300 ${isOpen ? 'text-white' : 'text-white/60 group-hover:text-white/90'}`}>
                  {faq.q}
                </h3>
                <div className={`w-8 h-8 rounded-full border border-white/20 flex items-center justify-center shrink-0 transition-transform duration-500 ${isOpen ? 'rotate-45 border-gold-base text-gold-base bg-gold-base/10' : 'text-white/60'}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </div>
              </button>
              
              <AnimatePresence>
                {isOpen && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="pb-8 text-white/50 font-sans font-light text-sm md:text-base leading-relaxed pr-12">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
