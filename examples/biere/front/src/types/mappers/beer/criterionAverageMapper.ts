import { isReviewCriterion } from "@/types/enums/review/reviewCriterionEnum";
import type { CriterionAverageDto } from "@/types/dtos/beer/criterionAverageDto";
import type { CriterionAverage } from "@/types/models/beer/criterionAverage";

export const criterionAverageDtoToModel = (dto: CriterionAverageDto): CriterionAverage | null =>
  isReviewCriterion(dto.criterion) ? { criterion: dto.criterion, average: dto.average, count: dto.count } : null;
