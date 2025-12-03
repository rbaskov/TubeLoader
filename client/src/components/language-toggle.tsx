import { Button } from "@/components/ui/button";
import { useApp } from "@/contexts/AppContext";
import type { Language } from "@/lib/i18n";

export function LanguageToggle() {
  const { language, setLanguage } = useApp();

  const toggleLanguage = () => {
    const newLang: Language = language === "en" ? "ru" : "en";
    setLanguage(newLang);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      data-testid="button-language-toggle"
      className="font-medium text-xs uppercase"
    >
      {language === "en" ? "RU" : "EN"}
    </Button>
  );
}
