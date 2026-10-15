import { AvatarEnum } from "@/types/enums/user/avatarEnum";
import {
  EMPTY_REVIEW_FORM,
  REVIEW_MAX_RATING,
  REVIEW_MIN_RATING,
  REVIEW_RATING_STEP,
  REVIEW_TEXT_MAX_LENGTH,
  formValuesToNewReview,
  reviewToFormValues,
} from "@/pages/beerDetail/utils/reviewFormValues";
import * as reviewFormValuesModule from "@/pages/beerDetail/utils/reviewFormValues";
import type { Review } from "@/types/models/review/review";

const REVIEW: Review = {
  id: 5,
  beerId: 7,
  authorId: 2,
  authorName: "Bob",
  authorAvatar: AvatarEnum.HOP,
  rating: 4.5,
  text: "Très bonne",
  createdAt: "2026-10-01T10:00:00.000Z",
  updatedAt: "2026-10-02T10:00:00.000Z",
  isMine: true,
};

describe("review form constants", () => {
  it("bounds the text at 500 characters and the rating from 1 to 5 by half points", () => {
    expect(REVIEW_TEXT_MAX_LENGTH).toBe(500);
    expect(REVIEW_MIN_RATING).toBe(1);
    expect(REVIEW_MAX_RATING).toBe(5);
    expect(REVIEW_RATING_STEP).toBe(0.5);
  });

  it("no longer exposes the criterion sentinel", () => {
    expect(reviewFormValuesModule).not.toHaveProperty("REVIEW_NO_CRITERION");
  });

  it("starts empty with no rating and no text", () => {
    expect(EMPTY_REVIEW_FORM).toEqual({ rating: null, text: "" });
  });
});

describe("reviewToFormValues", () => {
  it("copies the rating and the text of a review and nothing else", () => {
    expect(reviewToFormValues(REVIEW)).toEqual({ rating: 4.5, text: "Très bonne" });
  });

  it("keeps an empty text", () => {
    expect(reviewToFormValues({ ...REVIEW, text: "" })).toEqual({ rating: 4.5, text: "" });
  });
});

describe("formValuesToNewReview", () => {
  it("sends the rating and the text only", () => {
    expect(formValuesToNewReview({ rating: 3.5, text: "Top" })).toEqual({ rating: 3.5, text: "Top" });
  });

  it("keeps an empty text at the lowest rating", () => {
    expect(formValuesToNewReview({ rating: 1, text: "" })).toEqual({ rating: 1, text: "" });
  });
});
