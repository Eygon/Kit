import { describe, expect, it } from "vitest";
import { Beer } from "@/modules/beers/entities/beer.entity";
import { BeerStyle } from "@/modules/beers/entities/beer-style.entity";
import { Brewery } from "@/modules/beers/entities/brewery.entity";
import { BeerAromaEnum } from "@/modules/beers/enums/beer-aroma.enum";
import { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";
import { BeerFormatEnum } from "@/modules/beers/enums/beer-format.enum";
import type { BeerDto } from "@/modules/beers/dtos/beer.dto";
import type { CatalogBeerDto } from "@/modules/beers/dtos/catalog-beer.dto";
import type { ReviewStatsDto } from "@/modules/beers/dtos/review-stats.dto";
import { BeerSourceEnum } from "@/modules/beers/enums/beer-source.enum";
import type { CreateBeerDto } from "@/modules/beers/dtos/create-beer.dto";
import { toBeerDetailDto, toBeerDto, toCatalogBeerDto, toNewBeer } from "@/modules/beers/mappers/beer.mapper";

const buildEntity = (): Beer & { brewery: Brewery; style: BeerStyle } => {
  const brewery = Object.assign(new Brewery(), { id: 4, name: "Bières de Chimay", country: "FR", city: "Chimay" });
  const style = Object.assign(new BeerStyle(), {
    id: 7,
    name: "Dubbel trappiste",
    family: BeerFamilyEnum.TRAPPIST,
    description: "Style de style",
    ebcMin: 1,
    ebcMax: 2,
    ibuMin: 3,
    ibuMax: 4,
    abvMin: 5,
    abvMax: 6,
  });
  return Object.assign(new Beer(), {
    id: 12,
    name: "Chimay Rouge",
    breweryId: 4,
    styleId: 7,
    abv: 7,
    ibu: 20,
    ebc: 30,
    sweetness: 2,
    acidity: 1,
    body: 4,
    description: "Trappiste cuivrée.",
    aromas: [BeerAromaEnum.FRUITY, BeerAromaEnum.CARAMEL],
    formats: [BeerFormatEnum.BOTTLE, BeerFormatEnum.DRAFT],
    country: "BE",
    searchText: "chimay rouge bieres de chimay",
    createdBy: null,
    createdAt: null,
    brewery,
    style,
  });
};

describe("toBeerDto", () => {
  it("lists exactly the contract fields, flattening the brewery and the style", () => {
    expect(toBeerDto(buildEntity())).toEqual({
      id: 12,
      name: "Chimay Rouge",
      breweryName: "Bières de Chimay",
      country: "BE",
      styleId: 7,
      styleName: "Dubbel trappiste",
      family: BeerFamilyEnum.TRAPPIST,
      abv: 7,
      ibu: 20,
      ebc: 30,
      sweetness: 2,
      acidity: 1,
      body: 4,
      aromas: [BeerAromaEnum.FRUITY, BeerAromaEnum.CARAMEL],
      formats: [BeerFormatEnum.BOTTLE, BeerFormatEnum.DRAFT],
      description: "Trappiste cuivrée.",
      bitternessLevel: 2,
      colorLevel: 3,
      styleColorRange: null,
      source: BeerSourceEnum.OFFICIAL,
      createdBy: null,
    });
  });

  it("does not leak the internal columns", () => {
    const keys = Object.keys(toBeerDto(buildEntity())).sort();

    expect(keys).toEqual(
      [
        "abv",
        "acidity",
        "aromas",
        "bitternessLevel",
        "body",
        "breweryName",
        "colorLevel",
        "country",
        "createdBy",
        "description",
        "ebc",
        "family",
        "formats",
        "ibu",
        "id",
        "name",
        "source",
        "styleColorRange",
        "styleId",
        "styleName",
        "sweetness",
      ].sort(),
    );
  });

  it.each([
    [0, 1],
    [65, 5],
  ])("computes the bitterness level of %s IBU as %s", (ibu, level) => {
    expect(toBeerDto(Object.assign(buildEntity(), { ibu })).bitternessLevel).toBe(level);
  });

  it("answers a null bitterness level without IBU, with no fallback on the style", () => {
    const dto = toBeerDto(Object.assign(buildEntity(), { ibu: null }));

    expect(dto.bitternessLevel).toBeNull();
  });

  it("computes the color level of the EBC and serves no style range then", () => {
    const dto = toBeerDto(Object.assign(buildEntity(), { ebc: 61 }));

    expect(dto.colorLevel).toBe(5);
    expect(dto.styleColorRange).toBeNull();
  });

  it.each([
    [2, 1],
    [8, 1],
    [9, 2],
    [16, 2],
    [17, 3],
    [33, 3],
    [34, 4],
    [60, 4],
    [61, 5],
    [100, 5],
  ])("computes the color level of %s EBC as %s with the color table, not the bitterness one", (ebc, level) => {
    expect(toBeerDto(Object.assign(buildEntity(), { ebc })).colorLevel).toBe(level);
  });

  it.each([
    [25, 45, { min: 3, max: 4 }],
    [4, 8, { min: 1, max: 1 }],
  ])("serves the style range %s-%s EBC as %j when the beer has no EBC", (ebcMin, ebcMax, range) => {
    const entity = buildEntity();
    const dto = toBeerDto(Object.assign(entity, { ebc: null, style: Object.assign(entity.style, { ebcMin, ebcMax }) }));

    expect(dto.colorLevel).toBeNull();
    expect(dto.styleColorRange).toEqual(range);
  });

  it("marks a beer without author as official", () => {
    expect(toBeerDto(Object.assign(buildEntity(), { createdBy: null }))).toMatchObject({
      source: BeerSourceEnum.OFFICIAL,
      createdBy: null,
    });
  });

  it("marks a beer with an author as community and exposes the author id", () => {
    expect(toBeerDto(Object.assign(buildEntity(), { createdBy: 2, createdAt: new Date(0) }))).toMatchObject({
      source: BeerSourceEnum.COMMUNITY,
      createdBy: 2,
    });
  });

  it("serves null raw characteristics and unchanged derived levels for a beer without any", () => {
    const entity = Object.assign(buildEntity(), { ibu: null, ebc: null, sweetness: null, acidity: null, body: null });

    expect(toBeerDto(entity)).toMatchObject({
      ibu: null,
      ebc: null,
      sweetness: null,
      acidity: null,
      body: null,
      bitternessLevel: null,
      colorLevel: null,
      styleColorRange: { min: 1, max: 1 },
    });
  });

  it("keeps empty collections as empty arrays", () => {
    const entity = Object.assign(buildEntity(), { aromas: [], formats: [] });

    expect(toBeerDto(entity)).toMatchObject({ aromas: [], formats: [] });
  });
});

describe("toCatalogBeerDto", () => {
  const BEER: BeerDto = {
    id: 12,
    name: "Chimay Rouge",
    breweryName: "Bières de Chimay",
    country: "BE",
    styleId: 7,
    styleName: "Dubbel trappiste",
    family: BeerFamilyEnum.TRAPPIST,
    abv: 7,
    ibu: 35,
    ebc: 20,
    sweetness: 2,
    acidity: null,
    body: 4,
    aromas: [BeerAromaEnum.FRUITY],
    formats: [BeerFormatEnum.BOTTLE],
    description: "Trappiste cuivrée.",
    bitternessLevel: 5,
    colorLevel: null,
    styleColorRange: { min: 3, max: 4 },
    source: BeerSourceEnum.COMMUNITY,
    createdBy: 2,
  };
  const SUMMARY = { beerId: 12, averageRating: 4.3, reviewCount: 2 };

  it("lists every field of the beer, the three fields of the state and the two of the rating summary", () => {
    expect(toCatalogBeerDto(BEER, { beerId: 12, drunk: true, checkinCount: 3, inWishlist: true }, SUMMARY, "Bob")).toStrictEqual({
      id: 12,
      name: "Chimay Rouge",
      breweryName: "Bières de Chimay",
      country: "BE",
      styleId: 7,
      styleName: "Dubbel trappiste",
      family: BeerFamilyEnum.TRAPPIST,
      abv: 7,
      ibu: 35,
      ebc: 20,
      sweetness: 2,
      acidity: null,
      body: 4,
      aromas: [BeerAromaEnum.FRUITY],
      formats: [BeerFormatEnum.BOTTLE],
      description: "Trappiste cuivrée.",
      bitternessLevel: 5,
      colorLevel: null,
      styleColorRange: { min: 3, max: 4 },
      source: BeerSourceEnum.COMMUNITY,
      createdBy: 2,
      createdByName: "Bob",
      drunk: true,
      checkinCount: 3,
      inWishlist: true,
      averageRating: 4.3,
      reviewCount: 2,
    });
  });

  it("does not leak the beerId of the state nor of the summary", () => {
    const keys = Object.keys(toCatalogBeerDto(BEER, { beerId: 12, drunk: false, checkinCount: 0, inWishlist: true }, SUMMARY, "Bob")).sort();

    expect(keys).toEqual([...Object.keys(BEER), "averageRating", "checkinCount", "createdByName", "drunk", "inWishlist", "reviewCount"].sort());
  });

  it("answers false, 0 and false when the state is absent", () => {
    expect(toCatalogBeerDto(BEER, undefined, SUMMARY, "Bob")).toStrictEqual({
      ...BEER,
      createdByName: "Bob",
      drunk: false,
      checkinCount: 0,
      inWishlist: false,
      averageRating: 4.3,
      reviewCount: 2,
    });
  });

  it("answers a null average and 0 reviews when the summary is absent", () => {
    expect(toCatalogBeerDto(BEER, undefined, undefined, "Bob")).toStrictEqual({
      ...BEER,
      createdByName: "Bob",
      drunk: false,
      checkinCount: 0,
      inWishlist: false,
      averageRating: null,
      reviewCount: 0,
    });
  });
});

describe("toCatalogBeerDto author", () => {
  const OFFICIAL: BeerDto = {
    id: 3,
    name: "Orval",
    breweryName: "Orval",
    country: "BE",
    styleId: 7,
    styleName: "Pale ale trappiste",
    family: BeerFamilyEnum.TRAPPIST,
    abv: 6.2,
    ibu: null,
    ebc: null,
    sweetness: null,
    acidity: null,
    body: null,
    aromas: [],
    formats: [BeerFormatEnum.BOTTLE],
    description: "Officielle.",
    bitternessLevel: null,
    colorLevel: null,
    styleColorRange: null,
    source: BeerSourceEnum.OFFICIAL,
    createdBy: null,
  };

  it("AC2 gives an official beer the source official, no author id and no author name", () => {
    const catalog = toCatalogBeerDto(OFFICIAL, undefined, undefined, null);

    expect(catalog).toMatchObject({ source: "official", createdBy: null, createdByName: null });
    expect(Object.keys(catalog)).toContain("createdByName");
  });

  it("AC1 gives a community beer the source community, the author id and the author name", () => {
    const community: BeerDto = { ...OFFICIAL, source: BeerSourceEnum.COMMUNITY, createdBy: 1 };

    expect(toCatalogBeerDto(community, undefined, undefined, "Alice")).toMatchObject({
      source: "community",
      createdBy: 1,
      createdByName: "Alice",
    });
  });

  it("keeps a null author name for a community beer whose author is unknown", () => {
    const community: BeerDto = { ...OFFICIAL, source: BeerSourceEnum.COMMUNITY, createdBy: 99 };

    expect(toCatalogBeerDto(community, undefined, undefined, null)).toMatchObject({ createdBy: 99, createdByName: null });
  });
});

describe("toBeerDetailDto", () => {
  const CATALOG: CatalogBeerDto = {
    id: 12,
    name: "Chimay Rouge",
    breweryName: "Bières de Chimay",
    country: "BE",
    styleId: 7,
    styleName: "Dubbel trappiste",
    family: BeerFamilyEnum.TRAPPIST,
    abv: 7,
    ibu: 35,
    ebc: 20,
    sweetness: 2,
    acidity: null,
    body: 4,
    aromas: [BeerAromaEnum.FRUITY],
    formats: [BeerFormatEnum.BOTTLE],
    description: "Trappiste cuivrée.",
    bitternessLevel: 5,
    colorLevel: null,
    styleColorRange: { min: 3, max: 4 },
    source: BeerSourceEnum.COMMUNITY,
    createdBy: 2,
    createdByName: "Bob",
    drunk: true,
    checkinCount: 3,
    inWishlist: true,
    averageRating: 4.3,
    reviewCount: 2,
  };
  const DISTRIBUTION = [1, 2, 3, 4, 5].map((stars) => ({ stars, count: stars % 2 }));
  const STATS: ReviewStatsDto = { ratingDistribution: DISTRIBUTION };

  it("lists every field of the catalog beer then the distribution, without any criteria", () => {
    expect(toBeerDetailDto(CATALOG, STATS)).toStrictEqual({ ...CATALOG, ratingDistribution: DISTRIBUTION });
  });

  it("copies the author name of the catalog beer, null included", () => {
    expect(toBeerDetailDto(CATALOG, STATS).createdByName).toBe("Bob");
    expect(toBeerDetailDto({ ...CATALOG, createdByName: null }, STATS).createdByName).toBeNull();
  });

  it("keeps the characteristics of the beer sheet", () => {
    expect(toBeerDetailDto(CATALOG, STATS)).toMatchObject({ ibu: 35, ebc: 20, sweetness: 2, acidity: null, body: 4 });
  });
});

describe("toNewBeer", () => {
  const NOW = new Date("2026-05-01T10:00:00Z");
  const dto: CreateBeerDto = {
    name: "Brune du Mont",
    breweryName: "Brasserie du Mont",
    country: "FR",
    styleId: 7,
    abv: 6.5,
    description: "Une brune.",
  };

  it("builds the insert row of a community beer with no characteristic, aroma nor format", () => {
    expect(toNewBeer(dto, 4, 1, NOW)).toStrictEqual({
      name: "Brune du Mont",
      breweryId: 4,
      styleId: 7,
      abv: 6.5,
      ibu: null,
      ebc: null,
      sweetness: null,
      acidity: null,
      body: null,
      description: "Une brune.",
      aromas: [],
      formats: [],
      country: "FR",
      searchText: "brune du mont brasserie du mont",
      createdBy: 1,
      createdAt: NOW,
    });
  });

  it("takes the characteristics, aromas and formats sent", () => {
    const row = toNewBeer(
      {
        ...dto,
        ibu: 35,
        ebc: 20,
        sweetness: 2,
        acidity: 1,
        body: 4,
        aromas: [BeerAromaEnum.FRUITY, BeerAromaEnum.HOPPY],
        formats: [BeerFormatEnum.CAN],
      },
      4,
      1,
      NOW,
    );

    expect(row).toMatchObject({
      ibu: 35,
      ebc: 20,
      sweetness: 2,
      acidity: 1,
      body: 4,
      aromas: [BeerAromaEnum.FRUITY, BeerAromaEnum.HOPPY],
      formats: [BeerFormatEnum.CAN],
    });
  });

  it("keeps a characteristic of 0 instead of replacing it with null", () => {
    expect(toNewBeer({ ...dto, ibu: 0 }, 4, 1, NOW).ibu).toBe(0);
  });

  it("uses an empty description when none is sent", () => {
    expect(toNewBeer({ ...dto, description: undefined }, 4, 1, NOW).description).toBe("");
  });

  it("folds accents, case and the sharp s in the search text", () => {
    expect(toNewBeer({ ...dto, name: "Ambrée STRAßE", breweryName: "Brasserie DUYCK" }, 4, 1, NOW).searchText).toBe(
      "ambree strasse brasserie duyck",
    );
  });
});
