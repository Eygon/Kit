import { describe, expect, it } from "vitest";
import { toNewReview, toReviewDto, toReviewPageDto, toReviewRecordDto } from "@/modules/beers/mappers/review.mapper";
import { AvatarEnum } from "@/modules/users/enums/avatar.enum";

const CREATED = new Date("2026-03-01T10:00:00.000Z");
const UPDATED = new Date("2026-03-05T12:30:00.000Z");
const NOW = new Date("2026-04-01T08:00:00.000Z");

const ENTITY = {
  id: 7,
  userId: 1,
  beerId: 4,
  rating: 4.5,
  text: "Superbe",
  sweetness: 2,
  acidity: null,
  body: 5,
  createdAt: CREATED,
  updatedAt: UPDATED,
};

const RECORD = {
  id: 7,
  userId: 1,
  beerId: 4,
  rating: 4.5,
  text: "Superbe",
  sweetness: 2,
  acidity: null,
  body: 5,
  createdAt: "2026-03-01T10:00:00.000Z",
  updatedAt: "2026-03-05T12:30:00.000Z",
};

describe("review mapper", () => {
  it("maps an entity to a record with ISO dates and every field", async () => {
    expect(toReviewRecordDto(ENTITY)).toEqual(RECORD);
  });

  it("builds a new row from a full body with the pair, the moment as both dates and the criteria", async () => {
    expect(toNewReview({ rating: 4.5, text: "Superbe", sweetness: 2, acidity: 3, body: 4 }, 1, 4, NOW)).toEqual({
      userId: 1,
      beerId: 4,
      rating: 4.5,
      text: "Superbe",
      sweetness: 2,
      acidity: 3,
      body: 4,
      createdAt: NOW,
      updatedAt: NOW,
    });
  });

  it("stores an empty text and null criteria when they are absent", async () => {
    expect(toNewReview({ rating: 3 }, 1, 4, NOW)).toEqual({
      userId: 1,
      beerId: 4,
      rating: 3,
      text: "",
      sweetness: null,
      acidity: null,
      body: null,
      createdAt: NOW,
      updatedAt: NOW,
    });
  });

  it("turns null criteria into null and normalizes then trims the text", async () => {
    expect(toNewReview({ rating: 3, text: "  a\r\nb\rc  ", sweetness: null, acidity: null, body: null }, 1, 4, NOW)).toMatchObject({
      text: "a\nb\nc",
      sweetness: null,
      acidity: null,
      body: null,
    });
  });

  it("builds the read DTO with the author fields and isMine true for the author", async () => {
    const author = { id: 1, displayName: "Alice", avatarColor: "#F59E0B", avatar: AvatarEnum.HOP };

    expect(toReviewDto(RECORD, author, 1)).toEqual({
      id: 7,
      beerId: 4,
      authorId: 1,
      authorName: "Alice",
      authorAvatarColor: "#F59E0B",
      rating: 4.5,
      text: "Superbe",
      sweetness: 2,
      acidity: null,
      body: 5,
      createdAt: "2026-03-01T10:00:00.000Z",
      updatedAt: "2026-03-05T12:30:00.000Z",
      isMine: true,
    });
  });

  it("sets isMine to false when the viewer is not the author", async () => {
    const author = { id: 1, displayName: "Alice", avatarColor: "#F59E0B", avatar: AvatarEnum.HOP };

    expect(toReviewDto(RECORD, author, 2).isMine).toBe(false);
  });

  describe("toReviewPageDto", () => {
    const ALICE = { id: 1, displayName: "Alice", avatarColor: "#F59E0B", avatar: AvatarEnum.HOP };
    const BOB = { id: 2, displayName: "Bob", avatarColor: "#10B981", avatar: AvatarEnum.MALT };
    const CAROL = { id: 3, displayName: "Carol", avatarColor: "#8B5CF6", avatar: AvatarEnum.GLASS };
    const authors = new Map([ALICE, BOB, CAROL].map((user) => [user.id, user]));
    const bobRecord = { ...RECORD, id: 8, userId: 2, text: "Bob" };
    const carolRecord = { ...RECORD, id: 9, userId: 3, text: "Carol" };

    it("serves my review with its author and isMine, the others without isMine, the total, the page and the size", async () => {
      expect(toReviewPageDto(carolRecord, { items: [bobRecord, RECORD], total: 12 }, authors, 3, 2, 10)).toEqual({
        mine: toReviewDto(carolRecord, CAROL, 3),
        items: [toReviewDto(bobRecord, BOB, 3), toReviewDto(RECORD, ALICE, 3)],
        total: 12,
        page: 2,
        size: 10,
      });
      expect(toReviewDto(bobRecord, BOB, 3).isMine).toBe(false);
    });

    it("serves a null mine and an empty list when there is nothing to show", async () => {
      expect(toReviewPageDto(null, { items: [], total: 0 }, authors, 3, 1, 10)).toEqual({
        mine: null,
        items: [],
        total: 0,
        page: 1,
        size: 10,
      });
    });

    it("fails loudly when the author of a review is unknown", async () => {
      expect(() => toReviewPageDto(null, { items: [bobRecord], total: 1 }, new Map(), 3, 1, 10)).toThrow(
        "Author 2 of review 8 not found.",
      );
      expect(() => toReviewPageDto(carolRecord, { items: [], total: 0 }, new Map(), 3, 1, 10)).toThrow(
        "Author 3 of review 9 not found.",
      );
    });
  });
});
