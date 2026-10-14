import type { ReviewCriterionEnum } from "@/types/enums/review/reviewCriterionEnum";

export interface CriterionAverage {
  criterion: ReviewCriterionEnum;
  average: number | null;
  count: number;
}
