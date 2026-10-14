import { newReviewToDto } from "@/types/mappers/review/newReviewMapper";
import type { NewReview } from "@/types/models/review/newReview";

const FULL: NewReview = { rating: 4.5, text: "Très bonne", sweetness: 2, acidity: 3, body: 5 };

describe("newReviewToDto", () => {
  it("maps every field of a complete review", () => {
    expect(newReviewToDto(FULL)).toEqual({ rating: 4.5, text: "Très bonne", sweetness: 2, acidity: 3, body: 5 });
  });

  it("keeps the null criteria so the server clears them", () => {
    const dto = newReviewToDto({ ...FULL, sweetness: null, acidity: null, body: null });

    expect(dto).toEqual({ rating: 4.5, text: "Très bonne", sweetness: null, acidity: null, body: null });
    expect(Object.keys(dto).sort()).toEqual(["acidity", "body", "rating", "sweetness", "text"]);
  });

  it("keeps an empty text and the lowest rating without applying a default", () => {
    expect(newReviewToDto({ rating: 1, text: "", sweetness: 1, acidity: null, body: null })).toEqual({
      rating: 1,
      text: "",
      sweetness: 1,
      acidity: null,
      body: null,
    });
  });

  it("does not share the input object", () => {
    expect(newReviewToDto(FULL)).not.toBe(FULL);
  });
});
