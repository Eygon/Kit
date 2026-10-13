import { formatDistance } from "@/pages/map/utils/formatDistance";

const format = (distanceKm: number, language: string) => formatDistance(distanceKm, language).replace(/\s/g, " ");

describe("formatDistance", () => {
  it("AC1 writes a short distance in meters", () => {
    expect(format(0.35, "fr")).toBe("350 m");
    expect(format(0.35, "en")).toBe("350 m");
  });

  it("rounds meters to the nearest ten", () => {
    expect(format(0.354, "fr")).toBe("350 m");
    expect(format(0.356, "fr")).toBe("360 m");
    expect(format(0, "fr")).toBe("0 m");
  });

  it("AC1 writes a distance from one kilometer with one decimal, in the language of the reader", () => {
    expect(format(1.2, "fr")).toBe("1,2 km");
    expect(format(1.2, "en")).toBe("1.2 km");
    expect(format(12.34, "en")).toBe("12.3 km");
  });

  it("switches to kilometers at one kilometer and when rounding reaches it", () => {
    expect(format(1, "en")).toBe("1.0 km");
    expect(format(0.9996, "en")).toBe("1.0 km");
  });
});
