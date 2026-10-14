import type { RatingBucketDto } from "@/types/dtos/beer/ratingBucketDto";
import type { RatingBucket } from "@/types/models/beer/ratingBucket";

export const ratingBucketDtoToModel = (dto: RatingBucketDto): RatingBucket => ({
  stars: dto.stars,
  count: dto.count,
});
