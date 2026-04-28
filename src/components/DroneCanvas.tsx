'use client';

import { useEffect, useRef } from 'react';
import { useScroll, useTransform, motion, useMotionTemplate, MotionValue } from 'framer-motion';
import { useTranslations } from 'next-intl';

// ─── Animated word sub-component ─────────────────────────────────────────────
function AnimatedWord({ word, index, scrollYProgress }: {
  word: string;
  index: number;
  scrollYProgress: MotionValue<number>;
}) {
  const start = 0.005 + index * 0.008;
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

// ─── Main component ───────────────────────────────────────────────────────────
export default function DroneCanvas() {
  const t = useTranslations('HomePage');
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ALL mutable state in refs → zero stale closures possible
  const imagesRef = useRef<(HTMLImageElement | undefined)[]>([]);
  const frameCountRef = useRef(148); // actual total frames for current device

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // frameIndex reads frameCountRef.current on every call → always correct value
  const frameIndex = useTransform(scrollYProgress, (latest) =>
    Math.max(1, Math.round(latest * (frameCountRef.current - 1) + 1))
  );

  // ─── Draw a frame on the canvas ───────────────────────────────────────────
  const draw = (requestedIndex: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const total = frameCountRef.current;
    const safeIndex = Math.max(1, Math.min(total, Math.floor(requestedIndex)));

    // Try exact frame first, then search backward for nearest loaded frame
    let img: HTMLImageElement | undefined;
    for (let offset = 0; offset < total; offset++) {
      const candidate = imagesRef.current[safeIndex - 1 - offset];
      if (candidate?.complete && candidate.naturalHeight !== 0) {
        img = candidate;
        break;
      }
    }
    if (!img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const scale = Math.max(w / img.width, h / img.height);
    const x = (w - img.width * scale) / 2;
    const y = (h - img.height * scale) / 2;

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
  };

  // ─── Sync canvas size to physical pixels (DPR-aware, no ctx.scale) ────────
  const syncCanvasSize = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const parent = canvas.parentElement;
    const w = (parent?.clientWidth ?? window.innerWidth) * dpr;
    const h = (parent?.clientHeight ?? window.innerHeight) * dpr;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    draw(frameIndex.get());
  };

  // ─── Setup: runs once on mount ────────────────────────────────────────────
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    const prefix = isMobile ? 'mobile' : 'desktop';
    const total = isMobile ? 180 : 148;
    frameCountRef.current = total;

    // Size canvas immediately
    syncCanvasSize();

    // Pre-allocate image slots
    const imgs: (HTMLImageElement | undefined)[] = new Array(total).fill(undefined);
    imagesRef.current = imgs;

    let frame1Drawn = false;

    const tryDrawFrame1 = () => {
      if (!frame1Drawn && imgs[0]?.complete && imgs[0].naturalHeight !== 0) {
        frame1Drawn = true;
        draw(1);
      }
    };

    // Load all frames
    for (let i = 1; i <= total; i++) {
      const img = new Image();
      const padded = i.toString().padStart(4, '0');

      img.onload = () => {
        imgs[i - 1] = img;
        // Always sync the ref (pointer is the same array, but be explicit)
        imagesRef.current = imgs;
        if (i === 1) tryDrawFrame1();
        // If scroll has moved past frame 1 by the time this loads, re-draw current
        const current = Math.floor(frameIndex.get());
        if (i === current) draw(current);
      };

      img.src = `/scalia-2-assets/${prefix}/frame_${padded}.jpg`;

      // Already cached → onload never fires → handle now
      if (img.complete && img.naturalHeight !== 0) {
        imgs[i - 1] = img;
        imagesRef.current = imgs;
        if (i === 1) setTimeout(tryDrawFrame1, 0);
      }
    }

    // Drive animation from scroll
    const unsubscribe = frameIndex.on('change', (latest) => draw(latest));

    // Keep canvas sharp on resize / orientation change
    window.addEventListener('resize', syncCanvasSize);
    screen.orientation?.addEventListener?.('change', syncCanvasSize);

    return () => {
      unsubscribe();
      window.removeEventListener('resize', syncCanvasSize);
      screen.orientation?.removeEventListener?.('change', syncCanvasSize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ← intentional: all values read via refs/MotionValues, never stale

  const subtitleWords = t('subtitle').split(' ');

  return (
    <section ref={containerRef} className="relative h-[400vh] md:h-[300vh] bg-black">
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-black">

        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full opacity-70"
          aria-hidden="true"
        />

        {/* Text overlay */}
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-black/50 via-transparent to-transparent" />

          <div className="text-center px-6 flex flex-col items-center max-w-5xl mx-auto relative z-10">
            <h1 className="font-sans text-4xl md:text-6xl lg:text-7xl text-white font-extrabold tracking-tighter leading-[1.1] drop-shadow-[0_4px_30px_rgba(0,0,0,0.8)]">
              {subtitleWords.map((word, i) => (
                <AnimatedWord key={i} word={word} index={i} scrollYProgress={scrollYProgress} />
              ))}
            </h1>
          </div>

          <div className="absolute bottom-8 md:bottom-12 left-0 right-0 flex flex-col items-center gap-3 opacity-40">
            <span className="text-[8px] font-sans tracking-[0.5em] uppercase text-white/70">
              {t('scroll')}
            </span>
            <div className="w-[1px] h-10 md:h-16 bg-gradient-to-b from-white/40 to-transparent" />
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050505]/40 to-[#050505] z-10 pointer-events-none" />
      </div>
    </section>
  );
}
