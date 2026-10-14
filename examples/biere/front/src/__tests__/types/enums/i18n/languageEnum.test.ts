import { isLanguage, LANGUAGE_OPTIONS, LanguageEnum } from "@/types/enums/i18n/languageEnum";

describe("LanguageEnum", () => {
  it("lists french then english with their label keys", () => {
    expect(LanguageEnum.FR).toBe("fr");
    expect(LanguageEnum.EN).toBe("en");
    expect(LANGUAGE_OPTIONS).toEqual([
      { id: "fr", labelKey: "pages.profile.language.options.fr" },
      { id: "en", labelKey: "pages.profile.language.options.en" },
    ]);
  });

  it.each(["fr", "en"])("accepts %s", (value) => {
    expect(isLanguage(value)).toBe(true);
  });

  it.each(["de", "FR", "fr-CA", "", 1, null, undefined])("rejects %j", (value) => {
    expect(isLanguage(value)).toBe(false);
  });
});
