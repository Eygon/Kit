import { checkinPageDtoToModel } from "@/types/mappers/checkin/checkinPageMapper";

const checkinDto = (id: number, format = "bottle") => ({
  id,
  beerId: 7,
  beerName: "Orval",
  drankAt: "2026-10-12T12:00:00.000Z",
  place: `Bar ${id}`,
  rating: null,
  aromas: ["fruity", "weird"],
  format,
  price: null,
  comment: "",
  photoId: null,
  venueId: null,
});

describe("checkinPageDtoToModel", () => {
  it("maps every item, in order, and keeps total, page and size", () => {
    const page = checkinPageDtoToModel({
      items: [checkinDto(3), checkinDto(2, "martian"), checkinDto(1)],
      total: 25,
      page: 2,
      size: 20,
    });

    expect(page.total).toBe(25);
    expect(page.page).toBe(2);
    expect(page.size).toBe(20);
    expect(page.items.map((item) => item.id)).toEqual([3, 2, 1]);
    expect(page.items.map((item) => item.format)).toEqual(["bottle", null, "bottle"]);
    expect(page.items[0].aromas).toEqual(["fruity"]);
  });

  it("maps an empty page", () => {
    expect(checkinPageDtoToModel({ items: [], total: 0, page: 1, size: 20 })).toEqual({
      items: [],
      total: 0,
      page: 1,
      size: 20,
    });
  });
});
