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
import { ReviewCriterionEnum } from "@/modules/beers/enums/review-criterion.enum";
import { toBeerDetailDto, toBeerDto, toCatalogBeerDto } from "@/modules/beers/mappers/beer.mapper";

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
    description: "Trappiste cuivrée.",
    aromas: [BeerAromaEnum.FRUITY, BeerAromaEnum.CARAMEL],
    formats: [BeerFormatEnum.BOTTLE, BeerFormatEnum.DRAFT],
    country: "BE",
    searchText: "chimay rouge bieres de chimay",
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
      aromas: [BeerAromaEnum.FRUITY, BeerAromaEnum.CARAMEL],
      formats: [BeerFormatEnum.BOTTLE, BeerFormatEnum.DRAFT],
      description: "Trappiste cuivrée.",
      bitternessLevel: 2,
      colorLevel: 3,
      styleColorRange: null,
    });
  });

  it("does not leak the internal columns", () => {
    const keys = Object.keys(toBeerDto(buildEntity())).sort();

    expect(keys).toEqual(
      [
        "abv",
        "aromas",
        "bitternessLevel",
        "breweryName",
        "colorLevel",
        "country",
        "description",
        "family",
        "formats",
        "id",
        "name",
        "styleColorRange",
        "styleId",
        "styleName",
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
    aromas: [BeerAromaEnum.FRUITY],
    formats: [BeerFormatEnum.BOTTLE],
    description: "Trappiste cuivrée.",
    bitternessLevel: 5,
    colorLevel: null,
    styleColorRange: { min: 3, max: 4 },
  };
  const SUMMARY = { beerId: 12, averageRating: 4.3, reviewCount: 2 };

  it("lists every field of the beer, the three fields of the state and the two of the rating summary", () => {
    expect(toCatalogBeerDto(BEER, { beerId: 12, drunk: true, checkinCount: 3, inWishlist: true }, SUMMARY)).toStrictEqual({
      id: 12,
      name: "Chimay Rouge",
      breweryName: "Bières de Chimay",
      country: "BE",
      styleId: 7,
      styleName: "Dubbel trappiste",
      family: BeerFamilyEnum.TRAPPIST,
      abv: 7,
      aromas: [BeerAromaEnum.FRUITY],
      formats: [BeerFormatEnum.BOTTLE],
      description: "Trappiste cuivrée.",
      bitternessLevel: 5,
      colorLevel: null,
      styleColorRange: { min: 3, max: 4 },
      drunk: true,
      checkinCount: 3,
      inWishlist: true,
      averageRating: 4.3,
      reviewCount: 2,
    });
  });

  it("does not leak the beerId of the state nor of the summary", () => {
    const keys = Object.keys(toCatalogBeerDto(BEER, { beerId: 12, drunk: false, checkinCount: 0, inWishlist: true }, SUMMARY)).sort();

    expect(keys).toEqual([...Object.keys(BEER), "averageRating", "checkinCount", "drunk", "inWishlist", "reviewCount"].sort());
  });

  it("answers false, 0 and false when the state is absent", () => {
    expect(toCatalogBeerDto(BEER, undefined, SUMMARY)).toStrictEqual({
      ...BEER,
      drunk: false,
      checkinCount: 0,
      inWishlist: false,
      averageRating: 4.3,
      reviewCount: 2,
    });
  });

  it("answers a null average and 0 reviews when the summary is absent", () => {
    expect(toCatalogBeerDto(BEER, undefined, undefined)).toStrictEqual({
      ...BEER,
      drunk: false,
      checkinCount: 0,
      inWishlist: false,
      averageRating: null,
      reviewCount: 0,
    });
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
    aromas: [BeerAromaEnum.FRUITY],
    formats: [BeerFormatEnum.BOTTLE],
    description: "Trappiste cuivrée.",
    bitternessLevel: 5,
    colorLevel: null,
    styleColorRange: { min: 3, max: 4 },
    drunk: true,
    checkinCount: 3,
    inWishlist: true,
    averageRating: 4.3,
    reviewCount: 2,
  };
  const DISTRIBUTION = [1, 2, 3, 4, 5].map((stars) => ({ stars, count: stars % 2 }));
  const stats = (sweetness: number, acidity: number, body: number): ReviewStatsDto => ({
    ratingDistribution: DISTRIBUTION,
    criteria: [
      { criterion: ReviewCriterionEnum.SWEETNESS, average: 2.7, count: sweetness },
      { criterion: ReviewCriterionEnum.ACIDITY, average: 5, count: acidity },
      { criterion: ReviewCriterionEnum.BODY, average: 1.5, count: body },
    ],
  });

  it("lists every field of the catalog beer then the distribution and the criteria", () => {
    expect(toBeerDetailDto(CATALOG, stats(3, 3, 3))).toStrictEqual({
      ...CATALOG,
      ratingDistribution: DISTRIBUTION,
      criteria: [
        { criterion: "sweetness", average: 2.7, count: 3 },
        { criterion: "acidity", average: 5, count: 3 },
        { criterion: "body", average: 1.5, count: 3 },
      ],
    });
  });

  it("hides the average of a criterion filled by fewer than 3 reviews and keeps its count", () => {
    expect(toBeerDetailDto(CATALOG, stats(2, 0, 3)).criteria).toStrictEqual([
      { criterion: "sweetness", average: null, count: 2 },
      { criterion: "acidity", average: null, count: 0 },
      { criterion: "body", average: 1.5, count: 3 },
    ]);
  });

  it("keeps the order sweetness, acidity, body whatever the order of the statistics", () => {
    const reversed: ReviewStatsDto = { ratingDistribution: DISTRIBUTION, criteria: [...stats(3, 3, 3).criteria].reverse() };

    expect(toBeerDetailDto(CATALOG, reversed).criteria.map((criterion) => criterion.criterion)).toEqual([
      "sweetness",
      "acidity",
      "body",
    ]);
  });
});
