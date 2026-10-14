import { EMPTY_BEER_FORM, formValuesToNewBeer, getBeerFormErrorKeys } from "@/pages/encyclopedia/utils/beerFormValues";
import * as constants from "@/pages/encyclopedia/utils/proposeBeerConstants";

const { COUNTRY_CODES } = constants;

// ISO 3166-1 alpha-2, the 249 officially assigned codes: the same list as COUNTRY_CODES of the back (beers.constants.ts).
const ISO_3166_1_ALPHA_2 =
  `
  AD AE AF AG AI AL AM AO AQ AR
  AS AT AU AW AX AZ BA BB BD BE
  BF BG BH BI BJ BL BM BN BO BQ
  BR BS BT BV BW BY BZ CA CC CD
  CF CG CH CI CK CL CM CN CO CR
  CU CV CW CX CY CZ DE DJ DK DM
  DO DZ EC EE EG EH ER ES ET FI
  FJ FK FM FO FR GA GB GD GE GF
  GG GH GI GL GM GN GP GQ GR GS
  GT GU GW GY HK HM HN HR HT HU
  ID IE IL IM IN IO IQ IR IS IT
  JE JM JO JP KE KG KH KI KM KN
  KP KR KW KY KZ LA LB LC LI LK
  LR LS LT LU LV LY MA MC MD ME
  MF MG MH MK ML MM MN MO MP MQ
  MR MS MT MU MV MW MX MY MZ NA
  NC NE NF NG NI NL NO NP NR NU
  NZ OM PA PE PF PG PH PK PL PM
  PN PR PS PT PW PY QA RE RO RS
  RU RW SA SB SC SD SE SG SH SI
  SJ SK SL SM SN SO SR SS ST SV
  SX SY SZ TC TD TF TG TH TJ TK
  TL TM TN TO TR TT TV TW TZ UA
  UG UM US UY UZ VA VC VE VG VI
  VN VU WF WS YE YT ZA ZM ZW
`
    .trim()
    .split(/\s+/);

const VALID = {
  name: "Orval",
  breweryName: "Brasserie d'Orval",
  country: "BE",
  styleId: 12,
  abv: 6.2,
  description: "Une trappiste.",
};

describe("proposeBeerConstants", () => {
  it("carries the bounds the back validates", () => {
    expect(constants.BEER_NAME_MIN_LENGTH).toBe(2);
    expect(constants.BEER_NAME_MAX_LENGTH).toBe(80);
    expect(constants.BREWERY_NAME_MIN_LENGTH).toBe(2);
    expect(constants.BREWERY_NAME_MAX_LENGTH).toBe(60);
    expect(constants.BEER_DESCRIPTION_MAX_LENGTH).toBe(500);
    expect(constants.BEER_ABV_MIN).toBe(0);
    expect(constants.BEER_ABV_MAX).toBe(20);
    expect(constants.BEER_ABV_STEP).toBe(0.1);
    expect(constants.PROPOSE_BEER_FORM_ID).toBe("propose-beer-form");
  });

  it("lists the 249 ISO 3166-1 alpha-2 codes once each, in alphabetical order", () => {
    expect(COUNTRY_CODES).toHaveLength(249);
    expect(new Set(COUNTRY_CODES).size).toBe(249);
    expect([...COUNTRY_CODES].sort()).toEqual(COUNTRY_CODES);
    COUNTRY_CODES.forEach((code: string) => expect(code).toMatch(/^[A-Z]{2}$/));
    expect(COUNTRY_CODES[0]).toBe("AD");
    expect(COUNTRY_CODES[COUNTRY_CODES.length - 1]).toBe("ZW");
    expect(COUNTRY_CODES).toEqual(expect.arrayContaining(["BE", "FR", "DE", "US", "JP"]));
  });

  it("is exactly the ISO 3166-1 alpha-2 list the back validates, not a look-alike", () => {
    expect(ISO_3166_1_ALPHA_2).toHaveLength(249);
    expect(COUNTRY_CODES).toEqual(ISO_3166_1_ALPHA_2);
  });
});

