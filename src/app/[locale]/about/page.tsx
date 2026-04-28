'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import GhostNav from '@/components/GhostNav';
import Footer from '@/components/Footer';

export default function About() {
  const t = useTranslations('About');

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.2 }
    }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
  };

  return (
    <main className="min-h-screen bg-black text-[#F5F5F5] selection:bg-gold-base selection:text-black flex flex-col relative">
      <GhostNav />
      
      {/* Full Screen Image Background with Overlays */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <Image 
          src="/images/adn-bg.jpg" 
          alt="Scalia ADN Background"
          fill
          className="object-cover scale-105"
          priority
        />
        {/* Gradient overlay to ensure text readability */}
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(201,160,80,0.1),_transparent_60%)] pointer-events-none" />
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 md:px-12 pt-40 pb-32 flex-grow flex flex-col items-center justify-center text-center">
        <motion.h1 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="font-display text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[1.1] mb-12 text-white font-light drop-shadow-2xl"
        >
          {t('title1')} <br />
          <span className="italic text-gradient-gold font-bold">{t('titleHighlight')}.</span>
        </motion.h1>
        
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full text-left bg-[#050505]/50 backdrop-blur-2xl p-8 md:p-12 lg:p-16 rounded-[2rem] border border-white/10 shadow-2xl max-w-4xl"
        >
          <motion.p variants={itemVariants} className="text-lg md:text-xl text-white/90 font-light leading-relaxed tracking-wide mb-12">
            {t('intro')}
          </motion.p>

          <div className="space-y-12">
            {/* Pillar 1 */}
            <motion.div variants={itemVariants}>
              <h2 className="font-display text-2xl md:text-3xl text-gold-base mb-4 tracking-wide">
                {t('p1_title')}
              </h2>
              <p className="text-base md:text-lg text-white/70 font-light leading-relaxed mb-4">
                {t('p1_desc')}
              </p>
              <ul className="space-y-2 text-base md:text-lg text-white/80 font-light pl-4 border-l border-gold-base/30">
                <li><strong className="text-white font-medium">{t('p1_sub1').split(':')[0]}:</strong> {t('p1_sub1').split(':')[1]}</li>
                <li><strong className="text-white font-medium">{t('p1_sub2').split(':')[0]}:</strong> {t('p1_sub2').split(':')[1]}</li>
              </ul>
            </motion.div>

            {/* Pillar 2 */}
            <motion.div variants={itemVariants}>
              <h2 className="font-display text-2xl md:text-3xl text-gold-base mb-4 tracking-wide">
                {t('p2_title')}
              </h2>
              <p className="text-base md:text-lg text-white/70 font-light leading-relaxed mb-4">
                {t('p2_desc')}
              </p>
              <ul className="space-y-2 text-base md:text-lg text-white/80 font-light pl-4 border-l border-gold-base/30">
                <li><strong className="text-white font-medium">{t('p2_sub1').split(':')[0]}:</strong> {t('p2_sub1').split(':')[1]}</li>
                <li><strong className="text-white font-medium">{t('p2_sub2').split(':')[0]}:</strong> {t('p2_sub2').split(':')[1]}</li>
              </ul>
            </motion.div>

            {/* Pillar 3 */}
            <motion.div variants={itemVariants}>
              <h2 className="font-display text-2xl md:text-3xl text-gold-base mb-4 tracking-wide">
                {t('p3_title')}
              </h2>
              <p className="text-base md:text-lg text-white/70 font-light leading-relaxed mb-4">
                {t('p3_desc')}
              </p>
              <ul className="space-y-2 text-base md:text-lg text-white/80 font-light pl-4 border-l border-gold-base/30">
                <li><strong className="text-white font-medium">{t('p3_sub1').split(':')[0]}:</strong> {t('p3_sub1').split(':')[1]}</li>
                <li><strong className="text-white font-medium">{t('p3_sub2').split(':')[0]}:</strong> {t('p3_sub2').split(':')[1]}</li>
              </ul>
            </motion.div>
          </div>

          <motion.div variants={itemVariants} className="mt-16 pt-8 border-t border-white/10 text-center">
            <p className="font-display text-xl md:text-2xl italic text-gradient-gold">
              {t('conclusion')}
            </p>
          </motion.div>
        </motion.div>
      </div>

      <Footer />
    </main>
  );
}
