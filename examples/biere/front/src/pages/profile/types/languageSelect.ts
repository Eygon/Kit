import type { LanguageEnum } from "@/types/enums/i18n/languageEnum";

export type LanguageSelectProps = Readonly<{
  selectedLanguage: LanguageEnum;
  onSelectLanguage: (language: LanguageEnum) => void;
}>;
