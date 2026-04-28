'use client';

import { useEffect, useRef } from 'react';
import { useScroll, useTransform, motion, useMotionTemplate, MotionValue, useMotionValueEvent } from 'framer-motion';
import { useTranslations } from 'next-intl';

function AnimatedWord({ word, index, scrollYProgress }: {
  word: string;
  index: number;
  scrollYProgress: MotionValue<number>;
}) {
  const start   = 0.005 + index * 0.008;
  const end     = start + 0.03;
  const opacity = useTransform(scrollYProgress, [start, end], [0, 1]);
  const y       = useTransform(scrollYProgress, [start, end], [20, 0]);
  const blurRaw = useTransform(scrollYProgress, [start, end], [10, 0]);
  const filter  = useMotionTemplate`blur(${blurRaw}px)`;
  return (
    <motion.span style={{ opacity, y, filter }} className="inline-block mr-[0.25em]">
      {word}
    </motion.span>
  );
}

export default function DroneCanvas() {
  const t            = useTranslations('HomePage');
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);

  const imagesRef    = useRef<(HTMLImageElement | undefined)[]>([]);
  const totalRef     = useRef(148);
  const lastDrawnRef = useRef(-1);
  const drawRef      = useRef<(f: number) => void>(() => {});

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  const frameMotion = useTransform(
    scrollYProgress,
    (p) => Math.max(1, Math.min(totalRef.current, Math.floor(p * (totalRef.current - 1)) + 1))
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ── Device detection ────────────────────────────────────────────────────
    const isMobile = window.innerWidth < 768;
    const prefix   = isMobile ? 'mobile' : 'desktop';
    const total    = isMobile ? 180 : 148;
    totalRef.current = total;

    // ── Canvas sizing (DPR capped at 2 for perf) ────────────────────────────
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const sizeCanvas = () => {
      const W = (canvas.parentElement?.clientWidth  ?? window.innerWidth)  * DPR;
      const H = (canvas.parentElement?.clientHeight ?? window.innerHeight) * DPR;
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width  = W;
        canvas.height = H;
        lastDrawnRef.current = -1;
      }
    };
    sizeCanvas();
    window.addEventListener('resize', sizeCanvas);

    const draw = (frame: number) => drawRef.current(frame);

    // ── Core draw ────────────────────────────────────────────────────────────
    // Attach draw to a ref so useMotionValueEvent can access the latest version without being in deps
    drawRef.current = (frame: number) => {
      const safe = Math.max(1, Math.min(total, Math.floor(frame)));
      if (safe === lastDrawnRef.current) return;

      const img = imagesRef.current[safe - 1];
      if (!img || !img.complete || img.naturalHeight === 0) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const W = canvas.width, H = canvas.height;
      const s = Math.max(W / img.width, H / img.height);
      const x = (W - img.width  * s) / 2;
      const y = (H - img.height * s) / 2;

      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(img, x, y, img.width * s, img.height * s);
      lastDrawnRef.current = safe;
    };

    // ── Preload frames ────────────────────────────────────────────────────────
    const imgs: (HTMLImageElement | undefined)[] = new Array(total).fill(undefined);
    imagesRef.current = imgs;

    let initialFrameDrawn = false;

    for (let i = 1; i <= total; i++) {
      const img    = new Image();
      const padded = i.toString().padStart(4, '0');
      
      const handleLoad = () => {
        imgs[i - 1] = img;
        
        // If this is the first frame and we haven't drawn it yet, draw it
        if (i === 1 && !initialFrameDrawn) {
          initialFrameDrawn = true;
          draw(1);
        }
        
        // If the user is currently waiting for THIS frame to load, draw it immediately!
        const currentNeeded = Math.floor(frameMotion.get());
        if (i === currentNeeded) {
          draw(currentNeeded);
        }
      };

      img.onload = handleLoad;
      img.src    = `/scalia-2-assets/${prefix}/frame_${padded}.jpg`;
      
      // Already cached
      if (img.complete && img.naturalHeight !== 0) {
        handleLoad();
      }
    }

    return () => {
      window.removeEventListener('resize', sizeCanvas);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Drive animation from scroll ──────────────────────────────────────────
  useMotionValueEvent(frameMotion, 'change', (latest) => {
    // Only call draw if the canvas has been sized and initialized
    if (lastDrawnRef.current !== -1 || canvasRef.current?.width) {
      drawRef.current(latest);
    }
  });

  const words = t('subtitle').split(' ');

  return (
    <section ref={containerRef} className="relative h-[400vh] md:h-[300vh] bg-black">
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-black">

        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full opacity-70"
          aria-hidden="true"
        />

        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-black/50 via-transparent to-transparent" />
          <div className="text-center px-6 flex flex-col items-center max-w-5xl mx-auto relative z-10">
            <h1 className="font-sans text-4xl md:text-6xl lg:text-7xl text-white font-extrabold tracking-tighter leading-[1.1] drop-shadow-[0_4px_30px_rgba(0,0,0,0.8)]">
              {words.map((word, i) => (
                <AnimatedWord key={i} word={word} index={i} scrollYProgress={scrollYProgress} />
              ))}
            </h1>
          </div>
          <div className="absolute bottom-8 md:bottom-12 left-0 right-0 flex flex-col items-center gap-3 opacity-40">
            <span className="text-[8px] font-sans tracking-[0.5em] uppercase text-white/70">{t('scroll')}</span>
            <div className="w-[1px] h-10 md:h-16 bg-gradient-to-b from-white/40 to-transparent" />
          </div>
        </div>

        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050505]/40 to-[#050505] z-10 pointer-events-none" />
      </div>
    </section>
  );
}
