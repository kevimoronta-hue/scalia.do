'use client';

import { useEffect, useRef, useState } from 'react';
import { useScroll, useTransform, motion, useMotionTemplate, MotionValue } from 'framer-motion';
import { useTranslations } from 'next-intl';

function AnimatedWord({ word, index, scrollYProgress }: { word: string, index: number, scrollYProgress: MotionValue<number> }) {
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

  // Use refs for mutable data that shouldn't trigger re-renders
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const prefixRef = useRef('desktop');

  const [frameCount, setFrameCount] = useState(148);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const frameIndex = useTransform(scrollYProgress, (latest) => {
    return latest * (frameCount - 1) + 1;
  });

  // ─── Core render function — uses refs, no stale closures ──────────────────
  const renderFrame = (index: number) => {
    const canvas = canvasRef.current;
    const imgArray = imagesRef.current;
    const safeIndex = Math.max(1, Math.floor(index));
    const img = imgArray[safeIndex - 1];

    if (!canvas || !img || !img.complete || img.naturalHeight === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas internal dimensions (already DPR-aware)
    const w = canvas.width;
    const h = canvas.height;
    const scale = Math.max(w / img.width, h / img.height);
    const x = (w - img.width * scale) / 2;
    const y = (h - img.height * scale) / 2;

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
  };

  // ─── Resize canvas (sets raw pixel dimensions, no ctx.scale needed) ───────
  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const parent = canvas.parentElement;
    const w = parent ? parent.clientWidth : window.innerWidth;
    const h = parent ? parent.clientHeight : window.innerHeight;
    // Only resize if dimensions changed
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      // No ctx.scale() — we handle DPR in renderFrame with raw canvas dimensions
    }
    renderFrame(Math.floor(frameIndex.get()) || 1);
  };

  // ─── Load images ──────────────────────────────────────────────────────────
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    const prefix = isMobile ? 'mobile' : 'desktop';
    const total = isMobile ? 180 : 148;
    prefixRef.current = prefix;
    setFrameCount(total);

    // Initialize canvas dimensions before images arrive
    resizeCanvas();

    const loadedImages: HTMLImageElement[] = new Array(total);
    let firstFrameDrawn = false;

    for (let i = 1; i <= total; i++) {
      const img = new Image();
      const padded = i.toString().padStart(4, '0');

      img.onload = () => {
        loadedImages[i - 1] = img;
        // Draw first frame as soon as it loads
        if (!firstFrameDrawn && i === 1) {
          firstFrameDrawn = true;
          imagesRef.current = loadedImages;
          renderFrame(1);
        }
        // Also update ref so scroll handler always has latest images
        imagesRef.current = loadedImages;
      };

      img.src = `/scalia-2-assets/${prefix}/frame_${padded}.jpg`;

      // If already cached, onload won't fire — handle synchronously
      if (img.complete && img.naturalHeight !== 0) {
        loadedImages[i - 1] = img;
        imagesRef.current = loadedImages;
        if (!firstFrameDrawn && i === 1) {
          firstFrameDrawn = true;
          // Defer to ensure canvas has been sized
          setTimeout(() => renderFrame(1), 0);
        }
      }
    }

    imagesRef.current = loadedImages;

    // Attach scroll-driven frame rendering
    const unsubscribe = frameIndex.on('change', (latest) => {
      renderFrame(Math.floor(latest));
    });

    // Resize listener
    window.addEventListener('resize', resizeCanvas);

    return () => {
      unsubscribe();
      window.removeEventListener('resize', resizeCanvas);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount only — frameIndex and resizeCanvas are stable refs

  const subtitleWords = t('subtitle').split(" ");

  return (
    <section ref={containerRef} className="relative h-[400vh] md:h-[300vh] bg-black">
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-black">
        
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full opacity-70"
          style={{ imageRendering: 'auto' }}
        />
        
        {/* TEXTE D'INTRODUCTION */}
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none">
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

        {/* Fallback glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050505]/40 to-[#050505] z-10 pointer-events-none" />
      </div>
    </section>
  );
}
