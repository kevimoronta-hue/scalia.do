'use client';

import { Link } from '@/i18n/routing';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

export default function Footer() {
  const t = useTranslations('Footer');

  return (
    <footer className="relative z-20 bg-black border-t border-white/5 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col items-center justify-center">
        
        {/* Main Content Area - Centered on Mobile, Split on PC */}
        <div className="flex flex-col md:flex-row items-center md:items-start md:justify-between gap-10 mb-16 w-full">
          
          {/* Logo - Strictly same size as Header (140x70) */}
          <Link href="/" className="inline-block relative w-[140px] h-[70px] opacity-80 hover:opacity-100 transition-opacity">
            <Image 
              src="/logo.png" 
              alt="SCALIA Logo" 
              fill
              className="object-contain"
            />
          </Link>

          {/* Social & Contact Icons - Centered on Mobile, Right on PC */}
          <div className="flex flex-wrap justify-center md:justify-end gap-4 text-center">
            
            {/* Instagram */}
            <a href="https://instagram.com/scalia.do" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-11 h-11 flex items-center justify-center rounded-full border border-white/10 text-[#F5F5F5]/80 hover:text-gold-light hover:border-gold-base/50 transition-all duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
              </svg>
            </a>

            {/* LinkedIn */}
            <a href="https://www.linkedin.com/in/kevi-moronta" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="w-11 h-11 flex items-center justify-center rounded-full border border-white/10 text-[#F5F5F5]/80 hover:text-gold-light hover:border-gold-base/50 transition-all duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
                <rect width="4" height="12" x="2" y="9"/>
                <circle cx="4" cy="4" r="2"/>
              </svg>
            </a>

            {/* WhatsApp */}
            <a href="https://wa.me/33769965798" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="w-11 h-11 flex items-center justify-center rounded-full border border-white/10 text-[#F5F5F5]/80 hover:text-gold-light hover:border-gold-base/50 transition-all duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                <path d="M9.5 9.5c.3-.3.8-.3 1.1 0l.9.9c.2.2.3.6.1.8l-.5.7c-.2.2-.2.5-.1.8.4.8 1 1.4 1.8 1.8.3.1.6.1.8-.1l.7-.5c.2-.2.6-.1.8.1l.9.9c.3.3.3.8 0 1.1l-.8.8c-.4.4-1.1.5-1.7.3-1.6-.5-3-1.6-4.1-2.9-1-1.3-1.8-2.8-2.1-4.4-.1-.6 0-1.3.4-1.7l.8-.8z"/>
              </svg>
            </a>

            {/* Mail */}
            <a href="mailto:contact@scalia.do" aria-label="Mail" className="w-11 h-11 flex items-center justify-center rounded-full border border-white/10 text-[#F5F5F5]/80 hover:text-gold-light hover:border-gold-base/50 transition-all duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="16" x="2" y="4" rx="2"/>
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
              </svg>
            </a>
            
          </div>

        </div>

        {/* Bottom Bar: Copyright & Legals - Fully Centered Stack */}
        <div className="flex flex-col items-center gap-6 border-t border-white/5 pt-8 w-full">
          <p className="text-[#F5F5F5]/60 text-[9px] md:text-[10px] font-sans font-light tracking-[0.2em] uppercase text-center">
            © {new Date().getFullYear()} {t('brand')}. {t('allRightsReserved')}
          </p>
          
          <div className="flex gap-6 justify-center">
            <Link href="/terms" className="text-[#F5F5F5]/60 hover:text-white transition-colors text-[9px] md:text-[10px] font-sans font-light tracking-[0.2em] uppercase">
              {t('terms')}
            </Link>
            <Link href="/privacy" className="text-[#F5F5F5]/60 hover:text-white transition-colors text-[9px] md:text-[10px] font-sans font-light tracking-[0.2em] uppercase">
              {t('privacy')}
            </Link>
          </div>
        </div>
        
      </div>
    </footer>
  );
}
