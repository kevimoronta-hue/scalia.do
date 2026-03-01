"use client";

import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import Link from "next/link";
import Image from "next/image";

export default function ContactForm() {
    const { t } = useLanguage();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);

        const formData = new FormData(e.currentTarget);

        // Add Web3Forms Access Key
        formData.append("access_key", "a5846514-ee99-4096-a589-66b04f2a4138");
        // Add subject
        formData.append("subject", "Nouveau prospect : Demande de consultation Scalia !");

        try {
            const response = await fetch("https://api.web3forms.com/submit", {
                method: "POST",
                body: formData,
            });

            if (response.ok) {
                setIsSuccess(true);
            } else {
                console.error("Erreur Web3Forms");
                // Optionnel: Gérer une erreur visible
            }
        } catch (error) {
            console.error("Network Error", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="w-full mx-auto relative">
            {isSuccess ? (
                <div className="bg-[#0A0A0A] border border-white/10 rounded-3xl p-6 md:p-12 text-center shadow-2xl animate-in fade-in zoom-in duration-500 w-full mb-12 relative overflow-hidden">

                    {/* Background Logo Watermark */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] opacity-[0.03] pointer-events-none flex items-center justify-center">
                        <Image src="/logo-red.png" alt="Scalia Shape" width={800} height={800} className="object-contain" priority />
                    </div>

                    <div className="relative z-10 w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm border border-white/20">
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>

                    <h3 className="relative z-10 text-2xl md:text-3xl font-bold text-white mb-4 tracking-tight">
                        {t.contact.success.split('.')[0]}.
                    </h3>
                    <p className="relative z-10 text-white/70 text-lg mb-2">
                        {t.contact.success.split('.').slice(1).join('.').trim()}
                    </p>
                    <p className="relative z-10 text-white/50 text-sm md:text-base font-light mb-10 max-w-2xl mx-auto leading-relaxed">
                        {/* @ts-ignore */}
                        {t.contact.successSubtitle}
                    </p>

                    {/* Calendly Inline Widget */}
                    <div className="relative z-10 w-full h-[700px] rounded-2xl overflow-hidden shadow-sm border border-white/10 bg-[#0A0A0A]">
                        <iframe
                            src="https://calendly.com/contact-scalia?primary_color=ff0000&theme=dark"
                            width="100%"
                            height="100%"
                            frameBorder="0"
                            className="bg-[#0A0A0A]"
                        ></iframe>
                    </div>

                    <div className="relative z-10 mt-8 flex justify-center">
                        <Link href="/">
                            <button className="text-white/40 hover:text-white text-sm tracking-wide transition-colors border-b border-white/20 hover:border-white pb-1">
                                {/* @ts-ignore */}
                                {t.contact.skipBooking}
                            </button>
                        </Link>
                    </div>
                </div>
            ) : (
                <form
                    onSubmit={handleSubmit}
                    className="flex flex-col gap-8 animate-in fade-in relative"
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="flex flex-col gap-2 relative group">
                            <label className="text-sm font-semibold text-zinc-900 tracking-wide">
                                {t.contact.fields.name} <span className="text-red-500">*</span>
                            </label>
                            <input
                                required
                                name="name"
                                type="text"
                                className="w-full bg-transparent border-b border-zinc-300 py-3 text-black placeholder:text-zinc-400 focus:outline-none focus:border-black transition-colors rounded-none"
                            />
                        </div>

                        <div className="flex flex-col gap-2 relative group">
                            <label className="text-sm font-semibold text-zinc-900 tracking-wide">
                                {t.contact.fields.company} <span className="text-red-500">*</span>
                            </label>
                            <input
                                required
                                name="company"
                                type="text"
                                className="w-full bg-transparent border-b border-zinc-300 py-3 text-black placeholder:text-zinc-400 focus:outline-none focus:border-black transition-colors rounded-none"
                            />
                        </div>

                        <div className="flex flex-col gap-2 relative group">
                            <label className="text-sm font-semibold text-zinc-900 tracking-wide">
                                {t.contact.fields.role} <span className="text-red-500">*</span>
                            </label>
                            <input
                                required
                                name="role"
                                type="text"
                                className="w-full bg-transparent border-b border-zinc-300 py-3 text-black placeholder:text-zinc-400 focus:outline-none focus:border-black transition-colors rounded-none"
                            />
                        </div>

                        <div className="flex flex-col gap-2 relative group">
                            <label className="text-sm font-semibold text-zinc-900 tracking-wide">
                                {t.contact.fields.email} <span className="text-red-500">*</span>
                            </label>
                            <input
                                required
                                name="email"
                                type="email"
                                className="w-full bg-transparent border-b border-zinc-300 py-3 text-black placeholder:text-zinc-400 focus:outline-none focus:border-black transition-colors rounded-none"
                            />
                        </div>

                        <div className="flex flex-col gap-2 relative group">
                            <label className="text-sm font-semibold text-zinc-900 tracking-wide">
                                {t.contact.fields.phone}
                            </label>
                            <input
                                name="phone"
                                type="tel"
                                className="w-full bg-transparent border-b border-zinc-300 py-3 text-black placeholder:text-zinc-400 focus:outline-none focus:border-black transition-colors rounded-none"
                            />
                        </div>

                        <div className="flex flex-col gap-2 relative group">
                            <label className="text-sm font-semibold text-zinc-900 tracking-wide">
                                {t.contact.fields.website}
                            </label>
                            <input
                                name="website"
                                type="url"
                                className="w-full bg-transparent border-b border-zinc-300 py-3 text-black placeholder:text-zinc-400 focus:outline-none focus:border-black transition-colors rounded-none"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 relative group">
                        <label className="text-sm font-semibold text-zinc-900 tracking-wide">
                            {t.contact.fields.size} <span className="text-red-500">*</span>
                        </label>
                        <select
                            required
                            name="size"
                            defaultValue=""
                            className="w-full bg-transparent border-b border-zinc-300 py-3 text-black focus:outline-none focus:border-black transition-colors appearance-none cursor-pointer rounded-none"
                        >
                            <option value="" disabled hidden></option>
                            <option value="1">{t.contact.fields.sizeOptions.s1}</option>
                            <option value="2">{t.contact.fields.sizeOptions.s2}</option>
                            <option value="3">{t.contact.fields.sizeOptions.s3}</option>
                            <option value="4">{t.contact.fields.sizeOptions.s4}</option>
                        </select>
                        <div className="absolute right-0 top-1/2 translate-y-2 pointer-events-none text-zinc-400">
                            <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 relative group mt-4">
                        <label className="text-sm font-semibold text-zinc-900 tracking-wide">
                            {t.contact.fields.optimization} <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            required
                            name="optimization"
                            rows={3}
                            className="w-full bg-transparent border-b border-zinc-300 py-3 text-black placeholder:text-zinc-400 focus:outline-none focus:border-black transition-colors resize-none rounded-none"
                        />
                    </div>

                    <div className="flex flex-col gap-2 relative group">
                        <label className="text-sm font-semibold text-zinc-900 tracking-wide">
                            {t.contact.fields.additional}
                        </label>
                        <textarea
                            name="additional"
                            rows={2}
                            className="w-full bg-transparent border-b border-zinc-300 py-3 text-black placeholder:text-zinc-400 focus:outline-none focus:border-black transition-colors resize-none rounded-none"
                        />
                    </div>

                    <div className="flex items-start gap-4 mt-4">
                        <div className="flex items-center h-5 mt-0.5 relative">
                            <input
                                id="terms"
                                name="terms_accepted"
                                type="checkbox"
                                required
                                className="peer w-5 h-5 appearance-none border border-zinc-300 rounded-sm checked:bg-black checked:border-black transition-colors cursor-pointer"
                            />
                            <svg
                                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <label htmlFor="terms" className="text-sm text-zinc-600 cursor-pointer select-none leading-relaxed">
                            {t.contact.fields.terms} <span className="text-red-500">*</span>
                        </label>
                    </div>

                    <div className="mt-8 flex flex-col items-center">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full md:w-auto px-12 py-4 bg-black text-white rounded-full font-medium tracking-wide hover:bg-zinc-800 transition-all active:scale-95 disabled:opacity-70 disabled:pointer-events-none flex items-center justify-center min-w-[200px]"
                        >
                            {isSubmitting ? (
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                t.contact.submit
                            )}
                        </button>
                    </div>

                </form>
            )}

            <div className="mt-16 text-center">
                <p className="text-zinc-500 text-sm">
                    {t.contact.footerNote} <a href={`mailto:${t.contact.emailLink}`} className="text-black font-semibold hover:underline decoration-zinc-300 underline-offset-4 transition-all">{t.contact.emailLink}</a>
                </p>
            </div>
        </div >
    );
}
