import type { CriterionAverageDto } from "@/modules/beers/dtos/criterion-average.dto";
import type { RatingBucketDto } from "@/modules/beers/dtos/rating-bucket.dto";

export interface ReviewStatsDto {
  readonly ratingDistribution: readonly RatingBucketDto[];
  readonly criteria: readonly CriterionAverageDto[];
}
