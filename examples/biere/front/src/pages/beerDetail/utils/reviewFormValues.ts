import type { ReviewFormValues } from "@/pages/beerDetail/types/reviewFormValues";
import type { NewReview } from "@/types/models/review/newReview";
import type { Review } from "@/types/models/review/review";

export const REVIEW_TEXT_MAX_LENGTH = 500;
export const REVIEW_MIN_RATING = 1;
export const REVIEW_MAX_RATING = 5;
export const REVIEW_RATING_STEP = 0.5;

export const EMPTY_REVIEW_FORM: ReviewFormValues = {
  rating: null,
  text: "",
};

export const reviewToFormValues = (review: Review): ReviewFormValues => ({
  rating: review.rating,
  text: review.text,
});

export const formValuesToNewReview = (values: ReviewFormValues & { rating: number }): NewReview => ({
  rating: values.rating,
  text: values.text,
});

export const REVIEW_DEFAULT_RATING = 3;