describe("EMPTY_BEER_FORM", () => {
  it("is an empty form with no country, no style and an empty degree", () => {
    expect(EMPTY_BEER_FORM).toEqual({
      name: "",
      breweryName: "",
      country: null,
      styleId: null,
      abv: Number.NaN,
      description: "",
    });
  });
});

describe("formValuesToNewBeer", () => {
  it("collapses inner whitespace and trims the name and the brewery, trims the description", () => {
    const result = formValuesToNewBeer({
      ...VALID,
      name: "  Orval \n  Extra\t Ale  ",
      breweryName: "  Brasserie   d'Orval ",
      description: "  Une trappiste.  ",
    });

    expect(result).toEqual({
      name: "Orval Extra Ale",
      breweryName: "Brasserie d'Orval",
      country: "BE",
      styleId: 12,
      abv: 6.2,
      description: "Une trappiste.",
    });
  });

  it("keeps a name with markup as plain text", () => {
    expect(formValuesToNewBeer({ ...VALID, name: "<b>gras</b>" })?.name).toBe("<b>gras</b>");
  });

  it("returns null while the country or the style is missing", () => {
    expect(formValuesToNewBeer({ ...VALID, country: null })).toBeNull();
    expect(formValuesToNewBeer({ ...VALID, styleId: null })).toBeNull();
  });
});

