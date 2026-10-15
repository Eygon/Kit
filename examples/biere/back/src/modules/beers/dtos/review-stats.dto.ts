import type { RatingBucketDto } from "@/modules/beers/dtos/rating-bucket.dto";

export interface ReviewStatsDto {
  readonly ratingDistribution: readonly RatingBucketDto[];
}
