import type { ReviewDto } from "@/types/dtos/review/reviewDto";
import { AvatarEnum } from "@/types/enums/user/avatarEnum";
import { reviewDtoToModel } from "@/types/mappers/review/reviewMapper";

const reviewDto: ReviewDto = {
  id: 5,
  beerId: 7,
  authorId: 2,
  authorName: "Bob",
  authorAvatar: "hop",
  rating: 4.5,
  text: "Très bonne",
  createdAt: "2026-10-10T10:00:00.000Z",
  updatedAt: "2026-10-12T12:00:00.000Z",
  isMine: true,
};

describe("reviewDtoToModel", () => {
  it("maps every field of a complete review", async () => {
    expect(reviewDtoToModel(reviewDto)).toEqual(reviewDto);
  });

  it("maps the avatar of the author to the avatar enum", async () => {
    expect(
      reviewDtoToModel({ ...reviewDto, authorAvatar: "glass" }).authorAvatar,
    ).toBe(AvatarEnum.GLASS);
  });

  it("falls back to the hop avatar when the avatar of the author is unknown or missing", async () => {
    const { authorAvatar, ...withoutAvatar } = reviewDto;

    expect(authorAvatar).toBe("hop");
    expect(
      reviewDtoToModel({ ...reviewDto, authorAvatar: "dragon" }).authorAvatar,
    ).toBe(AvatarEnum.HOP);
    expect(reviewDtoToModel(withoutAvatar as ReviewDto).authorAvatar).toBe(
      AvatarEnum.HOP,
    );
  });

  it("does not carry the legacy avatar colour anymore", async () => {
    expect(reviewDtoToModel(reviewDto)).not.toHaveProperty("authorAvatarColor");
  });

  it("carries no criterion, even when the dto still sends some", async () => {
    const review = reviewDtoToModel({ ...reviewDto, sweetness: 2, acidity: 3, body: 4 } as unknown as ReviewDto);

    expect(Object.keys(review).sort()).toEqual(
      ["authorAvatar", "authorId", "authorName", "beerId", "createdAt", "id", "isMine", "rating", "text", "updatedAt"],
    );
  });

  it("defaults a missing text to the empty string and keeps an empty one", async () => {
    const { text, ...withoutText } = reviewDto;

    expect(text).toBe("Très bonne");
    expect(reviewDtoToModel(withoutText as ReviewDto).text).toBe("");
    expect(reviewDtoToModel({ ...reviewDto, text: "" }).text).toBe("");
  });

  it("does not override falsy-but-valid values", async () => {
    const review = reviewDtoToModel({
      ...reviewDto,
      isMine: false,
    });

    expect(review.isMine).toBe(false);
  });
});
