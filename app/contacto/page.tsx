"use client";

import { motion, Variants } from "framer-motion";
import Navbar from "@/components/Navbar";
import ContactForm from "@/components/ContactForm";

export default function ContactoPage() {
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

    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 30 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
        },
    };

    return (
        <main className="min-h-screen bg-white text-black relative w-full selection:bg-black/10 selection:text-black font-sans overflow-hidden">
            <Navbar forceDark={true} />

            {/* Subtle background gradient to frame the page without distracting from the form */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-black/[0.02] blur-[120px] rounded-full pointer-events-none z-0" />

            <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10 pt-40 pb-32 min-h-screen flex flex-col justify-center">
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="w-full max-w-4xl mx-auto bg-white/70 backdrop-blur-2xl border border-white p-8 md:p-16 rounded-[2.5rem] shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] relative overflow-hidden"
                >
                    {/* The Premium Form Component */}
                    <motion.div variants={itemVariants} className="relative z-10">
                        <ContactForm />
                    </motion.div>

                </motion.div>
            </div>
        </main>
    );
}
