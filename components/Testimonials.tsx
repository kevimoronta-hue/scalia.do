"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/components/LanguageProvider";

export default function Testimonials() {
    const { t } = useLanguage();

    return (
        <section className="w-full bg-white text-black py-32 px-6 md:px-12 relative overflow-hidden">
            <div className="max-w-7xl mx-auto">
                <div className="mb-20">
                    <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
                        {t.testimonials.title}
                    </h2>
                    <p className="text-lg md:text-xl text-zinc-500 max-w-2xl font-light">
                        {t.testimonials.subtitle}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 relative z-10">
                    {t.testimonials.reviews.map((testimonial, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.8, delay: idx * 0.2, ease: [0.16, 1, 0.3, 1] }}
                            className="bg-zinc-50 border border-zinc-100 p-10 flex flex-col justify-between group hover:shadow-xl hover:border-zinc-200 transition-all duration-500"
                        >
                            <div className="mb-8">
                                {/* Minimalist quote icon */}
                                <svg className="w-8 h-8 text-black/20 mb-6 group-hover:text-black transition-colors duration-500" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                                </svg>
                                <p className="text-xl md:text-2xl leading-relaxed font-light text-zinc-800">
                                    {testimonial.quote}
                                </p>
                            </div>

                            <div>
                                <div className="w-12 h-px bg-zinc-300 mb-6" />
                                <h4 className="font-semibold text-lg">{testimonial.author}</h4>
                                <p className="text-zinc-500 text-sm mt-1">{testimonial.role}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
