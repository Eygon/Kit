import type { CreateCheckinDto } from "@/modules/tastings/dtos/create-checkin.dto";
import { describe, expect, it } from "vitest";
import { BeerAromaEnum } from "@/modules/beers/enums/beer-aroma.enum";
import { BeerFormatEnum } from "@/modules/beers/enums/beer-format.enum";
import { toCheckinRecordDto, toNewCheckin } from "@/modules/tastings/mappers/checkin-record.mapper";


describe("toCheckinRecordDto", () => {
  it("lists every field and renders drankAt as an ISO string", () => {
    const entity = {
      id: 7,
      userId: 1,
      beerId: 12,
      drankAt: new Date("2026-03-14T18:30:00.000Z"),
      place: "Chez Alice",
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
      rating: null,
      aromas: [],
      format: BeerFormatEnum.DRAFT,
      price: null,
      comment: "",
      photoId: null,
      createdAt: new Date(),
    };

    const dto = toCheckinRecordDto(entity);

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
      rating: null,
      aromas: [],
      format: BeerFormatEnum.DRAFT,
      price: null,
      comment: "",
      photoId: null,
    });
  });

  it("keeps a zero price and an empty aromas list given by the caller", () => {
    const record = toNewCheckin({ ...complete, price: 0, aromas: [], rating: undefined }, 1);

    expect(record.price).toBe(0);
    expect(record.aromas).toEqual([]);
    expect(record.rating).toBeNull();
  });
});
