import type { ReviewCriterionEnum } from "@/modules/beers/enums/review-criterion.enum";

export interface CriterionAverageDto {
  readonly criterion: ReviewCriterionEnum;
  readonly average: number | null;
  readonly count: number;
}
