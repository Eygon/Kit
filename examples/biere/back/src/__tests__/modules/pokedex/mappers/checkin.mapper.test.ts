import { describe, expect, it } from "vitest";
import { BeerAromaEnum } from "@/modules/beers/enums/beer-aroma.enum";
import { BeerFormatEnum } from "@/modules/beers/enums/beer-format.enum";
import { toCheckinDto, toCheckinPageDto, toCreatedCheckinDto } from "@/modules/pokedex/mappers/checkin.mapper";
import type { CheckinRecordDto } from "@/modules/tastings/dtos/checkin-record.dto";

const RECORD: CheckinRecordDto = {
  id: 7,
  userId: 1,
  beerId: 12,
  drankAt: "2026-03-14T18:30:00.000Z",
  place: "Le Bistrot",
  rating: 4.5,
  aromas: [BeerAromaEnum.FRUITY, BeerAromaEnum.HOPPY],
  format: BeerFormatEnum.BOTTLE,
  price: 6.5,
  comment: "Superbe",
  photoId: null,
};

const EXPECTED_CHECKIN = {
  id: 7,
  beerId: 12,
  beerName: "Orval",
  drankAt: "2026-03-14T18:30:00.000Z",
  place: "Le Bistrot",
  rating: 4.5,
  aromas: [BeerAromaEnum.FRUITY, BeerAromaEnum.HOPPY],
  format: BeerFormatEnum.BOTTLE,
  price: 6.5,
  comment: "Superbe",
  photoId: null,
};

describe("toCheckinDto", () => {
  it("adds the beer name and drops the user id", () => {
    expect(toCheckinDto(RECORD, "Orval")).toStrictEqual(EXPECTED_CHECKIN);
  });

  it("keeps null rating, price and photo and an empty comment", () => {
    const dto = toCheckinDto(
      { ...RECORD, rating: null, price: null, comment: "", aromas: [], photoId: "3f2b8c1e-5d4a-4e6b-9a7c-1d2e3f4a5b6c" },
      "Orval",
    );

    expect(dto).toStrictEqual({
      ...EXPECTED_CHECKIN,
      rating: null,
      price: null,
      comment: "",
      aromas: [],
      photoId: "3f2b8c1e-5d4a-4e6b-9a7c-1d2e3f4a5b6c",
    });
  });
});

describe("toCreatedCheckinDto", () => {
  it.each([true, false])("wraps the check-in with isFirstDiscovery %s", (isFirstDiscovery) => {
    expect(toCreatedCheckinDto(RECORD, "Orval", isFirstDiscovery)).toStrictEqual({
      checkin: EXPECTED_CHECKIN,
      isFirstDiscovery,
    });
  });
});

describe("toCheckinPageDto", () => {
  it("names each item from the beer map, keeps the order and carries the total, page and size", () => {
    const second: CheckinRecordDto = { ...RECORD, id: 8, beerId: 13, photoId: "3f2b8c1e-5d4a-4e6b-9a7c-1d2e3f4a5b6c" };
    const names = new Map([
      [12, "Orval"],
      [13, "Chimay Rouge"],
    ]);

    expect(toCheckinPageDto({ items: [RECORD, second], total: 25 }, names, 2, 20)).toStrictEqual({
      items: [EXPECTED_CHECKIN, { ...EXPECTED_CHECKIN, id: 8, beerId: 13, beerName: "Chimay Rouge", photoId: "3f2b8c1e-5d4a-4e6b-9a7c-1d2e3f4a5b6c" }],
      total: 25,
      page: 2,
      size: 20,
    });
  });

  it("builds an empty page", () => {
    expect(toCheckinPageDto({ items: [], total: 0 }, new Map(), 1, 20)).toStrictEqual({ items: [], total: 0, page: 1, size: 20 });
  });

  it("uses an empty name for a beer missing from the map", () => {
    expect(toCheckinPageDto({ items: [RECORD], total: 1 }, new Map(), 1, 20).items[0].beerName).toBe("");
  });
});
