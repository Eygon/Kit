import { AvatarEnum } from "@/types/enums/user/avatarEnum";
import {
  EMPTY_REVIEW_FORM,
  REVIEW_MAX_RATING,
  REVIEW_MIN_RATING,
  REVIEW_NO_CRITERION,
  REVIEW_RATING_STEP,
  REVIEW_TEXT_MAX_LENGTH,
  formValuesToNewReview,
  reviewToFormValues,
} from "@/pages/beerDetail/utils/reviewFormValues";
import type { Review } from "@/types/models/review/review";

const REVIEW: Review = {
  id: 5,
  beerId: 7,
  authorId: 2,
  authorName: "Bob",
  authorAvatar: AvatarEnum.HOP,
  rating: 4.5,
  text: "Très bonne",
  sweetness: 2,
  acidity: null,
  body: 5,
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
    expect(REVIEW_NO_CRITERION).toBe(0);
  });

  it("starts empty with no rating and no criterion", () => {
    expect(EMPTY_REVIEW_FORM).toEqual({
      rating: null,
      text: "",
      sweetness: 0,
      acidity: 0,
      body: 0,
    });
  });
});

describe("reviewToFormValues", () => {
  it("copies the rating, the text and the rated criteria of a review", () => {
    expect(reviewToFormValues(REVIEW)).toEqual({
      rating: 4.5,
      text: "Très bonne",
      sweetness: 2,
      acidity: 0,
      body: 5,
    });
  });

  it("turns an absent criterion into 0 and keeps an empty text", () => {
    expect(
      reviewToFormValues({ ...REVIEW, text: "", sweetness: null, body: null }),
    ).toEqual({
      rating: 4.5,
      text: "",
      sweetness: 0,
      acidity: 0,
      body: 0,
    });
  });
});

describe("formValuesToNewReview", () => {
  it("sends a criterion left at 0 as absent and the others as they are", () => {
    expect(
      formValuesToNewReview({
        rating: 3.5,
        text: "Top",
        sweetness: 4,
        acidity: 0,
        body: 1,
      }),
    ).toEqual({
      rating: 3.5,
      text: "Top",
      sweetness: 4,
      acidity: null,
      body: 1,
    });
  });

  it("sends every criterion as absent when none was rated", () => {
    expect(
      formValuesToNewReview({
        rating: 1,
        text: "",
        sweetness: 0,
        acidity: 0,
        body: 0,
      }),
    ).toEqual({
      rating: 1,
      text: "",
      sweetness: null,
      acidity: null,
      body: null,
    });
  });
});
