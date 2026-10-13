import en from "@/i18n/locales/en.json";
import fr from "@/i18n/locales/fr.json";
import { getDeepKeys } from "@/__tests__/utils/getDeepKeys";

const readKey = (locale: unknown, path: string) =>
  path.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], locale);

describe("locales parity", () => {
  it("exposes the same deep keys in en as in fr", () => {
    expect(getDeepKeys(en).sort()).toEqual(getDeepKeys(fr).sort());
  });

  it("has no empty translation in any locale", () => {
    [fr, en].forEach((locale) => {
      getDeepKeys(locale).forEach((key) => expect(readKey(locale, key)).not.toBe(""));
    });
  });

  it("translates the four tab labels in every locale", () => {
    const keys = ["nav.encyclopedia", "nav.map", "nav.journal", "nav.profile"];
    expect(keys.map((key) => readKey(fr, key))).toEqual(["Encyclopédie", "Carte", "Journal", "Profil"]);
    expect(keys.map((key) => readKey(en, key))).toEqual(["Encyclopedia", "Map", "Journal", "Profile"]);
  });
});
