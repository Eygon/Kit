import type { CreateCheckinDto } from "@/modules/tastings/dtos/create-checkin.dto";
import { hasAnySuppliedValue, type UpdateCheckinDto } from "@/modules/tastings/dtos/update-checkin.dto";
import { describe, expect, it } from "vitest";
import { BeerAromaEnum } from "@/modules/beers/enums/beer-aroma.enum";
import { BeerFormatEnum } from "@/modules/beers/enums/beer-format.enum";
import { toCheckinChanges, toCheckinRecordDto, toNewCheckin } from "@/modules/tastings/mappers/checkin-record.mapper";


describe("toCheckinRecordDto", () => {
  it("lists every field and renders drankAt as an ISO string", () => {
    const entity = {
      id: 7,
      userId: 1,
      beerId: 12,
      drankAt: new Date("2026-03-14T18:30:00.000Z"),
      place: "Chez Alice",
      venueId: 14,
      rating: 4.5,
      aromas: [BeerAromaEnum.FRUITY, BeerAromaEnum.HOPPY],
      format: BeerFormatEnum.BOTTLE,
      price: 3.2,
      comment: "Très bonne",
      photoId: "3f2b8c1e-5d4a-4e6b-9a7c-1d2e3f4a5b6c",
      createdAt: new Date("2026-03-14T19:00:00.000Z"),
    };

    expect(toCheckinRecordDto(entity)).toStrictEqual({
      id: 7,
      userId: 1,
      beerId: 12,
      drankAt: "2026-03-14T18:30:00.000Z",
      place: "Chez Alice",
      venueId: 14,
      rating: 4.5,
      aromas: [BeerAromaEnum.FRUITY, BeerAromaEnum.HOPPY],
      format: BeerFormatEnum.BOTTLE,
      price: 3.2,
      comment: "Très bonne",
      photoId: "3f2b8c1e-5d4a-4e6b-9a7c-1d2e3f4a5b6c",
    });
  });

  it("keeps null rating, price and photo and an empty comment", () => {
    const entity = {
      id: 8,
      userId: 2,
      beerId: 3,
      drankAt: new Date("2026-01-01T00:00:00.000Z"),
      place: "Bar",
      venueId: null,
      rating: null,
      aromas: [],
      format: BeerFormatEnum.DRAFT,
      price: null,
      comment: "",
      photoId: null,
      createdAt: new Date(),
    };

    const dto = toCheckinRecordDto(entity);

    expect(dto.venueId).toBeNull();
    expect(dto.rating).toBeNull();
    expect(dto.price).toBeNull();
    expect(dto.photoId).toBeNull();
    expect(dto.comment).toBe("");
    expect(dto.aromas).toEqual([]);
    expect(dto).not.toHaveProperty("createdAt");
  });
});


describe("toNewCheckin", () => {
  const complete: CreateCheckinDto = {
    beerId: 12,
    drankAt: "2026-03-14T20:30:00+02:00",
    place: "  Le Bistrot  ",
    venueId: 14,
    rating: 4.5,
    aromas: [BeerAromaEnum.FRUITY, BeerAromaEnum.HOPPY],
    format: BeerFormatEnum.BOTTLE,
    price: 6.5,
    comment: "Superbe",
  };

  it("builds the record to insert with the user, the trimmed place and the instant of drankAt", () => {
    const record = toNewCheckin(complete, 4);

    expect(record).toStrictEqual({
      userId: 4,
      beerId: 12,
      drankAt: new Date("2026-03-14T18:30:00.000Z"),
      place: "Le Bistrot",
      venueId: 14,
      rating: 4.5,
      aromas: [BeerAromaEnum.FRUITY, BeerAromaEnum.HOPPY],
      format: BeerFormatEnum.BOTTLE,
      price: 6.5,
      comment: "Superbe",
      photoId: null,
    });
  });

  it("defaults the optional fields to null, an empty list and an empty comment", () => {
    const record = toNewCheckin(
      { beerId: 3, drankAt: "2026-01-01T00:00:00Z", place: "Bar", format: BeerFormatEnum.DRAFT },
      2,
    );

    expect(record).toStrictEqual({
      userId: 2,
      beerId: 3,
      drankAt: new Date("2026-01-01T00:00:00.000Z"),
      place: "Bar",
      venueId: null,
      rating: null,
      aromas: [],
      format: BeerFormatEnum.DRAFT,
      price: null,
      comment: "",
      photoId: null,
    });
  });

  it("keeps the trimmed place text unchanged when a venue is linked", () => {
    const record = toNewCheckin({ ...complete, place: " La Fine Mousse ", venueId: 3 }, 4);

    expect(record.venueId).toBe(3);
    expect(record.place).toBe("La Fine Mousse");
  });

  it("keeps a zero price and an empty aromas list given by the caller", () => {
    const record = toNewCheckin({ ...complete, price: 0, aromas: [], rating: undefined }, 1);

    expect(record.price).toBe(0);
    expect(record.aromas).toEqual([]);
    expect(record.rating).toBeNull();
  });
});

