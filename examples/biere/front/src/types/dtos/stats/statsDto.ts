import type { CountryCountDto } from "@/types/dtos/stats/countryCountDto";
import type { MonthlyCountDto } from "@/types/dtos/stats/monthlyCountDto";

export interface StatsDto {
  checkinCount: number;
  discoveredCount: number;
  averageAbv: number | null;
  countries: CountryCountDto[];
  favoriteFamily: string | null;
  averageRating: number | null;
  currentStreak: number;
  bestStreak: number;
  monthlyCheckins: MonthlyCountDto[];
}
