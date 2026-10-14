import type { UpsertReviewDto } from "@/types/dtos/review/upsertReviewDto";
import type { NewReview } from "@/types/models/review/newReview";

export const newReviewToDto = (newReview: NewReview): UpsertReviewDto => ({
  rating: newReview.rating,
  text: newReview.text,
  sweetness: newReview.sweetness,
  acidity: newReview.acidity,
  body: newReview.body,
});
