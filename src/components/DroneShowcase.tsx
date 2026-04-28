'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Aperture, Camera, Video, Smartphone } from 'lucide-react';
import { useTranslations } from 'next-intl';

const TOTAL_FRAMES = 247;
const BASE_PREFIX = '1777328979962_';

function getFramePath(index: number): string {
  const padded = String(index).padStart(4, '0');
  return `/scalia-2-assets/dji/${BASE_PREFIX}${padded}.jpg`;
}

export default function DroneShowcase() {
  const t = useTranslations('DroneShowcase');

  const specs = [
    { icon: <Aperture size={18} className="text-gold-base" />, title: t('spec1Title'), desc: t('spec1Desc') },
    { icon: <Camera size={18} className="text-gold-base" />, title: t('spec2Title'), desc: t('spec2Desc') },
    { icon: <Video size={18} className="text-gold-base" />, title: t('spec3Title'), desc: t('spec3Desc') },
    { icon: <Smartphone size={18} className="text-gold-base" />, title: t('spec4Title'), desc: t('spec4Desc') },
  ];

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const frameRef = useRef(0);

  const { scrollYProgress } = useScroll({
    target: canvasContainerRef,
    offset: ['start start', 'end end'],
  });

  // Preload all frames
  useEffect(() => {
    let loadedCount = 0;
    const images: HTMLImageElement[] = [];

    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image();
      img.src = getFramePath(i);
      img.onload = () => {
        loadedCount++;
        setLoadProgress(Math.round((loadedCount / TOTAL_FRAMES) * 100));
        if (loadedCount === TOTAL_FRAMES) setLoaded(true);
      };
      img.onerror = () => {
        loadedCount++;
        if (loadedCount === TOTAL_FRAMES) setLoaded(true);
      };
      images.push(img);
    }
    imagesRef.current = images;
  }, []);

  // Draw on scroll
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const unsubscribe = scrollYProgress.on('change', (progress) => {
      const clamped = Math.max(0, Math.min(1, progress));
      const rawIndex = Math.round(clamped * (TOTAL_FRAMES - 1));
      const index = Math.max(0, Math.min(TOTAL_FRAMES - 1, rawIndex));

      if (index !== frameRef.current || !frameRef.current) {
        frameRef.current = index;
        const img = imagesRef.current[index];
        if (img && img.complete) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            canvas.width = img.naturalWidth || 1920;
            canvas.height = img.naturalHeight || 1080;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          }
        }
      }
    });

    return () => unsubscribe();
  }, [scrollYProgress, loaded]);

  // Initial frame on load
  useEffect(() => {
    if (!loaded) return;
    const canvas = canvasRef.current;
    const img = imagesRef.current[0];
    if (canvas && img && img.complete) {
      canvas.width = img.naturalWidth || 1920;
      canvas.height = img.naturalHeight || 1080;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
    }
  }, [loaded]);

  return (
    <section className="bg-black border-t border-white/5 relative z-10">

      {/* ① INTRO TEXT — épuré */}
      <div className="py-32 px-6 flex flex-col items-center justify-center text-center">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className="font-display text-4xl md:text-5xl lg:text-6xl text-white font-light leading-tight mb-8"
        >
          {t('introTitle')}
        </motion.h2>
        <motion.div 
          initial={{ opacity: 0, scaleX: 0 }}
          whileInView={{ opacity: 1, scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="w-20 h-[1px] bg-gradient-gold mx-auto mb-8 origin-center" 
        />
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
          className="font-sans text-white/50 text-lg md:text-xl font-light italic"
        >
          {t('introDesc')}
        </motion.p>
      </div>

      {/* ② SCROLL SEQUENCE — canvas + spacer */}
      <div ref={canvasContainerRef} className="relative h-[300vh]">
        <div className="sticky top-0 h-screen overflow-hidden">
          <div className="relative w-full h-full">

            {/* Loading Overlay */}
            {!loaded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black">
                <div className="w-48 h-[2px] bg-white/10 rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full bg-gradient-to-r from-gold-base to-yellow-300 rounded-full transition-all duration-200"
                    style={{ width: `${loadProgress}%` }}
                  />
                </div>
                <span className="text-white/40 font-sans text-xs tracking-widest uppercase">
                  {t('loading')} · {loadProgress}%
                </span>
              </div>
            )}

            {/* Cinematic Canvas */}
            <canvas
              ref={canvasRef}
              className="w-full h-full object-cover"
              style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.5s ease' }}
            />

            {/* Vignette uniquement */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 pointer-events-none" />

            {/* Scroll hint */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10">
              <div className="w-[1px] h-10 bg-gradient-to-b from-white/30 to-transparent animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* ③ SPECS TABLE — après la vidéo */}
      <div className="bg-black py-32 px-6 md:px-16 border-t border-white/5">
        <div className="max-w-4xl mx-auto">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="mb-14 flex flex-col items-center justify-center text-center gap-4"
          >
            <div>
              <h3 className="font-display text-3xl md:text-4xl lg:text-5xl text-white font-light mb-6">
                DJI Air 3
              </h3>
              <div className="w-20 h-[1px] bg-gradient-gold mx-auto" />
            </div>
            <span className="flex items-center justify-center gap-2 text-white/30 font-sans text-xs tracking-widest uppercase mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-gold-base animate-pulse inline-block" />
              {t('specsIncluded')}
            </span>
          </motion.div>

          {/* Table */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.15, ease: 'easeOut' }}
            className="border border-white/10 rounded-2xl overflow-hidden"
          >
            {specs.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 + i * 0.1, ease: 'easeOut' }}
                className={`flex items-center gap-6 px-8 py-6 group transition-colors duration-300 hover:bg-white/[0.03] ${
                  i < specs.length - 1 ? 'border-b border-white/8' : ''
                }`}
              >
                {/* Icône */}
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center flex-shrink-0 group-hover:border-gold-base/30 transition-colors duration-300">
                  {s.icon}
                </div>

                {/* Spec */}
                <div className="flex-1 flex flex-col md:flex-row md:items-center md:justify-between gap-1">
                  <h4 className="text-white font-sans text-sm font-bold">{s.title}</h4>
                  <p className="text-white/45 font-sans text-sm md:text-right">{s.desc}</p>
                </div>

                {/* Trait doré droit */}
                <div className="w-[2px] h-6 bg-gold-base/20 group-hover:bg-gold-base/60 transition-colors duration-300 hidden md:block flex-shrink-0" />
              </motion.div>
            ))}
          </motion.div>

        </div>
      </div>

    </section>
  );
}