describe("toCheckinChanges", () => {
  const complete: UpdateCheckinDto = {
    drankAt: "2026-03-14T20:30:00+02:00",
    place: "  Le Bistrot  ",
    venueId: 14,
    rating: 4.5,
    aromas: [BeerAromaEnum.FRUITY, BeerAromaEnum.HOPPY],
    format: BeerFormatEnum.CAN,
    price: 6.5,
    comment: "Superbe",
  };

  it("copies every supplied field, with the instant of drankAt and the trimmed place", () => {
    expect(toCheckinChanges(complete)).toStrictEqual({
      drankAt: new Date("2026-03-14T18:30:00.000Z"),
      place: "Le Bistrot",
      venueId: 14,
      rating: 4.5,
      aromas: [BeerAromaEnum.FRUITY, BeerAromaEnum.HOPPY],
      format: BeerFormatEnum.CAN,
      price: 6.5,
      comment: "Superbe",
    });
  });

  it("returns an empty object when nothing is supplied", () => {
    expect(toCheckinChanges({})).toStrictEqual({});
  });

  it.each([
    ["rating", { rating: 3 }],
    ["comment", { comment: "Très bonne" }],
    ["format", { format: BeerFormatEnum.DRAFT }],
    ["price", { price: 2 }],
  ])("copies only the %s when it is the only field supplied", (_name, dto) => {
    expect(toCheckinChanges(dto)).toStrictEqual(dto);
  });

  it("copies only drankAt as a Date when it is the only field supplied", () => {
    expect(toCheckinChanges({ drankAt: "2026-01-01T00:00:00Z" })).toStrictEqual({
      drankAt: new Date("2026-01-01T00:00:00.000Z"),
    });
  });

  it("turns a supplied place without venueId into free text by nulling venueId", () => {
    expect(toCheckinChanges({ place: " Chez moi " })).toStrictEqual({ place: "Chez moi", venueId: null });
  });

  it("keeps the venueId given with the place", () => {
    expect(toCheckinChanges({ place: "La Fine Mousse", venueId: 3 })).toStrictEqual({
      place: "La Fine Mousse",
      venueId: 3,
    });
  });

  it("clears venueId alone when it is supplied as null without place", () => {
    expect(toCheckinChanges({ venueId: null })).toStrictEqual({ venueId: null });
  });

  it("keeps null rating and price, an empty comment and an empty aromas list as real values", () => {
    expect(toCheckinChanges({ rating: null, price: null, comment: "", aromas: [] })).toStrictEqual({
      rating: null,
      price: null,
      comment: "",
      aromas: [],
    });
  });

  it("keeps a zero price", () => {
    expect(toCheckinChanges({ price: 0 })).toStrictEqual({ price: 0 });
  });

  it("copies the aromas list instead of sharing it", () => {
    const aromas = [BeerAromaEnum.FRUITY];

    const changes = toCheckinChanges({ aromas });

    expect(changes.aromas).toEqual(aromas);
    expect(changes.aromas).not.toBe(aromas);
  });

  it("never carries the owner, the beer, the photo or the creation date", () => {
    const keys = Object.keys(toCheckinChanges(complete));

    expect(keys).not.toContain("userId");
    expect(keys).not.toContain("beerId");
    expect(keys).not.toContain("photoId");
    expect(keys).not.toContain("createdAt");
    expect(keys).not.toContain("id");
  });
});

describe("hasAnySuppliedValue", () => {
  it("is false for an empty body and for fields that are all undefined", () => {
    expect(hasAnySuppliedValue({})).toBe(false);
    expect(hasAnySuppliedValue({ rating: undefined, comment: undefined })).toBe(false);
  });

  it.each([
    ["a null rating", { rating: null }],
    ["a null price", { price: null }],
    ["a null venueId", { venueId: null }],
    ["an empty comment", { comment: "" }],
    ["an empty aromas list", { aromas: [] }],
    ["a zero price", { price: 0 }],
    ["a place", { place: "Bar" }],
  ])("is true for %s", (_name, dto) => {
    expect(hasAnySuppliedValue(dto)).toBe(true);
  });
});
