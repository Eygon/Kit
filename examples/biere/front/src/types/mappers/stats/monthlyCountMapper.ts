import type { MonthlyCountDto } from "@/types/dtos/stats/monthlyCountDto";
import type { MonthlyCount } from "@/types/models/stats/monthlyCount";

export const monthlyCountDtoToModel = ({ month, count }: MonthlyCountDto): MonthlyCount => ({ month, count });
