import ReviewService from "@/api/reviews/reviewService";
import type { NewReview } from "@/types/models/review/newReview";

export const fetchReviewPage = (beerId: number, page: number) => ReviewService.getPage(beerId, page);

export const saveReview = ({ beerId, review }: { beerId: number; review: NewReview }) =>
  ReviewService.save(beerId, review);

export const deleteReview = (beerId: number) => ReviewService.remove(beerId);
