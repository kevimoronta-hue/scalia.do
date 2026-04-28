'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

export default function VideoTestimonial() {
  const t = useTranslations('VideoTestimonial');
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // We use the #t=0.001 trick in the src to force iOS/mobile to load the first frame natively.
  // No canvas needed.

  const handlePlay = () => {
    if (videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current.currentTime = 0;
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <section className="py-24 md:py-32 lg:py-40 px-6 md:px-12 max-w-7xl mx-auto bg-black relative z-10">
      <div className="flex flex-col items-center">
        
        {/* Title Above Video */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12 flex flex-col items-center"
        >
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl text-white font-light tracking-tight mb-8">
            {t('tag')}
          </h2>
          <div className="w-20 h-[1px] bg-gradient-gold mx-auto" />
        </motion.div>

        {/* Story Format Card */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="relative w-full max-w-md aspect-[9/16] bg-[#0A0A0A] rounded-3xl md:rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl group"
        >
          {/* Main Video Element — #t=0.001 forces first frame load on iOS */}
          <div className={`absolute inset-0 bg-[#0A0A0A] transition-opacity duration-300 ${isPlaying ? 'opacity-100' : 'opacity-100'}`}>
            <video 
              ref={videoRef}
              src="/scalia-2-assets/testimonio.mp4#t=0.001"
              preload="metadata"
              playsInline
              muted={!isPlaying}
              controls={isPlaying}
              className="w-full h-full object-cover"
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            >
              <source src="/scalia-2-assets/testimonio.mp4#t=0.001" type="video/mp4" />
            </video>
          </div>
          
          {/* Custom Overlay & Play Button */}
          <div 
            className={`absolute inset-0 transition-opacity duration-500 cursor-pointer ${isPlaying ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
            onClick={handlePlay}
          >
            {/* Pro Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 group-hover:bg-black/20 transition-colors duration-500" />
            
            {/* Animated Play Button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border border-white/20 group-hover:bg-white/20 transition-all duration-300 group-hover:scale-110">
                <div className="absolute inset-0 rounded-full border border-gold-base/50 animate-ping opacity-50" />
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1 text-white">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Visual Quote (Neo-Luxury Style) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-12 text-center max-w-2xl px-4 flex flex-col items-center gap-6"
        >
          <p className="font-sans text-3xl md:text-5xl text-white font-extrabold tracking-tighter leading-tight drop-shadow-md">
            {t('quote')}
          </p>
          <div className="flex flex-col items-center gap-1">
            <span className="font-sans text-white/90 text-lg md:text-xl font-medium tracking-wide">
              {t('authorName')}
            </span>
            <span className="font-sans text-white/50 text-xs md:text-sm tracking-widest uppercase">
              {t('authorTitle')}
            </span>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
