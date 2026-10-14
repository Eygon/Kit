import { formatRating } from "@/utils/beer/formatRating";

describe("formatRating", () => {
  it("always shows one decimal, with a comma in French", () => {
    expect(formatRating(4, "fr")).toBe("4,0");
    expect(formatRating(4.25, "fr")).toBe("4,3");
    expect(formatRating(1, "fr")).toBe("1,0");
    expect(formatRating(5, "fr")).toBe("5,0");
  });

  it("uses the decimal point in English", () => {
    expect(formatRating(4, "en")).toBe("4.0");
    expect(formatRating(4.2, "en")).toBe("4.2");
  });
});
