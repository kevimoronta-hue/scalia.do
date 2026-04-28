'use client';

import { useState, useEffect } from 'react';
import { motion, useScroll, AnimatePresence } from 'framer-motion';

export default function FloatingWhatsApp() {
  const [isVisible, setIsVisible] = useState(false);
  const { scrollY } = useScroll();
  
  useEffect(() => {
    return scrollY.on('change', (latest) => {
      // Apparition beaucoup plus tôt (dès qu'on commence à scroller l'intro)
      const threshold = window.innerHeight * 0.3;
      setIsVisible(latest > threshold);
    });
  }, [scrollY]);

  const phoneNumber = "33769965798"; 
  const message = "Hola Scalia, quiero escalar mi marca al siguiente nivel.";
  const waLink = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          initial={{ opacity: 0, y: 50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.8 }}
          transition={{ duration: 0.5, type: "spring", bounce: 0.4 }}
          className="fixed bottom-6 right-6 md:bottom-10 md:right-10 z-50 flex items-center justify-end pointer-events-none"
        >
          
          {/* Tooltip / Prompt Premium */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="mr-4 px-4 py-2 bg-[#0A0A0A]/80 backdrop-blur-md border border-white/10 rounded-xl hidden md:flex items-center shadow-2xl"
          >
            <span className="text-white/70 font-sans text-xs tracking-wider">¿Hablamos de tu marca?</span>
          </motion.div>

          {/* Bouton WhatsApp VIP (Gold Gradient) */}
          <motion.a 
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto relative group flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-[#F4D068] via-[#C9A050] to-[#967425] shadow-[0_0_30px_rgba(201,160,80,0.4)] hover:shadow-[0_0_50px_rgba(201,160,80,0.7)] transition-all duration-300 hover:scale-105"
            animate={{ 
              boxShadow: ["0px 0px 20px rgba(201,160,80,0.3)", "0px 0px 40px rgba(201,160,80,0.6)", "0px 0px 20px rgba(201,160,80,0.3)"],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* Inner Border Highlight */}
            <div className="absolute inset-0 rounded-full border border-white/40 pointer-events-none" />
            
            {/* Glow de fond pour effet de pulsation */}
            <div className="absolute inset-0 rounded-full border-2 border-[#C9A050] opacity-40 animate-ping" style={{ animationDuration: '3s' }} />
            
            {/* Le véritable logo officiel de WhatsApp (Haut Contraste Noir) avec padding pour éviter la bavure */}
            <svg 
              viewBox="-2 -2 28 28" fill="currentColor" 
              className="relative z-10 w-7 h-7 md:w-8 md:h-8 text-[#050505] drop-shadow-sm"
            >
              <path d="M12.031 0C5.388 0 0 5.385 0 12.029c0 2.124.553 4.195 1.605 6.023L.044 24l6.105-1.601A11.97 11.97 0 0012.031 24c6.643 0 12.03-5.385 12.03-12.028C24.062 5.385 18.675 0 12.031 0zm.006 20.103a9.92 9.92 0 01-5.068-1.385l-.363-.215-3.766.988 1.004-3.67-.236-.375A9.914 9.914 0 012.062 12.03c0-5.485 4.464-9.948 9.95-9.948s9.949 4.463 9.949 9.948c0 5.485-4.464 9.948-9.95 9.948z" />
              <path d="M17.585 14.476c-.302-.15-1.785-.882-2.061-.982-.276-.1-.478-.15-.678.151-.201.302-.781.982-.956 1.183-.176.201-.352.226-.654.075-.302-.15-1.275-.47-2.427-1.499-.896-.801-1.503-1.79-1.678-2.091-.176-.301-.019-.465.132-.616.136-.135.302-.352.453-.527.151-.176.201-.302.302-.503.1-.201.05-.377-.025-.528-.075-.15-.678-1.635-.929-2.239-.245-.59-.494-.51-.678-.519-.176-.008-.377-.008-.578-.008-.201 0-.528.075-.804.377-.276.302-1.055 1.03-1.055 2.513 0 1.483 1.08 2.915 1.231 3.116.151.201 2.126 3.243 5.148 4.549.719.31 1.28.496 1.718.634.722.23 1.379.198 1.898.12.579-.086 1.785-.729 2.036-1.433.251-.704.251-1.307.176-1.433-.075-.126-.276-.201-.578-.352z" />
            </svg>
          </motion.a>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
