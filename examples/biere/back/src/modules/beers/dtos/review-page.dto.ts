import type { ReviewDto } from "@/modules/beers/dtos/review.dto";

export interface ReviewPageDto {
  readonly mine: ReviewDto | null;
  readonly items: readonly ReviewDto[];
  readonly total: number;
  readonly page: number;
  readonly size: number;
}
