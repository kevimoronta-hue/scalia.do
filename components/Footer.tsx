"use client";

import { useLanguage } from "@/components/LanguageProvider";

export default function Footer() {
    const { t } = useLanguage();

    return (
        <footer className="w-full bg-[#050505] text-zinc-400 py-8 md:py-10 border-t border-white/5 relative z-50">
            <div className="max-w-7xl mx-auto px-6 md:px-12 text-xs md:text-sm tracking-wide font-light">

                {/* DESKTOP: 3-column grid — socials left, copyright center, empty right for balance */}
                <div className="hidden md:grid md:grid-cols-3 items-center">
                    {/* Left — Social Media */}
                    <div className="flex items-center gap-5">
                        <a
                            href="https://www.linkedin.com/in/kevi-moronta/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-zinc-500 hover:text-white hover:-translate-y-1 transition-all duration-300 flex items-center justify-center group"
                            aria-label="LinkedIn"
                        >
                            <svg className="w-5 h-5 group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all duration-300" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" />
                            </svg>
                        </a>
                        <a
                            href="https://www.instagram.com/scalia.do/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-zinc-500 hover:text-white hover:-translate-y-1 transition-all duration-300 flex items-center justify-center group"
                            aria-label="Instagram"
                        >
                            <svg className="w-5 h-5 group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all duration-300" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path fillRule="evenodd" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" clipRule="evenodd" />
                            </svg>
                        </a>
                        <a
                            href="https://wa.me/18097064988"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-zinc-500 hover:text-white hover:-translate-y-1 transition-all duration-300 flex items-center justify-center group"
                            aria-label="WhatsApp"
                        >
                            <svg className="w-5 h-5 group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all duration-300" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path fillRule="evenodd" d="M11.996 2C6.48 2 2.003 6.477 2.003 11.995c0 1.954.512 3.868 1.488 5.54L2.003 22l4.587-1.192c1.611.884 3.444 1.35 5.309 1.35h.005C17.414 22.158 21.895 17.68 21.895 12.164 21.895 9.492 20.855 6.986 18.966 5.093c-1.89-1.893-4.402-2.936-7.076-2.936zM11.996 19.982c-1.636 0-3.238-.439-4.639-1.268l-.333-.198-3.45.904.921-3.364-.217-.346C3.36 14.197 2.87 12.56 2.87 10.875 2.87 5.845 6.969 1.744 12.001 1.744c2.433 0 4.717.948 6.438 2.671 1.722 1.724 2.67 4.01 2.67 6.444.025 5.048-4.088 9.141-9.113 9.141v-.018zM17.062 13.916c-.279-.139-1.644-.812-1.898-.905-.254-.093-.439-.139-.624.139-.185.278-.716.905-.878 1.09-.162.185-.323.208-.602.069-.279-.139-1.173-.432-2.235-1.38-.826-.738-1.385-1.649-1.547-1.927-.162-.278-.017-.428.122-.567.126-.125.279-.323.418-.485.139-.162.185-.278.278-.463.093-.185.046-.347-.024-.486-.069-.139-.624-1.503-.854-2.06-.225-.544-.453-.473-.624-.483l-.532-.01c-.185 0-.486.069-.74.347-.254.278-.971.95-.971 2.316 0 1.366.994 2.686 1.133 2.871.139.185 1.96 2.993 4.745 4.195 2.158.932 2.877%2091 3.522.766.645-.145 2.031-.83 2.319-1.632.288-.802.288-1.491.202-1.632-.086-.14-.318-.225-.597-.364z" clipRule="evenodd" />
                            </svg>
                        </a>
                        <a
                            href="mailto:contact@scalia.do"
                            className="text-zinc-500 hover:text-white hover:-translate-y-1 transition-all duration-300 flex items-center justify-center group"
                            aria-label="Email"
                        >
                            <svg className="w-5 h-5 group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all duration-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-4 4 4 4 0 004-4zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9" />
                            </svg>
                        </a>
                    </div>

                    {/* Center — Logo + Copyright */}
                    <div className="flex items-center justify-center gap-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/footer-logo.png"
                            alt="Scalia Logo"
                            className="h-10 w-auto object-contain drop-shadow-sm"
                        />
                        <div className="w-px h-6 bg-white/10"></div>
                        <span className="text-zinc-500 whitespace-nowrap">{t.footer.copy}</span>
                    </div>

                    {/* Right — Empty spacer for symmetry */}
                    <div></div>
                </div>

                {/* MOBILE: Stacked layout, everything centered */}
                <div className="flex flex-col items-center gap-5 md:hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/footer-logo.png"
                        alt="Scalia Logo"
                        className="h-8 w-auto object-contain drop-shadow-sm"
                    />
                    <span className="text-zinc-500 text-center">{t.footer.copy}</span>
                    <div className="flex items-center gap-6">
                        <a href="https://www.linkedin.com/in/kevi-moronta/" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-white transition-all duration-300" aria-label="LinkedIn">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" />
                            </svg>
                        </a>
                        <a href="https://www.instagram.com/scalia.do/" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-white transition-all duration-300" aria-label="Instagram">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path fillRule="evenodd" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" clipRule="evenodd" />
                            </svg>
                        </a>
                        <a href="https://wa.me/18097064988" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-white transition-all duration-300" aria-label="WhatsApp">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path fillRule="evenodd" d="M11.996 2C6.48 2 2.003 6.477 2.003 11.995c0 1.954.512 3.868 1.488 5.54L2.003 22l4.587-1.192c1.611.884 3.444 1.35 5.309 1.35h.005C17.414 22.158 21.895 17.68 21.895 12.164 21.895 9.492 20.855 6.986 18.966 5.093c-1.89-1.893-4.402-2.936-7.076-2.936zM11.996 19.982c-1.636 0-3.238-.439-4.639-1.268l-.333-.198-3.45.904.921-3.364-.217-.346C3.36 14.197 2.87 12.56 2.87 10.875 2.87 5.845 6.969 1.744 12.001 1.744c2.433 0 4.717.948 6.438 2.671 1.722 1.724 2.67 4.01 2.67 6.444.025 5.048-4.088 9.141-9.113 9.141v-.018zM17.062 13.916c-.279-.139-1.644-.812-1.898-.905-.254-.093-.439-.139-.624.139-.185.278-.716.905-.878 1.09-.162.185-.323.208-.602.069-.279-.139-1.173-.432-2.235-1.38-.826-.738-1.385-1.649-1.547-1.927-.162-.278-.017-.428.122-.567.126-.125.279-.323.418-.485.139-.162.185-.278.278-.463.093-.185.046-.347-.024-.486-.069-.139-.624-1.503-.854-2.06-.225-.544-.453-.473-.624-.483l-.532-.01c-.185 0-.486.069-.74.347-.254.278-.971.95-.971 2.316 0 1.366.994 2.686 1.133 2.871.139.185 1.96 2.993 4.745 4.195 2.158.932 2.877%2091 3.522.766.645-.145 2.031-.83 2.319-1.632.288-.802.288-1.491.202-1.632-.086-.14-.318-.225-.597-.364z" clipRule="evenodd" />
                            </svg>
                        </a>
                        <a href="mailto:contact@scalia.do" className="text-zinc-500 hover:text-white transition-all duration-300" aria-label="Email">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-4 4 4 4 0 004-4zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9" />
                            </svg>
                        </a>
                    </div>
                </div>

            </div>
        </footer>
    );
}
