import i18n from "@/i18n/i18n";

describe("i18n", () => {
  afterEach(async () => {
    await i18n.changeLanguage("fr");
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
});
