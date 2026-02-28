"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { Locale, dictionaries, Dictionary } from "@/lib/dictionaries";

interface LanguageContextType {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: Dictionary;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [locale, setLocale] = useState<Locale>("es"); // Default to Spanish as requested

    const value = {
        locale,
        setLocale,
        t: dictionaries[locale],
    };

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return context;
}
