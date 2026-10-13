import { describe, expect, it } from "vitest";
import { computeDistanceKm } from "@/modules/venues/geo-distance";

const PARIS = { latitude: 48.8566, longitude: 2.3522 };
const LILLE = { latitude: 50.6292, longitude: 3.0573 };
const ONE_DEGREE_OF_LONGITUDE_AT_EQUATOR_KM = 111.19;

describe("computeDistanceKm", () => {
  it("measures about 204 km between Paris and Lille", () => {
    expect(computeDistanceKm(PARIS, LILLE)).toBeGreaterThan(203);
    expect(computeDistanceKm(PARIS, LILLE)).toBeLessThan(205);
  });

  it("is zero between a point and itself", () => {
    expect(computeDistanceKm(PARIS, PARIS)).toBe(0);
  });

  it("is the same in both directions", () => {
    expect(computeDistanceKm(PARIS, LILLE)).toBe(computeDistanceKm(LILLE, PARIS));
  });

  it("rounds to two decimals on the earth radius of the constants", () => {
    expect(
      computeDistanceKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 }),
    ).toBe(ONE_DEGREE_OF_LONGITUDE_AT_EQUATOR_KM);
    expect(Number.isInteger(computeDistanceKm(PARIS, LILLE) * 100)).toBe(true);
  });
});
