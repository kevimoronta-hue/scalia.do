import { useTranslations } from 'next-intl';
import DroneCanvas from '@/components/DroneCanvas';
import SocialProof from '@/components/SocialProof';
import EditorialShowcase from '@/components/EditorialShowcase';
import VideoTestimonial from '@/components/VideoTestimonial';
import PricingTiers from '@/components/PricingTiers';
import DroneShowcase from '@/components/DroneShowcase';
import FAQ from '@/components/FAQ';
import Footer from '@/components/Footer';
import FloatingWhatsApp from '@/components/FloatingWhatsApp';

export default function Home() {
  const t = useTranslations('HomePage');

  return (
    <main className="min-h-screen bg-black text-[#F5F5F5]">
      {/* 1. HERO SCROLLYTELLING */}
      <DroneCanvas />

      {/* 2. SOCIAL PROOF (Logos) */}
      <SocialProof />

      {/* 3. EDITORIAL SHOWCASE (Bento Grid) */}
      <EditorialShowcase />

      {/* 4. VIDEO TESTIMONIAL (High-Trust) */}
      <VideoTestimonial />

      {/* 5. PRICING TIERS (The Offer) */}
      <PricingTiers />

      {/* 5.5 DRONE SHOWCASE (Production) */}
      <DroneShowcase />

      {/* 6. FAQ (Overcoming Objections) */}
      <FAQ />

      {/* 7. SPACER FINAL & FOOTER CTA */}
      <section className="py-24 md:py-32 lg:py-40 bg-black relative z-20 flex flex-col items-center justify-center text-center px-6">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-16 bg-gradient-to-b from-white/10 to-transparent" />
        <h2 className="font-display text-3xl md:text-5xl lg:text-6xl text-gradient-gold font-light tracking-[0.1em] max-w-3xl leading-relaxed mb-8">
          {t('footerTitle')}
        </h2>
        <div className="w-20 h-[1px] bg-gradient-gold mx-auto mb-12" />
        <a href="https://calendly.com/scalia" target="_blank" rel="noopener noreferrer" className="inline-block px-12 py-5 rounded-full text-xs font-bold tracking-[0.2em] uppercase transition-all duration-300 bg-gradient-gold text-black shadow-[0_0_20px_rgba(201,160,80,0.3)] hover:shadow-[0_0_40px_rgba(201,160,80,0.6)] hover:scale-105">
          {t('whatsapp')}
        </a>
      </section>

      {/* Floating WhatsApp Popup */}
      <FloatingWhatsApp />

      {/* 8. FOOTER */}
      <Footer />
    </main>
  );
}
