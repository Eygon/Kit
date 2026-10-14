export enum LanguageEnum {
  FR = "fr",
  EN = "en",
}

export const LANGUAGE_OPTIONS: readonly { id: LanguageEnum; labelKey: string }[] = [
  { id: LanguageEnum.FR, labelKey: "pages.profile.language.options.fr" },
  { id: LanguageEnum.EN, labelKey: "pages.profile.language.options.en" },
];

export const isLanguage = (value: unknown): value is LanguageEnum =>
  typeof value === "string" && Object.values<string>(LanguageEnum).includes(value);
