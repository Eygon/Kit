import type { ReviewPageDto } from "@/types/dtos/review/reviewPageDto";
import { reviewPageDtoToModel } from "@/types/mappers/review/reviewPageMapper";

const reviewDto = (id: number, isMine = false) => ({
  id,
  beerId: 7,
  authorId: id,
  authorName: `Author ${id}`,
  authorAvatarColor: "#10B981",
  rating: 3.5,
  text: "",
  sweetness: null,
  acidity: null,
  body: null,
  createdAt: "2026-10-10T10:00:00.000Z",
  updatedAt: "2026-10-12T12:00:00.000Z",
  isMine,
});

describe("reviewPageDtoToModel", () => {
  it("maps mine, every item in order and keeps total, page and size", async () => {

    const page = reviewPageDtoToModel({
      mine: reviewDto(1, true),
      items: [reviewDto(4), reviewDto(3)],
      total: 12,
      page: 2,
      size: 10,
    });

    expect(page.mine?.id).toBe(1);
    expect(page.mine?.isMine).toBe(true);
    expect(page.items.map((item: { id: number }) => item.id)).toEqual([4, 3]);
    expect(page.total).toBe(12);
    expect(page.page).toBe(2);
    expect(page.size).toBe(10);
  });

  it("defaults mine to null when the dto has none", async () => {

    expect(reviewPageDtoToModel({ mine: null, items: [], total: 0, page: 1, size: 10 })).toEqual({
      mine: null,
      items: [],
      total: 0,
      page: 1,
      size: 10,
    });
    expect(reviewPageDtoToModel({ items: [], total: 0, page: 1, size: 10 } as unknown as ReviewPageDto).mine).toBeNull();
  });

  it("keeps a zero total next to a mine review", async () => {

    const page = reviewPageDtoToModel({ mine: reviewDto(1, true), items: [], total: 0, page: 1, size: 10 });

    expect(page.mine).not.toBeNull();
    expect(page.total).toBe(0);
  });
});
