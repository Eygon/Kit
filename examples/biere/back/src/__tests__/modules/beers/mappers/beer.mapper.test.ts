import { describe, expect, it } from "vitest";
import { Beer } from "@/modules/beers/entities/beer.entity";
import { BeerStyle } from "@/modules/beers/entities/beer-style.entity";
import { Brewery } from "@/modules/beers/entities/brewery.entity";
import { BeerAromaEnum } from "@/modules/beers/enums/beer-aroma.enum";
import { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";
import { BeerFormatEnum } from "@/modules/beers/enums/beer-format.enum";
import type { BeerDto } from "@/modules/beers/dtos/beer.dto";
import { toBeerDto, toCatalogBeerDto } from "@/modules/beers/mappers/beer.mapper";

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
    });
  });

  it("does not leak the internal columns", () => {
    const keys = Object.keys(toBeerDto(buildEntity())).sort();

    expect(keys).toEqual(
      [
        "abv",
        "aromas",
        "breweryName",
        "country",
        "description",
        "family",
        "formats",
        "id",
        "name",
        "styleId",
        "styleName",
      ].sort(),
    );
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
  };

  it("lists every field of the beer and the three fields of the state", () => {
    expect(toCatalogBeerDto(BEER, { beerId: 12, drunk: true, checkinCount: 3, inWishlist: true })).toStrictEqual({
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
      drunk: true,
      checkinCount: 3,
      inWishlist: true,
    });
  });

  it("does not leak the beerId of the state", () => {
    expect(Object.keys(toCatalogBeerDto(BEER, { beerId: 12, drunk: false, checkinCount: 0, inWishlist: true })).sort()).toEqual(
      [...Object.keys(BEER), "checkinCount", "drunk", "inWishlist"].sort(),
    );
  });

  it("answers false, 0 and false when the state is absent", () => {
    expect(toCatalogBeerDto(BEER, undefined)).toStrictEqual({ ...BEER, drunk: false, checkinCount: 0, inWishlist: false });
  });
});
