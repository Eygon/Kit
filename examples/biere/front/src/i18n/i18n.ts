import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/i18n/locales/en.json";
import fr from "@/i18n/locales/fr.json";
import { isLanguage } from "@/types/enums/i18n/languageEnum";
import { StorageKeyEnum } from "@/types/enums/storage/storageKeyEnum";
import { resolveInitialLanguage } from "@/utils/language/resolveInitialLanguage";
import { localKeyValueStorage } from "@/utils/storage/localKeyValueStorage";

i18n.on("languageChanged", (language) => {
  document.documentElement.lang = language;
  if (isLanguage(language)) localKeyValueStorage.set(StorageKeyEnum.LANGUAGE, language);
});

void i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
  },
  lng: resolveInitialLanguage(),
  fallbackLng: "en",
  initAsync: false,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

document.documentElement.lang = i18n.language;

export default i18n;
