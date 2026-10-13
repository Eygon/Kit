import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/i18n/locales/en.json";
import fr from "@/i18n/locales/fr.json";

void i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
  },
  lng: "fr",
  fallbackLng: "en",
  initAsync: false,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export default i18n;
