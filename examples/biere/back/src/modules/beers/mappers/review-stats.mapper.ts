import { REVIEW_RATING_MAX, REVIEW_RATING_MIN } from "@/modules/beers/beers.constants";
import type { CriterionAverageDto } from "@/modules/beers/dtos/criterion-average.dto";
import type { RatingBucketDto } from "@/modules/beers/dtos/rating-bucket.dto";
import type { RatingSummaryDto } from "@/modules/beers/dtos/rating-summary.dto";
import type { ReviewStatsDto } from "@/modules/beers/dtos/review-stats.dto";
import { ReviewCriterionEnum } from "@/modules/beers/enums/review-criterion.enum";

export interface RawRatingSummaryRow {
  readonly beerId: number | string;
  readonly averageRating: number | string;
  readonly reviewCount: number | string;
}

export interface RawRatingBucketRow {
  readonly stars: number | string;
  readonly count: number | string;
}

export type RawCriteriaRow = Readonly<Record<string, number | string | null>>;

const STAR_LEVELS: readonly number[] = Array.from(
  { length: REVIEW_RATING_MAX - REVIEW_RATING_MIN + 1 },
  (_, index) => REVIEW_RATING_MIN + index,
);

export const toRatingSummaryDto = (row: RawRatingSummaryRow): RatingSummaryDto => ({
  beerId: Number(row.beerId),
  averageRating: Number(row.averageRating),
  reviewCount: Number(row.reviewCount),
});

const toRatingBuckets = (rows: readonly RawRatingBucketRow[]): RatingBucketDto[] =>
  STAR_LEVELS.map((stars) => ({
    stars,
    count: rows.filter((row) => Number(row.stars) === stars).reduce((sum, row) => sum + Number(row.count), 0),
  }));

const toCriterionAverageDto = (criterion: ReviewCriterionEnum, row: RawCriteriaRow): CriterionAverageDto => {
  const average = row[`${criterion}Average`];
  return { criterion, average: average === null ? null : Number(average), count: Number(row[`${criterion}Count`]) };
};

export const toReviewStatsDto = (bucketRows: readonly RawRatingBucketRow[], criteriaRow: RawCriteriaRow): ReviewStatsDto => ({
  ratingDistribution: toRatingBuckets(bucketRows),
  criteria: Object.values(ReviewCriterionEnum).map((criterion) => toCriterionAverageDto(criterion, criteriaRow)),
});
