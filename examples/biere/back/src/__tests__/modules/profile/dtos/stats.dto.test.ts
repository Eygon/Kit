import { describe, expectTypeOf, it } from "vitest";
import type { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";
import type { CountryCountDto } from "@/modules/profile/dtos/country-count.dto";
import type { MonthlyCountDto } from "@/modules/profile/dtos/monthly-count.dto";
import type { StatsDto } from "@/modules/profile/dtos/stats.dto";

describe("StatsDto", () => {
  it("exposes every statistic as readonly, with nullable averages and favorite family", () => {
    expectTypeOf<StatsDto>().toEqualTypeOf<{
      readonly checkinCount: number;
      readonly discoveredCount: number;
      readonly averageAbv: number | null;
      readonly countries: readonly CountryCountDto[];
      readonly favoriteFamily: BeerFamilyEnum | null;
      readonly averageRating: number | null;
      readonly currentStreak: number;
      readonly bestStreak: number;
      readonly monthlyCheckins: readonly MonthlyCountDto[];
    }>();
  });
});