describe("getBeerFormErrorKeys", () => {
  it("reports no error for a valid form", () => {
    expect(getBeerFormErrorKeys(VALID)).toEqual({});
  });

  it("reports every required field of an empty form and nothing for the description", () => {
    expect(getBeerFormErrorKeys(EMPTY_BEER_FORM)).toEqual({
      name: "pages.encyclopedia.propose.errors.nameLength",
      breweryName: "pages.encyclopedia.propose.errors.breweryLength",
      country: "pages.encyclopedia.propose.errors.countryRequired",
      styleId: "pages.encyclopedia.propose.errors.styleRequired",
      abv: "pages.encyclopedia.propose.errors.abvRequired",
    });
  });

  it("accepts a name of 2 letters and of 80 letters, refuses 1 and 81", () => {
    const nameError = (name: string) => getBeerFormErrorKeys({ ...VALID, name }).name;

    expect(nameError("ab")).toBeUndefined();
    expect(nameError("a".repeat(80))).toBeUndefined();
    expect(nameError("a")).toBe("pages.encyclopedia.propose.errors.nameLength");
    expect(nameError("a".repeat(81))).toBe("pages.encyclopedia.propose.errors.nameLength");
    expect(nameError("")).toBe("pages.encyclopedia.propose.errors.nameLength");
  });

  it("measures the name after cleaning: padded 80 passes, padded 81 and a single letter between spaces fail", () => {
    const nameError = (name: string) => getBeerFormErrorKeys({ ...VALID, name }).name;

    expect(nameError(`  ${"a".repeat(80)}  `)).toBeUndefined();
    expect(nameError(`  ${"a".repeat(81)}  `)).toBe("pages.encyclopedia.propose.errors.nameLength");
    expect(nameError("   a   ")).toBe("pages.encyclopedia.propose.errors.nameLength");
    expect(nameError("a     b")).toBeUndefined();
    expect(nameError(`${"a".repeat(40)}      ${"b".repeat(39)}`)).toBeUndefined();
    expect(nameError(`${"a".repeat(40)}      ${"b".repeat(40)}`)).toBe("pages.encyclopedia.propose.errors.nameLength");
  });

  it("refuses a name made of spaces only, whatever their kind", () => {
    const nameError = (name: string) => getBeerFormErrorKeys({ ...VALID, name }).name;

    expect(nameError("     ")).toBe("pages.encyclopedia.propose.errors.nameLength");
    expect(nameError(" \n\t \u00a0 ")).toBe("pages.encyclopedia.propose.errors.nameLength");
  });

  it("refuses a brewery made of spaces only, whatever their kind", () => {
    const breweryError = (breweryName: string) => getBeerFormErrorKeys({ ...VALID, breweryName }).breweryName;

    expect(breweryError("   ")).toBe("pages.encyclopedia.propose.errors.breweryLength");
    expect(breweryError(" \n\t \u00a0 ")).toBe("pages.encyclopedia.propose.errors.breweryLength");
  });

  it("accepts a brewery of 2 and of 60 letters, refuses 1 and 61, after cleaning", () => {
    const breweryError = (breweryName: string) => getBeerFormErrorKeys({ ...VALID, breweryName }).breweryName;

    expect(breweryError("ab")).toBeUndefined();
    expect(breweryError("a".repeat(60))).toBeUndefined();
    expect(breweryError(`  ${"a".repeat(60)}  `)).toBeUndefined();
    expect(breweryError("a")).toBe("pages.encyclopedia.propose.errors.breweryLength");
    expect(breweryError("a".repeat(61))).toBe("pages.encyclopedia.propose.errors.breweryLength");
    expect(breweryError(`  ${"a".repeat(61)}  `)).toBe("pages.encyclopedia.propose.errors.breweryLength");
  });

  it("requires a country and a style", () => {
    expect(getBeerFormErrorKeys({ ...VALID, country: null })).toEqual({
      country: "pages.encyclopedia.propose.errors.countryRequired",
    });
    expect(getBeerFormErrorKeys({ ...VALID, styleId: null })).toEqual({
      styleId: "pages.encyclopedia.propose.errors.styleRequired",
    });
  });

  it("requires a degree, and accepts 0 and 20 but refuses -0.1, 20.1 and 25", () => {
    const abvError = (abv: number) => getBeerFormErrorKeys({ ...VALID, abv }).abv;

    expect(abvError(Number.NaN)).toBe("pages.encyclopedia.propose.errors.abvRequired");
    expect(abvError(0)).toBeUndefined();
    expect(abvError(20)).toBeUndefined();
    expect(abvError(0.1)).toBeUndefined();
    expect(abvError(19.9)).toBeUndefined();
    expect(abvError(-0.1)).toBe("pages.encyclopedia.propose.errors.abvRange");
    expect(abvError(20.1)).toBe("pages.encyclopedia.propose.errors.abvRange");
    expect(abvError(25)).toBe("pages.encyclopedia.propose.errors.abvRange");
  });

  it("accepts one digit after the comma and refuses two, including 7.25 and 4.35", () => {
    const abvError = (abv: number) => getBeerFormErrorKeys({ ...VALID, abv }).abv;

    expect(abvError(7.3)).toBeUndefined();
    expect(abvError(1.1)).toBeUndefined();
    expect(abvError(7.25)).toBe("pages.encyclopedia.propose.errors.abvStep");
    expect(abvError(4.35)).toBe("pages.encyclopedia.propose.errors.abvStep");
    expect(abvError(5.01)).toBe("pages.encyclopedia.propose.errors.abvStep");
  });

  it("reports the range before the step", () => {
    expect(getBeerFormErrorKeys({ ...VALID, abv: 25.55 }).abv).toBe("pages.encyclopedia.propose.errors.abvRange");
  });

  it("accepts a description of 500 characters and refuses 501, after trimming", () => {
    const descriptionError = (description: string) => getBeerFormErrorKeys({ ...VALID, description }).description;

    expect(descriptionError("")).toBeUndefined();
    expect(descriptionError("a".repeat(500))).toBeUndefined();
    expect(descriptionError(`  ${"a".repeat(500)}  `)).toBeUndefined();
    expect(descriptionError("a".repeat(501))).toBe("pages.encyclopedia.propose.errors.descriptionLength");
    expect(descriptionError(`  ${"a".repeat(501)}  `)).toBe("pages.encyclopedia.propose.errors.descriptionLength");
  });
});
