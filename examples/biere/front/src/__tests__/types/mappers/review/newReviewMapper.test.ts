import { newReviewToDto } from "@/types/mappers/review/newReviewMapper";
import type { NewReview } from "@/types/models/review/newReview";

const FULL: NewReview = { rating: 4.5, text: "Très bonne" };

describe("newReviewToDto", () => {
  it("maps the rating and the text, the body of the contract PUT", () => {
    const dto = newReviewToDto(FULL);

    expect(dto).toEqual({ rating: 4.5, text: "Très bonne" });
    expect(Object.keys(dto).sort()).toEqual(["rating", "text"]);
  });

  it("keeps an empty text and the lowest rating without applying a default", () => {
    expect(newReviewToDto({ rating: 1, text: "" })).toEqual({ rating: 1, text: "" });
  });

  it("drops a leftover criterion field of the input", () => {
    const dto = newReviewToDto({ ...FULL, sweetness: 2, acidity: null, body: 5 } as NewReview);

    expect(Object.keys(dto).sort()).toEqual(["rating", "text"]);
  });

  it("does not share the input object", () => {
    expect(newReviewToDto(FULL)).not.toBe(FULL);
  });
});
