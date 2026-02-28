"use client";

import Navbar from "@/components/Navbar";
import ExplorerCanvas from "@/components/ExplorerCanvas";
import ClientMarquee from "@/components/ClientMarquee";
import ZeroRiskOffer from "@/components/ZeroRiskOffer";
import SalesCTA from "@/components/SalesCTA";

export default function Home() {
  return (
    <main className="w-full bg-[#050505] selection:bg-white/20 selection:text-white min-h-screen">
      <Navbar />
      <ExplorerCanvas />

      {/* White transition section starts dynamically after the canvas scroll ends */}
      <div className="w-full bg-white transition-colors duration-1000 relative z-10 rounded-t-[3rem] -mt-10 overflow-hidden shadow-2xl">
        <ClientMarquee />
        <ZeroRiskOffer />
        <SalesCTA />
      </div>
    </main>
  );
}
