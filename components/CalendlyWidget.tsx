"use client";

import { useEffect } from "react";
import Script from "next/script";
import { useLanguage } from "@/components/LanguageProvider";

export default function CalendlyWidget() {
    const { locale } = useLanguage();

    const textMap: Record<string, string> = {
        es: "Programe una reunión con Scalia",
        fr: "Planifiez une réunion avec Scalia",
        en: "Schedule a meeting with Scalia",
        it: "Programma una riunione con Scalia",
        de: "Buchen Sie ein Meeting mit Scalia"
    };

    useEffect(() => {
        const initCalendly = () => {
            // @ts-expect-error
            if (window.Calendly) {
                // @ts-expect-error
                if (window.Calendly.destroyBadgeWidget) {
                    // @ts-expect-error
                    window.Calendly.destroyBadgeWidget();
                }

                // @ts-expect-error
                window.Calendly.initBadgeWidget({
                    url: 'https://calendly.com/contact-scalia?primary_color=000000',
                    text: textMap[locale] || textMap.es,
                    color: '#000000',
                    textColor: '#ffffff',
                    branding: false
                });
            }
        };

        initCalendly();

        const handleLoad = () => initCalendly();
        window.addEventListener('calendly-loaded', handleLoad);

        return () => {
            window.removeEventListener('calendly-loaded', handleLoad);
            // Cleanup on unmount
            // @ts-expect-error
            if (window.Calendly && window.Calendly.destroyBadgeWidget) {
                // @ts-expect-error
                window.Calendly.destroyBadgeWidget();
            }
        };
    }, [locale]);

    return (
        <>
            {/* eslint-disable-next-line @next/next/no-css-tags */}
            <link href="https://assets.calendly.com/assets/external/widget.css" rel="stylesheet" />
            <Script
                src="https://assets.calendly.com/assets/external/widget.js"
                strategy="lazyOnload"
                onLoad={() => {
                    window.dispatchEvent(new Event('calendly-loaded'));
                }}
            />
        </>
    );
}
