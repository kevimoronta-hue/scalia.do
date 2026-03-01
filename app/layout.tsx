import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/components/LanguageProvider";
import Footer from "@/components/Footer";
import CalendlyWidget from "@/components/CalendlyWidget";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SCALIA | Ingeniería de Infraestructura Digital",
  description: "Ingeniería de sistemas y automatización inteligente para empresas en hipercrecimiento.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-[#050505] text-white overflow-x-hidden`} >
        <LanguageProvider>
          {children}
          <Footer />
          <CalendlyWidget />
        </LanguageProvider>
      </body>
    </html>
  );
}
