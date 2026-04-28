'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import GhostNav from '@/components/GhostNav';
import Footer from '@/components/Footer';
import Image from 'next/image';

export default function Contact() {
  const t = useTranslations('Contact');
  const router = useRouter();
  const [formState, setFormState] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [countdown, setCountdown] = useState(5);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (formState !== 'idle') return;

    setFormState('submitting');
    
    // Extract form data
    const formData = new FormData(e.currentTarget);
    const fname = formData.get('fname');
    const lname = formData.get('lname');
    const email = formData.get('email');
    const company = formData.get('company');
    const budget = formData.get('budget');
    const message = formData.get('message');
    
    const subject = encodeURIComponent(`Contacto Web: ${company} - ${fname} ${lname}`);
    const body = encodeURIComponent(`Nombre: ${fname} ${lname}\nEmail: ${email}\nEmpresa: ${company}\nPresupuesto: ${budget}\n\nMensaje:\n${message}`);

    setTimeout(() => {
      // Trigger mailto so it sends to contact@scalia.do
      window.location.href = `mailto:contact@scalia.do?subject=${subject}&body=${body}`;
      
      setFormState('success');
      setCountdown(5);
      
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev > 1) return prev - 1;
          clearInterval(interval);
          router.push('/');
          return 0;
        });
      }, 1000);
    }, 1500);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
  };

  return (
    <main className="min-h-screen bg-black text-[#F5F5F5] selection:bg-gold-base selection:text-black flex flex-col">
      <GhostNav />
      
      <div className="relative flex-grow min-h-screen flex items-center">
        
        {/* Full Screen Image Background with Overlays */}
        <div className="absolute inset-0 z-0 overflow-hidden bg-black">
          <Image 
            src="/images/contact-bg-2.jpg" 
            alt="Scalia Contact Background"
            fill
            className="object-cover scale-105"
            priority
          />
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent md:hidden" />
          <div className="absolute inset-0 hidden md:block bg-gradient-to-r from-transparent via-black/60 to-black/95" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_50%,_rgba(201,160,80,0.15),_transparent_50%)] pointer-events-none" />
        </div>

        {/* Content Container (Split Screen Logic on Desktop) */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-12 pt-32 pb-24 flex flex-col md:flex-row items-center md:items-stretch justify-end h-full">
          
          {/* Left Side: Empty space on desktop (shows image), Title on mobile */}
          <div className="w-full md:w-1/2 flex flex-col justify-end md:justify-center mb-12 md:mb-0 md:pr-12 lg:pr-24 text-center">
             <motion.div
               initial={{ opacity: 0, x: -30 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ duration: 0.8, ease: 'easeOut' }}
             >
                <h1 className="font-display text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[1.1] mb-6 text-white font-light drop-shadow-2xl">
                  {t('title1')} <br />
                  <span className="italic text-gradient-gold font-bold">{t('titleHighlight')}.</span>
                </h1>
                <p className="font-sans text-white/70 text-base md:text-lg max-w-md mx-auto font-light leading-relaxed drop-shadow-lg hidden md:block">
                  {t('subtitle')}
                </p>
             </motion.div>
          </div>

          {/* Right Side: The Premium Glassmorphism Form / Success UI */}
          <div className="w-full md:w-1/2 max-w-lg lg:max-w-xl relative">
            <AnimatePresence mode="wait">
              {formState !== 'success' ? (
                <motion.form 
                  key="contact-form"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                  transition={{ duration: 0.5 }}
                  onSubmit={handleSubmit}
                  className="w-full bg-[#050505]/60 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-8 md:p-12 shadow-[0_30px_80px_rgba(0,0,0,0.6)]"
                >
                  <div className="flex flex-col gap-6">
                    <p className="text-[#F5F5F5]/40 text-xs italic tracking-wider mb-2">
                      {t('requiredFields')}
                    </p>

                    <div className="flex flex-col md:flex-row gap-6">
                      <motion.div variants={itemVariants} className="relative group flex-1">
                        <input 
                          type="text" 
                          name="fname"
                          required
                          placeholder={`${t('firstName')} *`}
                          className="w-full bg-white/[0.02] border-b border-white/10 px-4 py-4 text-base md:text-lg text-white focus:outline-none focus:border-gold-base transition-all duration-300 placeholder:text-white/30 font-sans tracking-wide min-h-[56px]"
                        />
                      </motion.div>
                      <motion.div variants={itemVariants} className="relative group flex-1">
                        <input 
                          type="text" 
                          name="lname"
                          required
                          placeholder={`${t('lastName')} *`}
                          className="w-full bg-white/[0.02] border-b border-white/10 px-4 py-4 text-base md:text-lg text-white focus:outline-none focus:border-gold-base transition-all duration-300 placeholder:text-white/30 font-sans tracking-wide min-h-[56px]"
                        />
                      </motion.div>
                    </div>
                    
                    <motion.div variants={itemVariants} className="relative group">
                      <input 
                        type="email" 
                        name="email"
                        required
                        placeholder={`${t('email')} *`}
                        className="w-full bg-white/[0.02] border-b border-white/10 px-4 py-4 text-base md:text-lg text-white focus:outline-none focus:border-gold-base transition-all duration-300 placeholder:text-white/30 font-sans tracking-wide min-h-[56px]"
                      />
                    </motion.div>

                    <motion.div variants={itemVariants} className="relative group">
                      <input 
                        type="text" 
                        name="company"
                        required
                        placeholder={`${t('company')} *`}
                        className="w-full bg-white/[0.02] border-b border-white/10 px-4 py-4 text-base md:text-lg text-white focus:outline-none focus:border-gold-base transition-all duration-300 placeholder:text-white/30 font-sans tracking-wide min-h-[56px]"
                      />
                    </motion.div>
                    
                    <motion.div variants={itemVariants} className="relative group">
                      <select name="budget" required defaultValue="" className="w-full bg-white/[0.02] border-b border-white/10 px-4 py-4 text-base md:text-lg text-white/50 focus:outline-none focus:border-gold-base focus:bg-white/[0.05] focus:text-white transition-all duration-300 appearance-none font-sans tracking-wide cursor-pointer min-h-[56px]">
                        <option value="" disabled className="bg-[#050505] text-white/30">{t('budget')} *</option>
                        <option value="0-25k" className="bg-[#050505] text-white">{t('budget1')}</option>
                        <option value="25k-75k" className="bg-[#050505] text-white">{t('budget2')}</option>
                        <option value="75k+" className="bg-[#050505] text-white">{t('budget3')}</option>
                        <option value="idk" className="bg-[#050505] text-white">{t('budget4')}</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/40 group-focus-within:text-gold-base/80 transition-colors">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                      </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="relative group mt-2">
                      <textarea 
                        name="message"
                        required
                        placeholder={`${t('message')} *`}
                        rows={3}
                        className="w-full bg-white/[0.02] border-b border-white/10 px-4 py-4 text-base md:text-lg text-white focus:outline-none focus:border-gold-base transition-all duration-300 placeholder:text-white/30 font-sans tracking-wide resize-none"
                      />
                    </motion.div>
                    
                    <motion.div variants={itemVariants} className="mt-8">
                      <button 
                        type="submit" 
                        disabled={formState !== 'idle'}
                        className={`relative w-full h-[64px] flex items-center justify-center rounded-none border font-bold tracking-[0.2em] uppercase transition-all duration-500 overflow-hidden ${
                          formState === 'submitting'
                              ? 'bg-white/5 border-white/10 text-white/50 cursor-not-allowed'
                              : 'border-gold-base/30 text-gold-base bg-gold-base/5 hover:bg-gold-base hover:text-black hover:border-transparent active:scale-[0.98]'
                        }`}
                      >
                        <AnimatePresence mode="wait">
                          {formState === 'idle' && (
                            <motion.div 
                              key="idle"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="flex items-center gap-3"
                            >
                              <span className="text-xs md:text-sm">{t('submit')}</span>
                              <ArrowRight size={16} />
                            </motion.div>
                          )}
                          {formState === 'submitting' && (
                            <motion.div 
                              key="submitting"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="flex items-center gap-3"
                            >
                              <div className="w-4 h-4 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
                              <span className="text-xs md:text-sm">{t('sending')}</span>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </button>
                      <p className="text-center mt-4 text-[#F5F5F5]/40 text-xs tracking-[0.15em] font-light uppercase">
                        {t('responseTime')}
                      </p>
                    </motion.div>
                  </div>
                </motion.form>
              ) : (
                <motion.div
                  key="success-screen"
                  initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="w-full min-h-[600px] flex flex-col items-center justify-center bg-[#050505]/80 backdrop-blur-3xl border border-gold-base/40 rounded-[2rem] p-8 md:p-12 shadow-[0_0_100px_rgba(201,160,80,0.15)] text-center"
                >
                  <motion.div 
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
                    className="w-24 h-24 rounded-full bg-gradient-gold flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(201,160,80,0.5)] text-black"
                  >
                    <CheckCircle2 size={48} strokeWidth={1.5} />
                  </motion.div>
                  
                  <motion.h3 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="font-display text-4xl text-gold-base mb-4 tracking-wide"
                  >
                    Mensaje Preparado
                  </motion.h3>
                  
                  <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="font-sans text-white/70 mb-12 max-w-sm text-lg"
                  >
                    Tu cliente de correo se abrirá con el resumen de tu proyecto. Te estamos redirigiendo a la página principal.
                  </motion.p>
                  
                  {/* Premium Countdown Circle */}
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7 }}
                    className="relative w-20 h-20 flex items-center justify-center"
                  >
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                      <circle cx="40" cy="40" r="38" className="stroke-white/10" strokeWidth="2" fill="none" />
                      <motion.circle 
                        cx="40" cy="40" r="38" 
                        className="stroke-gold-base" 
                        strokeWidth="2" 
                        fill="none" 
                        strokeDasharray="238.76" /* 2 * PI * 38 */
                        initial={{ strokeDashoffset: 238.76 }}
                        animate={{ strokeDashoffset: 0 }}
                        transition={{ duration: 5, ease: "linear" }}
                      />
                    </svg>
                    <span className="font-display text-3xl text-white font-light">{countdown}</span>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      
      <Footer />
    </main>
  );
}
