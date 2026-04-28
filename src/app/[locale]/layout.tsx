import type { Metadata } from "next";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import GhostNav from '@/components/GhostNav';
import SmoothScroll from '@/components/SmoothScroll';
import LoadingScreen from '@/components/LoadingScreen';
import "../globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: 'swap',
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "SCALIA | Web a tu medida",
  description: "Agencia digital ultra-premium. La excelencia no es una opción.",
};

export default async function RootLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{locale: string}>;
}>) {
  const { locale } = await params;
  
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }
 
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${outfit.variable} ${jakarta.variable} dark`}>
      <body className="antialiased bg-[#050505]">
        <LoadingScreen />
        <SmoothScroll>
          <NextIntlClientProvider messages={messages}>
            <GhostNav />
            {children}
          </NextIntlClientProvider>
        </SmoothScroll>
      </body>
    </html>
  );
}
