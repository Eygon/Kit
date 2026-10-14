import { LanguageEnum } from "@/types/enums/i18n/languageEnum";
import { StorageKeyEnum } from "@/types/enums/storage/storageKeyEnum";
import { resolveInitialLanguage } from "@/utils/language/resolveInitialLanguage";
import { createMemoryKeyValueStorage } from "@/__tests__/utils/memoryKeyValueStorage";

describe("resolveInitialLanguage", () => {
  it.each(["fr-CA", "FR", "fr-FR"])("picks french for the browser language %s on a first launch", (browser) => {

    expect(resolveInitialLanguage(createMemoryKeyValueStorage(), browser)).toBe(LanguageEnum.FR);
  });

  it.each(["de-DE", "en-US", ""])("picks english for the browser language %j on a first launch", (browser) => {
    expect(resolveInitialLanguage(createMemoryKeyValueStorage(), browser)).toBe(LanguageEnum.EN);
  });

  it("lets the remembered language win over the browser language", () => {
    const storage = createMemoryKeyValueStorage({ [StorageKeyEnum.LANGUAGE]: "en" });

    expect(resolveInitialLanguage(storage, "fr-FR")).toBe(LanguageEnum.EN);
  });

  it("lets a remembered french win over an english browser", () => {
    const storage = createMemoryKeyValueStorage({ [StorageKeyEnum.LANGUAGE]: "fr" });

    expect(resolveInitialLanguage(storage, "en-US")).toBe(LanguageEnum.FR);
  });

  it("ignores a remembered value that is not a language and falls back to the browser", () => {
    const storage = createMemoryKeyValueStorage({ [StorageKeyEnum.LANGUAGE]: "de" });

    expect(resolveInitialLanguage(storage, "fr-CA")).toBe(LanguageEnum.FR);
    expect(resolveInitialLanguage(storage, "en-US")).toBe(LanguageEnum.EN);
  });

  it("falls back to the browser language when the storage is blocked", () => {
    const blockedStorage = { get: () => null, set: () => undefined, remove: () => undefined };

    expect(resolveInitialLanguage(blockedStorage, "fr-CA")).toBe(LanguageEnum.FR);
  });

  it("reads the real storage and the navigator language by default", () => {
    window.localStorage.clear();

    expect(resolveInitialLanguage()).toBe(LanguageEnum.FR);

    window.localStorage.setItem(StorageKeyEnum.LANGUAGE, "en");
    expect(resolveInitialLanguage()).toBe(LanguageEnum.EN);
    window.localStorage.clear();
  });
});
