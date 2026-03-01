"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/components/LanguageProvider";
import Navbar from "@/components/Navbar";

export default function AboutPage() {
    const { t } = useLanguage();

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.15,
                delayChildren: 0.3,
            },
        },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const itemVariants: any = {
        hidden: { opacity: 0, y: 30 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
        },
    };

    return (
        <main className="min-h-screen bg-white text-black relative w-full selection:bg-black/10 selection:text-black font-sans">
            <Navbar forceDark={true} />

            {/* 
              Desktop Image Background:
              Absolutely positioned on the left side, covered gracefully with a white horizontal gradient 
              so it fades seamlessly into the right text content.
            */}
            <div className="hidden lg:block absolute top-0 left-0 w-[55%] h-screen pointer-events-none z-0">
                <motion.div
                    initial={{ opacity: 0, filter: "blur(10px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full h-full relative"
                >
                    <img
                        src="/founder.jpg"
                        alt="Scalia Founder"
                        className="w-full h-full object-cover object-[center_top] grayscale-[20%] contrast-[1.1]"
                    />

                    {/* Gradients blending into the white page */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-white" />
                    <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white via-white/50 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white to-transparent" />
                </motion.div>
            </div>

            {/* 
              Mobile Image Header:
              Sits at the top of the page on smaller screens, fading smoothly down into the white background.
            */}
            <div className="block lg:hidden w-full h-[60vh] md:h-[70vh] relative pointer-events-none z-0">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1.5 }}
                    className="w-full h-full relative"
                >
                    <img
                        src="/founder.jpg"
                        alt="Scalia Founder"
                        className="w-full h-full object-cover object-[center_top] grayscale-[20%] contrast-[1.1]"
                    />

                    {/* Gradients blending into the white page */}
                    <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-white via-white/80 to-transparent" />
                    <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/90 to-transparent" />
                </motion.div>
            </div>

            {/* Content Container ensures legibility across all platforms by using Grid */}
            <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10 pt-10 lg:pt-48 pb-32">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

                    {/* Empty spacer for the desktop image */}
                    <div className="hidden lg:block lg:col-span-5 relative pointer-events-none" />

                    {/* Text Container */}
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="lg:col-span-7 relative z-10"
                    >
                        {/* Header Section */}
                        <motion.div variants={itemVariants} className="mb-12 md:mb-16">
                            <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black tracking-tight mb-8 leading-[1.05] text-black drop-shadow-sm">
                                {t.about.title}
                            </h1>
                            {t.about.subtitle && (
                                <p className="text-xl md:text-2xl text-zinc-600 font-light leading-relaxed">
                                    {t.about.subtitle}
                                </p>
                            )}
                        </motion.div>

                        {/* Storytelling Body */}
                        <div className="space-y-8 text-lg md:text-xl text-zinc-800 font-light leading-relaxed">
                            <motion.p variants={itemVariants}>
                                {t.about.p1}
                            </motion.p>

                            <motion.p variants={itemVariants}>
                                {t.about.p2}
                            </motion.p>

                            <motion.div variants={itemVariants} className="pl-6 md:pl-8 border-l-2 border-zinc-300 py-2 my-10">
                                <p className="text-xl md:text-2xl font-medium text-black italic">
                                    {t.about.p3}
                                </p>
                            </motion.div>

                            <motion.p variants={itemVariants}>
                                {t.about.p4}
                            </motion.p>
                        </div>
                    </motion.div>
                </div>
            </div>
        </main>
    );
}
