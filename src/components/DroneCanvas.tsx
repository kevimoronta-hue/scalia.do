'use client';

import { useEffect, useRef, useState } from 'react';
import { useScroll, useTransform, motion, useMotionTemplate, MotionValue } from 'framer-motion';
import { useTranslations } from 'next-intl';

function AnimatedWord({ word, index, scrollYProgress }: { word: string, index: number, scrollYProgress: MotionValue<number> }) {
  // Apparition beaucoup plus rapide pour garantir que le texte ait le temps de finir (surtout pour le français)
  const start = 0.005 + (index * 0.008);
  const end = start + 0.03;
  
  const opacity = useTransform(scrollYProgress, [start, end], [0, 1]);
  const y = useTransform(scrollYProgress, [start, end], [20, 0]);
  const blurRaw = useTransform(scrollYProgress, [start, end], [10, 0]);
  const filter = useMotionTemplate`blur(${blurRaw}px)`;

  return (
    <motion.span style={{ opacity, y, filter }} className="inline-block mr-[0.25em]">
      {word}
    </motion.span>
  );
}

export default function DroneCanvas() {
  const t = useTranslations('HomePage');
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  const [devicePrefix, setDevicePrefix] = useState('desktop');
  const [frameCount, setFrameCount] = useState(148);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Map scroll progress (0 to 1) dynamically to the current frameCount
  const frameIndex = useTransform(scrollYProgress, (latest) => {
    return latest * (frameCount - 1) + 1;
  });

  // Animation pour le bouton CTA
  const ctaOpacity = useTransform(scrollYProgress, [0.15, 0.25], [0, 1]);
  const ctaY = useTransform(scrollYProgress, [0.15, 0.25], [20, 0]);

  useEffect(() => {
    // Determine device
    const isMobile = window.innerWidth < 768;
    const prefix = isMobile ? 'mobile' : 'desktop';
    const totalFrames = isMobile ? 180 : 148;
    setDevicePrefix(prefix);
    setFrameCount(totalFrames);

    // --- STEP 1: Initialize canvas size IMMEDIATELY so it can receive drawings ---
    if (canvasRef.current) {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvasRef.current.parentElement?.getBoundingClientRect() || { width: window.innerWidth, height: window.innerHeight };
      canvasRef.current.width = rect.width * dpr;
      canvasRef.current.height = rect.height * dpr;
      const ctx = canvasRef.current.getContext('2d');
      ctx?.scale(dpr, dpr);
    }

    // Preload images
    const loadedImages: HTMLImageElement[] = [];

    for (let i = 1; i <= frameCount; i++) {
      const img = new Image();
      const paddedIndex = i.toString().padStart(4, '0');
      
      img.onload = () => {
        const currentNeededFrame = Math.floor(frameIndex.get()) || 1;
        if (i === currentNeededFrame || i === 1) {
          renderFrame(currentNeededFrame, loadedImages);
        }
      };
      
      img.src = `/scalia-2-assets/${prefix}/frame_${paddedIndex}.jpg`;
      loadedImages.push(img);

      // --- STEP 2: Handle images already in browser cache ---
      // When src is cached, .complete is true BEFORE onload fires, so the callback is NEVER called.
      // We detect this and draw synchronously right now.
      if (img.complete && img.naturalHeight !== 0) {
        if (i === 1) {
          // Use setTimeout(0) to ensure canvas is initialized first
          setTimeout(() => renderFrame(1, loadedImages), 0);
        }
      }
    }
    setImages(loadedImages);
  }, [frameCount, frameIndex]);

  const renderFrame = (index: number, imgArray: HTMLImageElement[]) => {
    if (!canvasRef.current || !imgArray[index - 1]) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imgArray[index - 1];
    if (img.complete && img.naturalHeight !== 0) {
      // Draw image to cover canvas using CSS dimensions
      const rect = canvas.getBoundingClientRect();
      const scale = Math.max(rect.width / img.width, rect.height / img.height);
      const x = (rect.width / 2) - (img.width / 2) * scale;
      const y = (rect.height / 2) - (img.height / 2) * scale;
      
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    }
  };

  useEffect(() => {
    const unsubscribe = frameIndex.on('change', (latest) => {
      renderFrame(Math.floor(latest), images);
    });

    // Handle resize with Retina Display Support (devicePixelRatio)
    const handleResize = () => {
      if (canvasRef.current) {
        const dpr = window.devicePixelRatio || 1;
        // Use parent container dimensions
        const rect = canvasRef.current.parentElement?.getBoundingClientRect() || { width: window.innerWidth, height: window.innerHeight };
        
        // Set actual canvas resolution multiplied by DPR
        canvasRef.current.width = rect.width * dpr;
        canvasRef.current.height = rect.height * dpr;
        
        // Normalize coordinate system to use CSS pixels
        const ctx = canvasRef.current.getContext('2d');
        ctx?.scale(dpr, dpr);
        
        const currentFrame = Math.floor(frameIndex.get()) || 1;
        renderFrame(currentFrame, images);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      unsubscribe();
      window.removeEventListener('resize', handleResize);
    };
  }, [frameIndex, images]);

  const subtitleWords = t('subtitle').split(" ");

  return (
    <section ref={containerRef} className="relative h-[400vh] md:h-[300vh] bg-black">
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-black">
        
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover opacity-70"
        />
        
        {/* TEXTE D'INTRODUCTION (Spawn Effect Pro Max) */}
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none">
          {/* Subtle dark halo to guarantee text readability over any video frame */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-black/50 via-transparent to-transparent opacity-100" />
          
          <div className="text-center px-6 flex flex-col items-center max-w-5xl mx-auto relative z-10">
            <h1 className="font-sans text-4xl md:text-6xl lg:text-7xl text-white font-extrabold tracking-tighter leading-[1.1] drop-shadow-[0_4px_30px_rgba(0,0,0,0.8)]">
              {subtitleWords.map((word, i) => (
                <AnimatedWord key={i} word={word} index={i} scrollYProgress={scrollYProgress} />
              ))}
            </h1>
          </div>
          
          <div className="absolute bottom-8 md:bottom-12 left-0 right-0 flex flex-col items-center gap-3 opacity-40">
            <span className="text-[8px] font-sans tracking-[0.5em] uppercase text-white/70">{t('scroll')}</span>
            <div className="w-[1px] h-10 md:h-16 bg-gradient-to-b from-white/40 to-transparent" />
          </div>
        </div>



        {/* Fallback glow to blend video with background */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050505]/40 to-[#050505] z-10 pointer-events-none" />
      </div>
    </section>
  );
}
