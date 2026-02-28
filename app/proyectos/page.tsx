"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/components/LanguageProvider";
import Navbar from "@/components/Navbar";

export default function ProjectsPage() {
    const { t } = useLanguage();

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.15,
                delayChildren: 0.2,
            },
        },
    };

    const itemVariants: any = {
        hidden: { opacity: 0, y: 40 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 1, ease: [0.16, 1, 0.3, 1] }
        },
    };

    return (
        <main className="min-h-screen bg-[#FDFDFD] text-black relative overflow-hidden selection:bg-red-500/10 selection:text-red-700 font-sans">
            <Navbar forceDark={true} />

            {/* Extremely subtle background pattern for a premium architectural feel */}
            <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none fixed" />

            {/* Faint Red Glow Top Center */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-red-500/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10 pt-40 pb-40">
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="w-full"
                >
                    {/* Header Section */}
                    <motion.div variants={itemVariants} className="mb-32 md:mb-48 text-center max-w-4xl mx-auto">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="mb-12 flex justify-center"
                        >
                            <img
                                src="/scalia-assets-logo.png"
                                alt="Scalia Assets Logo"
                                className="h-28 md:h-36 lg:h-44 w-auto object-contain mix-blend-multiply opacity-90"
                            />
                        </motion.div>

                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight mb-8 leading-[1.05] text-[#050505]">
                            {t.projects.title}
                        </h1>
                        {t.projects.subtitle && (
                            <p className="text-xl md:text-2xl text-zinc-500 font-light leading-relaxed max-w-2xl mx-auto">
                                {t.projects.subtitle}
                            </p>
                        )}
                    </motion.div>

                    {/* Features Sequence Layout */}
                    <div className="flex flex-col gap-32 md:gap-48 relative">
                        {/* Central Vertical Timeline Spine */}
                        <div className="hidden lg:block absolute left-1/2 top-10 bottom-10 w-[1px] bg-gradient-to-b from-transparent via-black/10 to-transparent -translate-x-1/2" />

                        {t.projects.features.map((feature, index) => {
                            const isEven = index % 2 === 0;
                            const titleParts = feature.title.split('. ');
                            const num = titleParts[0];
                            const text = titleParts.slice(1).join('. ');

                            return (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 60 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, margin: "-100px" }}
                                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                                    className={`flex flex-col lg:flex-row items-center gap-12 lg:gap-24 relative`}
                                >
                                    {/* Giant Number Watermark */}
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[30vw] md:text-[20vw] font-black text-black/[0.02] pointer-events-none select-none z-0 tracking-tighter">
                                        {num}
                                    </div>

                                    {/* Timeline Node (center dot) */}
                                    <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-red-500 z-20 items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-600" />
                                    </div>

                                    {/* Content Section (alternates left/right) */}
                                    <div className={`w-full lg:w-1/2 relative z-10 flex flex-col ${isEven ? 'lg:pr-16 text-left' : 'lg:order-2 lg:pl-16 text-left lg:text-left'}`}>
                                        <div className={`flex items-center gap-3 mb-8`}>
                                            <span className="w-8 h-[2px] bg-red-500" />
                                            <span className="text-sm font-bold tracking-[0.25em] text-red-600 uppercase">
                                                {feature.tag}
                                            </span>
                                        </div>
                                        <h2 className="text-4xl md:text-5xl lg:text-[3.5rem] font-black tracking-tight text-[#050505] mb-8 leading-[1.1]">
                                            {text}
                                        </h2>
                                        <p className="text-xl md:text-2xl text-zinc-500 font-light leading-relaxed">
                                            {feature.desc}
                                        </p>
                                    </div>

                                    {/* Points Cards Section */}
                                    <div className={`w-full lg:w-1/2 relative z-10 flex flex-col gap-6 ${isEven ? 'lg:pl-16' : 'lg:order-1 lg:pr-16'}`}>
                                        {feature.points.map((point, ptIdx) => (
                                            <div
                                                key={ptIdx}
                                                className="bg-white border border-zinc-200/80 p-8 md:p-10 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.03)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-500 group relative overflow-hidden"
                                            >
                                                {/* Left Accent Bar on Hover */}
                                                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-zinc-200 group-hover:bg-red-500 transition-colors duration-500" />

                                                <h3 className="text-xl md:text-2xl font-bold text-[#050505] mb-4 pl-3">
                                                    {point.name}
                                                </h3>
                                                <p className="text-lg text-zinc-500 font-light leading-relaxed pl-3">
                                                    {point.text}
                                                </p>
                                            </div>
                                        ))}
                                    </div>

                                </motion.div>
                            );
                        })}
                    </div>

                </motion.div>
            </div>
        </main>
    );
}
