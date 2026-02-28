"use client";

import { useLanguage } from "@/components/LanguageProvider";

const clients = [
    "THE-WARMUP.IO",
    "Vertical view.",
    "Vision Plus.",
];

export default function ClientMarquee() {
    const { t } = useLanguage();

    return (
        <section className="w-full bg-white text-black py-20 overflow-hidden border-zinc-100 flex flex-col justify-center">

            {/* Context Header */}
            <div className="max-w-7xl mx-auto px-6 md:px-12 mb-16 text-center">
                <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-6">
                    {t.testimonials.title}
                </h2>
                <p className="text-lg md:text-xl text-zinc-500 max-w-3xl mx-auto font-light leading-relaxed">
                    {t.testimonials.subtitle}
                </p>
            </div>

            {/* Marquee Track Container */}
            <div className="relative flex overflow-x-hidden group bg-white w-full border-y border-zinc-100/50 py-6 md:py-8">
                {/* Left/Right Fade masks for smooth edges */}
                <div className="absolute inset-y-0 left-0 w-24 md:w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
                <div className="absolute inset-y-0 right-0 w-24 md:w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

                {/* Single Continuous Marquee Track */}
                <div className="flex w-max animate-marquee">
                    {/* First Half */}
                    <div className="flex items-center gap-16 md:gap-32 px-8 md:px-16">
                        {clients.map((client, idx) => (
                            <span
                                key={`m1-${idx}`}
                                className="text-3xl md:text-5xl lg:text-5xl font-black tracking-tighter text-zinc-300 transition-colors hover:text-black hover:scale-105 duration-300 ease-out cursor-default whitespace-nowrap"
                            >
                                {client}
                            </span>
                        ))}
                        {clients.map((client, idx) => (
                            <span
                                key={`m1-dup-${idx}`}
                                className="text-3xl md:text-5xl lg:text-5xl font-black tracking-tighter text-zinc-300 transition-colors hover:text-black hover:scale-105 duration-300 ease-out cursor-default whitespace-nowrap"
                            >
                                {client}
                            </span>
                        ))}
                    </div>
                    {/* Second Half (Exact Duplicate) */}
                    <div className="flex items-center gap-16 md:gap-32 px-8 md:px-16">
                        {clients.map((client, idx) => (
                            <span
                                key={`m2-${idx}`}
                                className="text-3xl md:text-5xl lg:text-5xl font-black tracking-tighter text-zinc-300 transition-colors hover:text-black hover:scale-105 duration-300 ease-out cursor-default whitespace-nowrap"
                            >
                                {client}
                            </span>
                        ))}
                        {clients.map((client, idx) => (
                            <span
                                key={`m2-dup-${idx}`}
                                className="text-3xl md:text-5xl lg:text-5xl font-black tracking-tighter text-zinc-300 transition-colors hover:text-black hover:scale-105 duration-300 ease-out cursor-default whitespace-nowrap"
                            >
                                {client}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
