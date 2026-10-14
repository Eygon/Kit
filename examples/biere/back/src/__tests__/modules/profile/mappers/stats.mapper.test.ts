import { describe, expect, it } from "vitest";
import { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";
import { toCountryCountDto, toMonthlyCountDto, toStatsDto } from "@/modules/profile/mappers/stats.mapper";

describe("toCountryCountDto", () => {
  it("lists the country and its count", () => {
    expect(toCountryCountDto("BE", 3)).toStrictEqual({ country: "BE", count: 3 });
  });
});

describe("toMonthlyCountDto", () => {
  it("lists the month and its count", () => {
    expect(toMonthlyCountDto("2026-03", 4)).toStrictEqual({ month: "2026-03", count: 4 });
  });
});

describe("toStatsDto", () => {
  it("lists every field and delegates each country to the country mapper, keeping the order", () => {
    const stats = toStatsDto(
      3,
      2,
      5.6,
      [["DE", 2], ["BE", 1]],
      BeerFamilyEnum.TRAPPIST,
      4.5,
      2,
      5,
      [["2026-02", 0], ["2026-03", 3]],
    );

    expect(stats).toStrictEqual({
      checkinCount: 3,
      discoveredCount: 2,
      averageAbv: 5.6,
      countries: [{ country: "DE", count: 2 }, { country: "BE", count: 1 }],
      favoriteFamily: BeerFamilyEnum.TRAPPIST,
      averageRating: 4.5,
      currentStreak: 2,
      bestStreak: 5,
      monthlyCheckins: [{ month: "2026-02", count: 0 }, { month: "2026-03", count: 3 }],
    });
  });

  it("keeps the null averages, the null family and the empty countries", () => {
    expect(toStatsDto(0, 0, null, [], null, null, 0, 0, [])).toStrictEqual({
      checkinCount: 0,
      discoveredCount: 0,
      averageAbv: null,
      countries: [],
      favoriteFamily: null,
      averageRating: null,
      currentStreak: 0,
      bestStreak: 0,
      monthlyCheckins: [],
    });
  });
});
