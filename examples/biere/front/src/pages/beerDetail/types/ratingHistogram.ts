import type { RatingBucket } from "@/types/models/beer/ratingBucket";

export type RatingHistogramProps = Readonly<{
  distribution: RatingBucket[];
  reviewCount: number;
}>;
