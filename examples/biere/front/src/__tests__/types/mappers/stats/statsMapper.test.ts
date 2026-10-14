import { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";
import { statsDtoToModel } from "@/types/mappers/stats/statsMapper";
import type { StatsDto } from "@/types/dtos/stats/statsDto";

const dto: StatsDto = {
  checkinCount: 14,
  discoveredCount: 9,
  averageAbv: 6.5,
  countries: [
    { country: "BE", count: 5 },
    { country: "FR", count: 4 },
  ],
  favoriteFamily: "ipa",
  averageRating: 4.5,
  currentStreak: 3,
  bestStreak: 6,
  monthlyCheckins: [
    { month: "2026-09", count: 2 },
    { month: "2026-10", count: 0 },
  ],
};

describe("statsDtoToModel", () => {
  it("copies every field and composes the nested mappers", () => {
    expect(statsDtoToModel(dto)).toEqual({
      checkinCount: 14,
      discoveredCount: 9,
      averageAbv: 6.5,
      countries: [
        { country: "BE", count: 5 },
        { country: "FR", count: 4 },
      ],
      favoriteFamily: BeerFamilyEnum.IPA,
      averageRating: 4.5,
      currentStreak: 3,
      bestStreak: 6,
      monthlyCheckins: [
        { month: "2026-09", count: 2 },
        { month: "2026-10", count: 0 },
      ],
    });
  });

  it("keeps null average values and an empty country list for a user without tasting", () => {
    const stats = statsDtoToModel({
      ...dto,
      checkinCount: 0,
      discoveredCount: 0,
      averageAbv: null,
      averageRating: null,
      favoriteFamily: null,
      countries: [],
      currentStreak: 0,
      bestStreak: 0,
    });

    expect(stats.averageAbv).toBeNull();
    expect(stats.averageRating).toBeNull();
    expect(stats.favoriteFamily).toBeNull();
    expect(stats.countries).toEqual([]);
  });

  it("turns an unknown family into null", () => {
    expect(statsDtoToModel({ ...dto, favoriteFamily: "mead" }).favoriteFamily).toBeNull();
  });
});
