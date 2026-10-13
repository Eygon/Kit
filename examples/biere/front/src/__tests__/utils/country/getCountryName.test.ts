import { getCountryName } from "@/utils/country/getCountryName";

describe("getCountryName", () => {
  it("spells the country out in French", () => {
    expect(getCountryName("BE", "fr")).toBe("Belgique");
    expect(getCountryName("DE", "fr")).toBe("Allemagne");
  });

  it("spells the country out in English", () => {
    expect(getCountryName("BE", "en")).toBe("Belgium");
    expect(getCountryName("DE", "en")).toBe("Germany");
  });

  it("returns an unknown code as is", () => {
    expect(getCountryName("XX", "fr")).toBe("XX");
  });

  it("returns a malformed code as is instead of throwing", () => {
    expect(getCountryName("not-a-region", "en")).toBe("not-a-region");
    expect(getCountryName("", "en")).toBe("");
  });
});
