import { buildUpdateCheckinDto } from "@/types/mappers/checkin/updateCheckinDtoMapper";
import { BeerAromaEnum } from "@/types/enums/beer/beerAromaEnum";
import type { CheckinChanges } from "@/types/models/checkin/checkinChanges";

describe("buildUpdateCheckinDto", () => {
  it("returns an empty body when nothing changed", () => {
    expect(buildUpdateCheckinDto({})).toEqual({});
  });

  it("sets a key only for a field that is supplied", () => {
    const dto = buildUpdateCheckinDto({ rating: 4 });

    expect(dto).toEqual({ rating: 4 });
    expect(Object.keys(dto)).toEqual(["rating"]);
  });

  it("keeps a null as a value that clears the field", () => {
    const dto = buildUpdateCheckinDto({ rating: null, price: null, venueId: null });

    expect(dto).toEqual({ rating: null, price: null, venueId: null });
    expect(Object.keys(dto).sort()).toEqual(["price", "rating", "venueId"]);
  });

  it("keeps an empty comment and an empty aroma list, which clear those fields", () => {
    const dto = buildUpdateCheckinDto({ comment: "", aromas: [] });

    expect(dto).toEqual({ comment: "", aromas: [] });
  });

  it("keeps a free price of 0 and ignores an undefined field", () => {
    const dto = buildUpdateCheckinDto({ price: 0, comment: undefined });

    expect(dto).toEqual({ price: 0 });
    expect("comment" in dto).toBe(false);
  });

  it("copies every field of a full change set", () => {
    const changes: CheckinChanges = {
      drankAt: "2026-10-12T10:00:00.000Z",
      place: "Chez Paul",
      venueId: 5,
      rating: 3.5,
      aromas: [BeerAromaEnum.FRUITY],
      format: "draft",
      price: 4.2,
      comment: "Top",
    };

    expect(buildUpdateCheckinDto(changes)).toEqual(changes);
  });
});
