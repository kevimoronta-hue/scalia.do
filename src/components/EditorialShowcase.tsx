'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Brain, Layout, Palette, Zap, Rocket } from 'lucide-react';

export default function EditorialShowcase() {
  const t = useTranslations('EditorialShowcase');

  const processSteps = [
    {
      icon: <Brain size={18} />,
      title: t('step1Title'),
      subtitle: t('step1Sub'),
      desc: t('step1Desc')
    },
    {
      icon: <Layout size={18} />,
      title: t('step2Title'),
      subtitle: t('step2Sub'),
      desc: t('step2Desc')
    },
    {
      icon: <Palette size={18} />,
      title: t('step3Title'),
      subtitle: t('step3Sub'),
      desc: t('step3Desc')
    },
    {
      icon: <Zap size={18} />,
      title: t('step4Title'),
      subtitle: t('step4Sub'),
      desc: t('step4Desc')
    },
    {
      icon: <Rocket size={18} />,
      title: t('step5Title'),
      subtitle: t('step5Sub'),
      desc: t('step5Desc')
    }
  ];

  return (
    <section className="py-24 md:py-32 lg:py-40 px-6 md:px-12 max-w-7xl mx-auto bg-black relative z-10">
      
      {/* Introduction Editoriale */}
      <div className="max-w-4xl mx-auto mb-32 text-center flex flex-col items-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="font-display text-4xl md:text-5xl lg:text-7xl text-white leading-[1.15] mb-10 font-medium tracking-tight">
            {t('introTitle')} <span className="italic text-white/70">{t('introItalic')}</span>
          </h2>
          <div className="w-20 h-[1px] bg-gradient-gold mb-10 mx-auto" />
          <p className="font-sans text-white/80 font-light text-base md:text-xl max-w-3xl leading-relaxed mx-auto">
            {t('introDesc')}
          </p>
        </motion.div>
      </div>

      {/* Table de Comparaison Néo-Luxe */}
      <div className="max-w-5xl mx-auto mb-32">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="bg-[#0A0A0A] rounded-2xl md:rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl relative"
        >
          {/* Subtle Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-gold-base/10 rounded-full blur-[80px] pointer-events-none" />

          {/* Desktop Table Layout (md and up) */}
          <div className="hidden md:block relative z-10">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  <th className="py-8 px-12 font-sans text-xs tracking-[0.2em] uppercase text-white/70 w-1/3">
                    {t('th1')}
                  </th>
                  <th className="py-8 px-12 font-sans text-xs tracking-[0.2em] uppercase text-white font-bold w-1/3 border-l border-r border-white/5 bg-white/[0.03]">
                    {t('th2')}
                  </th>
                  <th className="py-8 px-12 font-sans text-xs tracking-[0.2em] uppercase text-white/50 w-1/3">
                    {t('th3')}
                  </th>
                </tr>
              </thead>
              <tbody className="font-sans text-base lg:text-lg">
                {[
                  { feat: t('r1_feature'), scalia: t('r1_scalia'), other: t('r1_others') },
                  { feat: t('r2_feature'), scalia: t('r2_scalia'), other: t('r2_others') },
                  { feat: t('r3_feature'), scalia: t('r3_scalia'), other: t('r3_others') },
                  { feat: t('r4_feature'), scalia: t('r4_scalia'), other: t('r4_others') },
                  { feat: t('r5_feature'), scalia: t('r5_scalia'), other: t('r5_others') },
                  { feat: t('r6_feature'), scalia: t('r6_scalia'), other: t('r6_others') }
                ].map((row, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="py-6 px-12 text-white/90 font-medium">
                      {row.feat}
                    </td>
                    <td className="py-6 px-12 text-gold-base font-bold border-l border-r border-white/5 bg-white/[0.01]">
                      {row.scalia}
                    </td>
                    <td className="py-6 px-12 text-white/60">
                      {row.other}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout (up to md) */}
          <div className="md:hidden relative z-10 px-6 py-12 flex flex-col gap-10">
            <h3 className="font-sans text-center text-[10px] tracking-[0.4em] uppercase text-white/60 font-semibold mb-4">{t('compareTitle')}</h3>
            {[
              { feat: t('r1_feature'), scalia: t('r1_scalia'), other: t('r1_others') },
              { feat: t('r2_feature'), scalia: t('r2_scalia'), other: t('r2_others') },
              { feat: t('r3_feature'), scalia: t('r3_scalia'), other: t('r3_others') },
              { feat: t('r4_feature'), scalia: t('r4_scalia'), other: t('r4_others') },
              { feat: t('r5_feature'), scalia: t('r5_scalia'), other: t('r5_others') },
              { feat: t('r6_feature'), scalia: t('r6_scalia'), other: t('r6_others') }
            ].map((row, i) => (
              <div key={i} className="flex flex-col gap-4">
                <span className="font-display text-base text-white/90 font-medium border-b border-white/10 pb-3">{row.feat}</span>
                
                {/* Other Agency */}
                <div className="flex items-center gap-4 text-white/50 text-sm pl-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  <span className="line-through">{row.other}</span>
                </div>

                {/* Scalia Advantage */}
                <div className="flex items-center gap-4 text-gold-base font-bold text-sm bg-white/5 border border-white/10 p-5 rounded-2xl shadow-[0_0_20px_rgba(201,160,80,0.05)]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  <span>{row.scalia}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Proceso en 5 Pasos */}
      <div className="max-w-3xl mx-auto mt-16 md:mt-32">
        <motion.div 
          className="text-center mb-16 md:mb-24 flex flex-col items-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <span className="text-gold-base font-sans text-xs tracking-[0.4em] uppercase font-bold">Nuestro Método</span>
          <h2 className="font-display text-3xl md:text-5xl text-white mt-6 font-medium tracking-tight mb-8">
            De la idea a la Realidad en <span className="italic text-white/70">Tiempo Récord</span>
          </h2>
          <div className="w-20 h-[1px] bg-gradient-gold mx-auto" />
        </motion.div>

        <div className="relative border-l border-white/10 ml-6 md:ml-12 space-y-16 md:space-y-24 pb-8">
          {processSteps.map((step, index) => (
            <motion.div 
              key={index} 
              className="relative pl-10 md:pl-16 group"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              {/* Timeline Dot */}
              <div className="absolute -left-[20px] md:-left-[24px] top-0 w-10 h-10 md:w-12 md:h-12 bg-[#0A0A0A] border border-white/20 rounded-full flex items-center justify-center text-gold-base shadow-[0_0_15px_rgba(201,160,80,0.1)] group-hover:shadow-[0_0_25px_rgba(201,160,80,0.3)] group-hover:scale-110 group-hover:border-gold-base/50 transition-all duration-500">
                 {step.icon}
              </div>
              
              <div className="flex flex-col">
                <span className="text-white/40 font-display text-[10px] md:text-xs tracking-[0.3em] uppercase mb-3">{t('stepPrefix')} {index + 1}</span>
                <h3 className="font-display text-2xl md:text-3xl text-white mb-4">
                  {step.title} <span className="text-white/40 italic">{step.subtitle}</span>
                </h3>
                <p className="font-sans text-white/60 text-base md:text-lg leading-relaxed max-w-2xl">
                  {step.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
