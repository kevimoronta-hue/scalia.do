"use client";

import { useEffect, useRef, useState } from "react";
import { useScroll, useSpring, useTransform, motion } from "framer-motion";

const TOTAL_FRAMES = 192;
const START_FRAME = 165; // User specified start index

const getFramePath = (index: number) => {
    const paddedIndex = index.toString().padStart(3, "0");
    return `/img/ffffff-ezgif-7d5685901d4716d9-jxl-jpg/frame_${paddedIndex}_delay-0.04s.jpg`;
};

export default function ScaliaCanvas({ children }: { children?: React.ReactNode }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [loadedFrames, setLoadedFrames] = useState(0);
    const [isLoaded, setIsLoaded] = useState(false);
    const imagesRef = useRef<HTMLImageElement[]>([]);

    // Preload images
    useEffect(() => {
        let loaded = 0;
        const images: HTMLImageElement[] = [];

        for (let i = 0; i < TOTAL_FRAMES; i++) {
            const img = new Image();
            img.src = getFramePath(i);
            img.onload = () => {
                loaded++;
                setLoadedFrames(loaded);
                if (loaded === TOTAL_FRAMES) setIsLoaded(true);
            };
            img.onerror = () => {
                loaded++;
                setLoadedFrames(loaded);
                if (loaded === TOTAL_FRAMES) setIsLoaded(true);
            };
            images[i] = img;
        }

        imagesRef.current = images;
    }, []);

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    const smoothProgress = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    const currentFrame = useTransform(smoothProgress, [0, 1], [0, TOTAL_FRAMES - 1]);

    useEffect(() => {
        if (!isLoaded || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx) return;

        let animationFrameId: number;

        const render = () => {
            const progressIndex = Math.round(currentFrame.get());
            const displayIndex = (START_FRAME + progressIndex) % TOTAL_FRAMES;
            const img = imagesRef.current[displayIndex];

            if (img && img.complete && img.naturalWidth !== 0) {
                ctx.fillStyle = '#050505';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                const hRatio = canvas.width / img.width;
                const vRatio = canvas.height / img.height;
                const ratio = Math.min(hRatio, vRatio);

                const centerShift_x = (canvas.width - img.width * ratio) / 2;
                const centerShift_y = (canvas.height - img.height * ratio) / 2;

                ctx.drawImage(
                    img,
                    0, 0, img.width, img.height,
                    centerShift_x, centerShift_y, img.width * ratio, img.height * ratio
                );
            }
        };

        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            render();
        };

        window.addEventListener("resize", handleResize);
        handleResize();

        const unsubscribe = currentFrame.on("change", () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            animationFrameId = requestAnimationFrame(render);
        });

        return () => {
            unsubscribe();
            window.removeEventListener("resize", handleResize);
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };
    }, [isLoaded, currentFrame]);

    return (
        <div ref={containerRef} className="relative w-full h-[500vh] bg-[#050505]">
            <div className="sticky top-0 w-full h-screen overflow-hidden flex flex-col items-center justify-center">
                {!isLoaded && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#050505]">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5 }}
                            className="text-white/80 text-sm font-medium tracking-[0.2em] mb-6 uppercase"
                        >
                            Scalia is optimizing...
                        </motion.div>
                        <div className="w-64 h-1 bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-[#E50914] rounded-full shadow-[0_0_10px_rgba(229,9,20,0.8)]"
                                style={{ width: `${(loadedFrames / TOTAL_FRAMES) * 100}%` }}
                                transition={{ ease: "linear", duration: 0.1 }}
                            />
                        </div>
                        <div className="mt-4 text-white/40 text-xs font-mono">
                            {Math.round((loadedFrames / TOTAL_FRAMES) * 100)}%
                        </div>
                    </div>
                )}

                <motion.canvas
                    ref={canvasRef}
                    className="w-full h-full object-contain"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isLoaded ? 1 : 0 }}
                    transition={{ duration: 1.2, ease: "easeInOut" }}
                />
            </div>

            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                {children}
            </div>
        </div>
    );
}
