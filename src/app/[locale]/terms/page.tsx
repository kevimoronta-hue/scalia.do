import { useTranslations } from 'next-intl';
import Footer from '@/components/Footer';

export default function TermsPage() {
  const t = useTranslations('Terms');

  return (
    <main className="min-h-screen flex flex-col bg-[#050505] text-[#F5F5F5] pt-[150px]">
      <div className="flex-grow w-full max-w-4xl mx-auto px-6 md:px-12 pb-32">
        
        {/* Header Section */}
        <div className="mb-16">
          <h1 className="font-display text-4xl md:text-5xl text-gold-base font-light mb-4">
            {t('title')}
          </h1>
          <p className="font-sans text-white/50 text-sm tracking-widest uppercase">
            {t('updated')}
          </p>
        </div>

        {/* Content Section */}
        <div className="prose prose-invert prose-p:font-sans prose-p:text-white/80 prose-p:leading-relaxed prose-p:text-base md:prose-p:text-lg max-w-none">
          <p className="mb-12 text-white/90 text-lg leading-relaxed">
            {t('intro')}
          </p>

          <div className="space-y-12">
            {[1, 2, 3, 4, 5, 6, 7].map((num) => (
              <section key={num} className="border-l border-white/10 pl-6 md:pl-10">
                <h2 className="font-display text-2xl text-white mb-4">
                  {t(`s${num}Title` as any)}
                </h2>
                <p>
                  {t(`s${num}Content` as any)}
                </p>
              </section>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
