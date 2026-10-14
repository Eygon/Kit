import type { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";
import type { CountryCountDto } from "@/modules/profile/dtos/country-count.dto";
import type { MonthlyCountDto } from "@/modules/profile/dtos/monthly-count.dto";
import type { StatsDto } from "@/modules/profile/dtos/stats.dto";

export const toCountryCountDto = (country: string, count: number): CountryCountDto => ({ country, count });

export const toMonthlyCountDto = (month: string, count: number): MonthlyCountDto => ({ month, count });

export const toStatsDto = (
  checkinCount: number,
  discoveredCount: number,
  averageAbv: number | null,
  countries: readonly (readonly [string, number])[],
  favoriteFamily: BeerFamilyEnum | null,
  averageRating: number | null,
  currentStreak: number,
  bestStreak: number,
  monthlyCheckins: readonly (readonly [string, number])[],
): StatsDto => ({
  checkinCount,
  discoveredCount,
  averageAbv,
  countries: countries.map(([country, count]) => toCountryCountDto(country, count)),
  favoriteFamily,
  averageRating,
  currentStreak,
  bestStreak,
  monthlyCheckins: monthlyCheckins.map(([month, count]) => toMonthlyCountDto(month, count)),
});
