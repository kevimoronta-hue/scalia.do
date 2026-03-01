"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { useLanguage } from "@/components/LanguageProvider";

const FRAME_COUNT = 168; // frame_0 to frame_167

export default function ExplorerCanvas() {
    const { t, locale } = useLanguage();
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [images, setImages] = useState<HTMLImageElement[]>([]);
    const [loaded, setLoaded] = useState(0);
    const [isReady, setIsReady] = useState(false);

    // Framer Motion Scroll tracking on the wrapper element
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    // Smooth scroll progress using spring logic to avoid jitter
    const smoothProgress = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    // 1) PRELOAD IMAGES
    useEffect(() => {
        let loadedCount = 0;
        const loadedImages: HTMLImageElement[] = [];

        for (let i = 0; i < FRAME_COUNT; i++) {
            const img = new Image();
            // Using sequence from the Explorer folder
            img.src = `/Explorer/frame_${i}.jpg`;
            img.onload = () => {
                loadedCount++;
                setLoaded(loadedCount);
                if (loadedCount === FRAME_COUNT) {
                    setImages(loadedImages);
                    setIsReady(true);
                }
            };
            loadedImages.push(img);
        }

        // Cleanup not strictly necessary for images, but good practice if unmounted early
        return () => {
            loadedImages.forEach(img => {
                img.onload = null;
            });
        };
    }, []);

    // 2) CANVAS DRAWING LOGIC linked to smoothProgress
    useEffect(() => {
        if (!isReady || images.length === 0) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Set canvas dimensions
        const resizeCanvas = () => {
            // High DPI support
            const dpr = window.devicePixelRatio || 1;
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
        };

        window.addEventListener("resize", resizeCanvas);
        resizeCanvas();

        // Helper to draw a specific frame
        const drawFrame = (progress: number) => {
            const maxFrameIndex = FRAME_COUNT - 1;
            const frameIndex = Math.min(
                maxFrameIndex,
                Math.max(0, Math.floor(progress * maxFrameIndex))
            );

            const image = images[frameIndex];
            if (!image) return;

            const cw = canvas.width;
            const ch = canvas.height;

            ctx.clearRect(0, 0, cw, ch);

            const imgW = image.width;
            const imgH = image.height;
            const windowRatio = window.innerWidth / window.innerHeight;
            const imgRatio = imgW / imgH;

            let drawW, drawH, drawX, drawY;

            if (windowRatio > imgRatio) {
                drawH = ch;
                drawW = imgW * (ch / imgH);
                drawX = (cw - drawW) / 2;
                drawY = 0;
            } else {
                drawW = cw;
                drawH = imgH * (cw / imgW);
                drawX = 0;
                drawY = (ch - drawH) / 2;
            }

            ctx.drawImage(image, drawX, drawY, drawW, drawH);
        };

        // Render loop for scroll changes
        const unsubscribe = smoothProgress.on("change", (latestProgress) => {
            drawFrame(latestProgress);
        });

        // Draw initial frame explicitly as soon as images are ready
        drawFrame(smoothProgress.get());

        return () => {
            window.removeEventListener("resize", resizeCanvas);
            unsubscribe();
        };
    }, [isReady, images, smoothProgress]);

    // Define Text Opacity transformations mapped to overall container scroll
    // Beat A: 0-20% (fade in 0-10, out 10-20)
    const opacityA = useTransform(smoothProgress, [0, 0.1, 0.15, 0.2], [0, 1, 1, 0]);
    const yA = useTransform(smoothProgress, [0, 0.1, 0.15, 0.2], [20, 0, 0, -20]);

    // Beat B: 25-45% (fade in 25-30, out 40-45)
    const opacityB = useTransform(smoothProgress, [0.25, 0.3, 0.4, 0.45], [0, 1, 1, 0]);
    const yB = useTransform(smoothProgress, [0.25, 0.3, 0.4, 0.45], [20, 0, 0, -20]);

    // Beat C: 50-70% (fade in 50-55, out 65-70)
    const opacityC = useTransform(smoothProgress, [0.5, 0.55, 0.65, 0.7], [0, 1, 1, 0]);
    const yC = useTransform(smoothProgress, [0.5, 0.55, 0.65, 0.7], [20, 0, 0, -20]);

    // Beat D: 75-95% (fade in 75-80, out 90-95)
    // End fades out just before 100% or stays visible? "stays visible for the call to action".
    const opacityD = useTransform(smoothProgress, [0.75, 0.8, 0.95, 1], [0, 1, 1, 1]);
    const yD = useTransform(smoothProgress, [0.75, 0.8, 0.95, 1], [20, 0, 0, 0]);

    // Scroll Indicator Fade Out
    const scrollIndicatorOpacity = useTransform(smoothProgress, [0, 0.05], [1, 0]);

    return (
        <div ref={containerRef} className="relative w-full h-[500vh] bg-[#050505]">

            {/* LOADING STATE DIV (Overlays the sticky container before ready) */}
            {!isReady && (
                <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050505]">
                    <div className="w-64 mb-4">
                        <div className="flex justify-between text-xs text-white/40 uppercase tracking-widest mb-2">
                            <span>Initializing Sequence</span>
                            <span>{Math.round((loaded / FRAME_COUNT) * 100)}%</span>
                        </div>
                        <div className="h-[2px] w-full bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-white transition-all duration-300 ease-out"
                                style={{ width: `${(loaded / FRAME_COUNT) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* STICKY CANVAS CONTAINER */}
            <div className="sticky top-0 w-full h-screen overflow-hidden">

                {/* The target canvas where frames are drawn */}
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                    // We apply CSS styling to ensure absolute full screen size
                    style={{ width: '100%', height: '100%' }}
                />

                {/* SCROLL EXPLORE INDICATOR */}
                <motion.div
                    style={{ opacity: scrollIndicatorOpacity }}
                    className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 text-white/50"
                >
                    <span className="text-[10px] uppercase tracking-[0.2em]">{t.hero.scroll}</span>
                    <div className="w-[1px] h-8 bg-gradient-to-b from-white/50 to-transparent" />
                </motion.div>

                {/* --- SCROLLYTELLING TEXT BEATS --- */}
                {/* BEAT A (Top aligned on both) */}
                <motion.div
                    style={{ opacity: opacityA, y: yA }}
                    className="absolute inset-0 flex flex-col justify-start pt-24 md:pt-32 px-6 md:px-24 pointer-events-none"
                >
                    <div className="max-w-4xl">
                        <h2 className="text-3xl md:text-6xl font-bold tracking-tight text-white/90 leading-tight">
                            {t.hero.beatA.title}
                        </h2>
                        <p className="mt-4 text-lg md:text-2xl text-white/60 font-light tracking-wide pr-4 md:pr-0">
                            {t.hero.beatA.subtitle}
                        </p>
                    </div>
                </motion.div>

                {/* BEAT B (Bottom aligned on mobile, Center aligned on desktop) */}
                <motion.div
                    style={{ opacity: opacityB, y: yB }}
                    className="absolute inset-0 flex flex-col justify-end md:justify-center pb-24 md:pb-0 px-6 md:px-24 pointer-events-none"
                >
                    <div className="max-w-xl">
                        <h2 className="text-4xl md:text-7xl font-bold tracking-tight text-white/90 leading-tight">
                            {t.hero.beatB.title}
                        </h2>
                        <p className="mt-4 md:mt-6 text-base md:text-xl text-white/60 font-light tracking-wide pr-4 md:pr-0">
                            {t.hero.beatB.subtitle}
                        </p>
                    </div>
                </motion.div>

                {/* BEAT C (Top aligned on mobile, Center aligned on desktop) */}
                <motion.div
                    style={{ opacity: opacityC, y: yC }}
                    className="absolute inset-0 flex flex-col items-end justify-start md:justify-center pt-24 md:pt-0 px-6 md:px-24 text-right pointer-events-none"
                >
                    <div className="max-w-xl">
                        <h2 className="text-3xl md:text-6xl font-bold tracking-tight text-white/90 leading-tight">
                            {t.hero.beatC.title}
                        </h2>
                        <p className="mt-4 md:mt-6 text-base md:text-xl text-white/60 font-light tracking-wide pl-8 md:pl-0">
                            {t.hero.beatC.subtitle}
                        </p>
                    </div>
                </motion.div>

                {/* BEAT D (Centered CTA) */}
                <motion.div
                    style={{ opacity: opacityD, y: yD }}
                    className="absolute inset-0 flex flex-col items-center justify-center pointer-events-auto px-6"
                >
                    <h2 className="text-3xl md:text-7xl font-bold tracking-tight text-white/90 text-center max-w-5xl leading-tight">
                        {t.hero.beatD.title1}<br /> {t.hero.beatD.title2} <br className="md:hidden" />{t.hero.beatD.title3}
                    </h2>
                    <p className="mt-4 md:mt-6 text-base md:text-2xl text-white/60 font-light tracking-wide text-center mb-8 md:mb-10 px-2">
                        {t.hero.beatD.subtitle}
                    </p>
                    <button
                        onClick={() => {
                            // @ts-expect-error Calendly is injected externally
                            if (window.Calendly) window.Calendly.initPopupWidget({ url: 'https://calendly.com/contact-scalia/auditoria?primary_color=000000&locale=' + locale });
                        }}
                        className="px-6 md:px-8 py-3 md:py-4 bg-white text-black text-xs md:text-sm uppercase tracking-widest font-semibold rounded-full hover:bg-white/90 transition-transform hover:scale-105"
                    >
                        {t.hero.beatD.btn}
                    </button>
                </motion.div>

            </div>
        </div >
    );
}
