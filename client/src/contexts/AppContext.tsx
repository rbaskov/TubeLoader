import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { Language } from "@/lib/i18n";
import { getTranslation, type Translations } from "@/lib/i18n";

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
  t: Translations;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
  initialLanguage?: Language;
  initialTheme?: "light" | "dark";
}

export function AppProvider({ 
  children, 
  initialLanguage = "en",
  initialTheme = "light"
}: AppProviderProps) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("app-language");
      if (stored === "en" || stored === "ru") return stored;
    }
    return initialLanguage;
  });

  const [theme, setThemeState] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("app-theme");
      if (stored === "light" || stored === "dark") return stored;
    }
    return initialTheme;
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("app-language", lang);
  };

  const setTheme = (newTheme: "light" | "dark") => {
    setThemeState(newTheme);
    localStorage.setItem("app-theme", newTheme);
  };

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  const t = getTranslation(language);

  return (
    <AppContext.Provider value={{ language, setLanguage, theme, setTheme, t }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
