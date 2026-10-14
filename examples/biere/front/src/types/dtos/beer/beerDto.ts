import type { CriterionAverageDto } from "@/types/dtos/beer/criterionAverageDto";
import type { LevelRangeDto } from "@/types/dtos/beer/levelRangeDto";
import type { RatingBucketDto } from "@/types/dtos/beer/ratingBucketDto";

export interface BeerDto {
  id: number;
  name: string;
  breweryName: string;
  country: string;
  styleId: number;
  styleName: string;
  family: string;
  abv: number;
  aromas: string[];
  formats: string[];
  description: string;
  drunk?: boolean;
  checkinCount?: number;
  inWishlist?: boolean;
  bitternessLevel?: number | null;
  colorLevel?: number | null;
  styleColorRange?: LevelRangeDto | null;
  averageRating?: number | null;
  reviewCount?: number;
  ratingDistribution?: RatingBucketDto[];
  criteria?: CriterionAverageDto[];
}
