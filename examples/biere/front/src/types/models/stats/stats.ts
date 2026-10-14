import type { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";
import type { CountryCount } from "@/types/models/stats/countryCount";
import type { MonthlyCount } from "@/types/models/stats/monthlyCount";

export interface Stats {
  checkinCount: number;
  discoveredCount: number;
  averageAbv: number | null;
  countries: CountryCount[];
  favoriteFamily: BeerFamilyEnum | null;
  averageRating: number | null;
  currentStreak: number;
  bestStreak: number;
  monthlyCheckins: MonthlyCount[];
}
