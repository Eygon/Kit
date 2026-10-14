import type { ReviewDto } from "@/types/dtos/review/reviewDto";

export interface ReviewPageDto {
  mine: ReviewDto | null;
  items: ReviewDto[];
  total: number;
  page: number;
  size: number;
}
