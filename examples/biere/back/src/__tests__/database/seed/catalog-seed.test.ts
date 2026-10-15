import { describe, expect, it } from "vitest";
import { buildBeerRows, buildBreweryRows, buildStyleRows } from "@/database/seed/catalog-seed";

const AMBER_ROW = {
  family: "Ambrée",
  name: "Bière ambrée",
  description: "Une ambrée.",
  ebcMin: 20,
  ebcMax: 40,
  abvMin: 4.5,
  abvMax: 6,
  ibuMin: 15,
  ibuMax: 30,
};

describe("buildStyleRows", () => {
  it("translates the seed family label and keeps every other field", () => {

    expect(buildStyleRows([AMBER_ROW])).toEqual([
      {
        family: "amber",
        name: "Bière ambrée",
        description: "Une ambrée.",
        ebcMin: 20,
        ebcMax: 40,
        ibuMin: 15,
        ibuMax: 30,
        abvMin: 4.5,
        abvMax: 6,
      },
    ]);
  });

  it("translates Sans alcool into nonAlcoholic and keeps the row order", () => {

    const rows = buildStyleRows([{ ...AMBER_ROW, family: "Sans alcool", name: "Zéro" }, AMBER_ROW]);

    expect(rows.map((row: { family: string; name: string }) => [row.name, row.family])).toEqual([
      ["Zéro", "nonAlcoholic"],
      ["Bière ambrée", "amber"],
    ]);
  });

  it("fails with a message that names the style when the family label is unknown", () => {

    expect(() => buildStyleRows([AMBER_ROW, { ...AMBER_ROW, family: "Inconnue", name: "Style mystère" }])).toThrow(
      /Style mystère/,
    );
  });

  it("fails with a message that names the style when the family label is an object prototype key", () => {
    expect(() => buildStyleRows([{ ...AMBER_ROW, family: "constructor", name: "Style prototype" }])).toThrow(
      /Style prototype/,
    );
  });
});

describe("buildBreweryRows", () => {
  it("keeps name, country and city of every row", () => {

    const rows = [
      { name: "Bières de Chimay", country: "BE", city: "Chimay" },
      { name: "Brasserie d'Orval", country: "BE", city: "Villers-devant-Orval" },
    ];

    expect(buildBreweryRows(rows)).toEqual(rows);
  });
});

const STYLE_IDS = new Map([
  ["dubbel trappiste", 4],
  ["bière fruitée", 9],
]);
const BREWERY_IDS = new Map([
  ["bières de chimay", 11],
  ["brouwerij lindemans", 12],
]);

const CHIMAY_ROW = {
  name: "Chimay Rouge",
  breweryName: "Bières de Chimay",
  styleName: "Dubbel trappiste",
  abv: 7,
  ibu: null,
  ebc: null,
  description: "Trappiste cuivrée.",
  aromas: ["fruite", "caramel", "epice", "malte"],
  formats: ["bottle"],
  country: "BE",
  imageUrl: null,
};

describe("buildBeerRows", () => {
  it("resolves ids, translates aromas in seed order and drops the image url", () => {
    const rows = buildBeerRows([{ ...CHIMAY_ROW, imageUrl: "https://example.test/chimay.png" }], STYLE_IDS, BREWERY_IDS);

    expect(rows).toEqual([
      {
        name: "Chimay Rouge",
        breweryId: 11,
        styleId: 4,
        abv: 7,
        ibu: null,
        ebc: null,
        sweetness: null,
        acidity: null,
        body: null,
        description: "Trappiste cuivrée.",
        aromas: ["fruity", "caramel", "spicy", "malty"],
        formats: ["bottle"],
        country: "BE",
        searchText: "chimay rouge bieres de chimay",
      },
    ]);
  });

  it("keeps ibu and ebc when the seed gives them", () => {
    const [row] = buildBeerRows([{ ...CHIMAY_ROW, ibu: 25, ebc: 40 }], STYLE_IDS, BREWERY_IDS);

    expect([row.ibu, row.ebc]).toEqual([25, 40]);
  });

  it("leaves sweetness, acidity and body null even when the seed gives ibu and ebc", () => {
    const [row] = buildBeerRows([{ ...CHIMAY_ROW, ibu: 25, ebc: 40 }], STYLE_IDS, BREWERY_IDS);

    expect([row.sweetness, row.acidity, row.body]).toEqual([null, null, null]);
  });

  it("matches style and brewery names whatever their case", () => {
    const [row] = buildBeerRows(
      [{ ...CHIMAY_ROW, breweryName: "BIÈRES DE CHIMAY", styleName: "dubbel TRAPPISTE" }],
      STYLE_IDS,
      BREWERY_IDS,
    );

    expect([row.breweryId, row.styleId]).toEqual([11, 4]);
  });

  it("sorts the formats in the BeerFormatEnum order and removes duplicates", () => {
    const [row] = buildBeerRows(
      [{ ...CHIMAY_ROW, formats: ["draft", "bottle", "can", "bottle"] }],
      STYLE_IDS,
      BREWERY_IDS,
    );

    expect(row.formats).toEqual(["bottle", "can", "draft"]);
  });

  it("builds the search text from the beer and brewery names without accents or ß", () => {
    const [row] = buildBeerRows(
      [{ ...CHIMAY_ROW, name: "Lindemans Pêcheresse", breweryName: "Brouwerij Lindemans" }],
      STYLE_IDS,
      BREWERY_IDS,
    );

    expect(row.searchText).toBe("lindemans pecheresse brouwerij lindemans");
  });

  it("keeps the row order", () => {
    const rows = buildBeerRows(
      [CHIMAY_ROW, { ...CHIMAY_ROW, name: "Chimay Bleue" }, { ...CHIMAY_ROW, name: "Autre" }],
      STYLE_IDS,
      BREWERY_IDS,
    );

    expect(rows.map((row) => row.name)).toEqual(["Chimay Rouge", "Chimay Bleue", "Autre"]);
  });

  it.each([
    ["brewery", { breweryName: "Brasserie fantôme" }],
    ["style", { styleName: "Style fantôme" }],
    ["aroma", { aromas: ["fruite", "inconnu"] }],
    ["aroma named like an object prototype key", { aromas: ["constructor"] }],
    ["format", { formats: ["bottle", "keg"] }],
  ])("fails with a message that names the beer when its %s is unknown", (_label, override) => {
    expect(() => buildBeerRows([CHIMAY_ROW, { ...CHIMAY_ROW, ...override, name: "Bière mystère" }], STYLE_IDS, BREWERY_IDS)).toThrow(
      /Bière mystère/,
    );
  });
});
