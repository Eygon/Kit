import type { ReviewDto } from "@/types/dtos/review/reviewDto";
import { reviewDtoToModel } from "@/types/mappers/review/reviewMapper";

const reviewDto: ReviewDto = {
  id: 5,
  beerId: 7,
  authorId: 2,
  authorName: "Bob",
  authorAvatarColor: "#10B981",
  rating: 4.5,
  text: "Très bonne",
  sweetness: 2,
  acidity: 3,
  body: 4,
  createdAt: "2026-10-10T10:00:00.000Z",
  updatedAt: "2026-10-12T12:00:00.000Z",
  isMine: true,
};

describe("reviewDtoToModel", () => {
  it("maps every field of a complete review", async () => {

    expect(reviewDtoToModel(reviewDto)).toEqual(reviewDto);
  });

  it("defaults the three criteria to null when the dto leaves them out", async () => {
    const { sweetness, acidity, body, ...withoutCriteria } = reviewDto;

    const review = reviewDtoToModel(withoutCriteria as ReviewDto);

    expect([sweetness, acidity, body]).toEqual([2, 3, 4]);
    expect(review.sweetness).toBeNull();
    expect(review.acidity).toBeNull();
    expect(review.body).toBeNull();
  });

  it("keeps null criteria null and maps the present ones next to the missing ones", async () => {

    const review = reviewDtoToModel({ ...reviewDto, sweetness: null, acidity: 1, body: undefined } as unknown as ReviewDto);

    expect(review.sweetness).toBeNull();
    expect(review.acidity).toBe(1);
    expect(review.body).toBeNull();
  });

  it("defaults a missing text to the empty string and keeps an empty one", async () => {
    const { text, ...withoutText } = reviewDto;

    expect(text).toBe("Très bonne");
    expect(reviewDtoToModel(withoutText as ReviewDto).text).toBe("");
    expect(reviewDtoToModel({ ...reviewDto, text: "" }).text).toBe("");
  });

  it("does not override falsy-but-valid values", async () => {

    const review = reviewDtoToModel({ ...reviewDto, isMine: false, sweetness: 0 });

    expect(review.isMine).toBe(false);
    expect(review.sweetness).toBe(0);
  });
});
