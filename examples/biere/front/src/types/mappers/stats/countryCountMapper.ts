import type { CountryCountDto } from "@/types/dtos/stats/countryCountDto";
import type { CountryCount } from "@/types/models/stats/countryCount";

export const countryCountDtoToModel = ({ country, count }: CountryCountDto): CountryCount => ({ country, count });
