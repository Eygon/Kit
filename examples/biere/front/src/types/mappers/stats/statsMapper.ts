import { isBeerFamily } from "@/types/enums/beer/beerFamilyEnum";
import type { StatsDto } from "@/types/dtos/stats/statsDto";
import { countryCountDtoToModel } from "@/types/mappers/stats/countryCountMapper";
import { monthlyCountDtoToModel } from "@/types/mappers/stats/monthlyCountMapper";
import type { Stats } from "@/types/models/stats/stats";

export const statsDtoToModel = (dto: StatsDto): Stats => ({
  checkinCount: dto.checkinCount,
  discoveredCount: dto.discoveredCount,
  averageAbv: dto.averageAbv,
  countries: dto.countries.map(countryCountDtoToModel),
  favoriteFamily: isBeerFamily(dto.favoriteFamily) ? dto.favoriteFamily : null,
  averageRating: dto.averageRating,
  currentStreak: dto.currentStreak,
  bestStreak: dto.bestStreak,
  monthlyCheckins: dto.monthlyCheckins.map(monthlyCountDtoToModel),
});
