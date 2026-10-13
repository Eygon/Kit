import en from "@/i18n/locales/en.json";
import fr from "@/i18n/locales/fr.json";
import { BeerFamilyEnum, isBeerFamily, BEER_FAMILY_LABEL_KEYS } from "@/types/enums/beer/beerFamilyEnum";
import { BeerAromaEnum, isBeerAroma, BEER_AROMA_LABEL_KEYS } from "@/types/enums/beer/beerAromaEnum";
import { BeerFormatEnum, isBeerFormat, BEER_FORMAT_LABEL_KEYS } from "@/types/enums/beer/beerFormatEnum";
import { BeerSortEnum, DEFAULT_BEER_SORT, isBeerSort, BEER_SORT_LABEL_KEYS } from "@/types/enums/beer/beerSortEnum";


const readKey = (locale: unknown, path: string) =>
  path.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], locale);

const expectTranslated = (keys: string[]) => {
  keys.forEach((key) => {
    expect(readKey(fr, key)).toEqual(expect.any(String));
    expect(readKey(fr, key)).not.toBe("");
    expect(readKey(en, key)).toEqual(expect.any(String));
    expect(readKey(en, key)).not.toBe("");
  });
};

describe("BeerFamilyEnum", () => {
  it("carries the contract values verbatim, in the contract order", () => {
    expect(Object.values(BeerFamilyEnum)).toEqual([
      "lager",
      "pilsner",
      "paleAle",
      "ipa",
      "blonde",
      "amber",
      "brown",
      "stout",
      "porter",
      "witbier",
      "weizen",
      "saison",
      "trappist",
      "abbey",
      "belgianStrong",
      "sourLambic",
      "fruit",
      "nonAlcoholic",
    ]);
  });

  it("accepts every contract family and rejects anything else", () => {
    Object.values(BeerFamilyEnum).forEach((value) => expect(isBeerFamily(value)).toBe(true));
    ["", "IPA", "unknown", "Lager", 1, null, undefined].forEach((value) => expect(isBeerFamily(value)).toBe(false));
  });

  it("maps every family to a translated label key", () => {
    const keys = Object.values(BeerFamilyEnum).map((value) => BEER_FAMILY_LABEL_KEYS[value]);

    expect(keys).toEqual(Object.values(BeerFamilyEnum).map((value) => `beer.families.${value}`));
    expectTranslated(keys);
  });
});

describe("BeerAromaEnum", () => {
  it("carries the contract values verbatim", () => {
    expect(Object.values(BeerAromaEnum)).toEqual([
      "fruity",
      "citrus",
      "hoppy",
      "floral",
      "spicy",
      "caramel",
      "malty",
      "roasted",
      "coffee",
      "chocolate",
      "honey",
      "banana",
      "clove",
      "sour",
      "woody",
      "herbal",
      "smoky",
      "biscuit",
    ]);
  });

  it("guards the values and maps each to a translated label key", () => {
    Object.values(BeerAromaEnum).forEach((value) => expect(isBeerAroma(value)).toBe(true));
    ["fruite", "agrumes", "", 3, null].forEach((value) => expect(isBeerAroma(value)).toBe(false));
    const keys = Object.values(BeerAromaEnum).map((value) => BEER_AROMA_LABEL_KEYS[value]);
    expect(keys).toEqual(Object.values(BeerAromaEnum).map((value) => `beer.aromas.${value}`));
    expectTranslated(keys);
  });
});

describe("BeerFormatEnum", () => {
  it("carries the contract values verbatim, in the reference order", () => {
    expect(Object.values(BeerFormatEnum)).toEqual(["bottle", "can", "draft"]);
  });

  it("guards the values and maps each to a translated label key", () => {
    Object.values(BeerFormatEnum).forEach((value) => expect(isBeerFormat(value)).toBe(true));
    ["keg", "Bottle", "", 1, undefined].forEach((value) => expect(isBeerFormat(value)).toBe(false));
    const keys = Object.values(BeerFormatEnum).map((value) => BEER_FORMAT_LABEL_KEYS[value]);
    expect(keys).toEqual(Object.values(BeerFormatEnum).map((value) => `beer.formats.${value}`));
    expectTranslated(keys);
  });
});

describe("BeerSortEnum", () => {
  it("carries the contract values and defaults to the name sort", () => {
    expect(Object.values(BeerSortEnum)).toEqual(["name", "abv", "brewery"]);
    expect(DEFAULT_BEER_SORT).toBe(BeerSortEnum.NAME);
  });

  it("guards the values and maps each to a translated label key", () => {
    Object.values(BeerSortEnum).forEach((value) => expect(isBeerSort(value)).toBe(true));
    ["rating", "Name", "", null].forEach((value) => expect(isBeerSort(value)).toBe(false));
    const keys = Object.values(BeerSortEnum).map((value) => BEER_SORT_LABEL_KEYS[value]);
    expect(keys).toEqual(Object.values(BeerSortEnum).map((value) => `beer.sorts.${value}`));
    expectTranslated(keys);
  });
});
