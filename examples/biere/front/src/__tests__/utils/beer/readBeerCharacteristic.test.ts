import {
  BEER_CHARACTERISTICS,
  BEER_CHARACTERISTIC_LABEL_KEYS,
  BEER_SCALE_LEVEL_LABEL_KEYS,
  BeerCharacteristicEnum,
  isBeerCharacteristic,
} from "@/types/enums/beer/beerCharacteristicEnum";
import type { Beer } from "@/types/models/beer/beer";
import { readBeerCharacteristic } from "@/utils/beer/readBeerCharacteristic";

const BEER = {
  abv: 7,
  ibu: 35,
  ebc: 20,
  sweetness: 3,
  acidity: null,
  body: 4,
  aromas: ["fruity", "hoppy"],
  formats: ["bottle"],
} as Beer;

describe("readBeerCharacteristic", () => {
  it.each([
    ["ABV", 7],
    ["IBU", 35],
    ["EBC", 20],
    ["SWEETNESS", 3],
    ["ACIDITY", null],
    ["BODY", 4],
    ["AROMAS", ["fruity", "hoppy"]],
    ["FORMATS", ["bottle"]],
  ])("reads %s from the beer", (member, expected) => {
    expect(readBeerCharacteristic(BEER, BeerCharacteristicEnum[member as keyof typeof BeerCharacteristicEnum])).toEqual(expected);
  });

  it("reads an empty aroma list and an empty format list as null", () => {
    expect(readBeerCharacteristic({ ...BEER, aromas: [] }, BeerCharacteristicEnum.AROMAS)).toBeNull();
    expect(readBeerCharacteristic({ ...BEER, formats: [] }, BeerCharacteristicEnum.FORMATS)).toBeNull();
  });

  it("keeps a zero value instead of reading it as missing", () => {
    expect(readBeerCharacteristic({ ...BEER, ibu: 0 }, BeerCharacteristicEnum.IBU)).toBe(0);
    expect(readBeerCharacteristic({ ...BEER, abv: 0 }, BeerCharacteristicEnum.ABV)).toBe(0);
  });
});

describe("BeerCharacteristicEnum", () => {
  it("carries the eight contract values", () => {
    expect(Object.values(BeerCharacteristicEnum)).toEqual(["abv", "ibu", "ebc", "sweetness", "acidity", "body", "aromas", "formats"]);
  });

  it("lists the characteristics in display order with one label key each", () => {
    expect(BEER_CHARACTERISTICS).toEqual(["abv", "ibu", "ebc", "sweetness", "acidity", "body", "aromas", "formats"]);
    expect(BEER_CHARACTERISTICS.map((characteristic) => BEER_CHARACTERISTIC_LABEL_KEYS[characteristic])).toEqual([
      "beer.characteristics.abv",
      "beer.characteristics.ibu",
      "beer.characteristics.ebc",
      "beer.characteristics.sweetness",
      "beer.characteristics.acidity",
      "beer.characteristics.body",
      "beer.characteristics.aromas",
      "beer.characteristics.formats",
    ]);
  });

  it("maps each scale to its five level keys", () => {
    expect(Object.keys(BEER_SCALE_LEVEL_LABEL_KEYS)).toEqual(["sweetness", "acidity", "body"]);
    expect(BEER_SCALE_LEVEL_LABEL_KEYS[BeerCharacteristicEnum.ACIDITY]).toEqual([1, 2, 3, 4, 5].map((level) => `beer.criteria.acidity.levels.${level}`));
    expect(BEER_SCALE_LEVEL_LABEL_KEYS[BeerCharacteristicEnum.SWEETNESS]?.[0]).toBe("beer.criteria.sweetness.levels.1");
    expect(BEER_SCALE_LEVEL_LABEL_KEYS[BeerCharacteristicEnum.BODY]?.[4]).toBe("beer.criteria.body.levels.5");
  });

  it("recognises a characteristic and rejects anything else", () => {
    expect(isBeerCharacteristic("ebc")).toBe(true);
    expect(isBeerCharacteristic("EBC")).toBe(false);
    expect(isBeerCharacteristic("color")).toBe(false);
    expect(isBeerCharacteristic(3)).toBe(false);
    expect(isBeerCharacteristic(null)).toBe(false);
  });
});
