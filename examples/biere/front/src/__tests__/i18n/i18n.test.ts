import i18n from "@/i18n/i18n";
import { StorageKeyEnum } from "@/types/enums/storage/storageKeyEnum";

describe("i18n", () => {
  beforeEach(() => window.localStorage.clear());

  afterEach(async () => {
    await i18n.changeLanguage("fr");
    window.localStorage.clear();
  });

  it("starts in french", () => {
    expect(i18n.language).toBe("fr");
    expect(i18n.t("nav.map")).toBe("Carte");
  });

  it("translates to english on demand", async () => {
    await i18n.changeLanguage("en");

    expect(i18n.t("nav.map")).toBe("Map");
  });

  it("falls back to english for an unknown language", async () => {
    await i18n.changeLanguage("de");

    expect(i18n.t("nav.profile")).toBe("Profile");
  });

  it("writes the language on the html element at startup", () => {
    expect(document.documentElement.lang).toBe("fr");
  });

  it("updates the html lang and remembers the language when it changes", async () => {
    await i18n.changeLanguage("en");

    expect(document.documentElement.lang).toBe("en");
    expect(window.localStorage.getItem(StorageKeyEnum.LANGUAGE)).toBe("en");
  });

  it("does not remember a language the app does not offer", async () => {
    await i18n.changeLanguage("en");
    await i18n.changeLanguage("de");

    expect(document.documentElement.lang).toBe("de");
    expect(window.localStorage.getItem(StorageKeyEnum.LANGUAGE)).toBe("en");
  });

  it("starts in the remembered language when the module is loaded again", async () => {
    window.localStorage.setItem(StorageKeyEnum.LANGUAGE, "en");
    vi.resetModules();

    const { default: reloadedI18n } = await import("@/i18n/i18n");

    expect(reloadedI18n.language).toBe("en");
    expect(reloadedI18n.t("nav.map")).toBe("Map");
    expect(document.documentElement.lang).toBe("en");
  });
});
