import { describe, expect, it } from "vitest";
import { BEER_AROMA_BY_SEED_SLUG, BeerAromaEnum } from "@/modules/beers/enums/beer-aroma.enum";
import beersSeed from "@/database/seed/data/beers.json";

const CONTRACT_AROMAS = [
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
];

describe("BeerAromaEnum", () => {
  it("lists the 18 contract aromas in the contract order", () => {
    expect(Object.values(BeerAromaEnum)).toEqual(CONTRACT_AROMAS);
  });

  it("translates every seed slug into its contract value", () => {
    expect(BEER_AROMA_BY_SEED_SLUG).toEqual({
      fruite: "fruity",
      agrumes: "citrus",
      houblonne: "hoppy",
      floral: "floral",
      epice: "spicy",
      caramel: "caramel",
      malte: "malty",
      torrefie: "roasted",
      cafe: "coffee",
      chocolat: "chocolate",
      miel: "honey",
      banane: "banana",
      "clou-de-girofle": "clove",
      acidulee: "sour",
      boisee: "woody",
      herbace: "herbal",
      fume: "smoky",
      biscuit: "biscuit",
    });
  });

  it("covers every slug used by the beers seed", () => {
    const seedSlugs = new Set(beersSeed.flatMap((beer) => beer.aromas));

    expect([...seedSlugs].filter((slug) => !Object.hasOwn(BEER_AROMA_BY_SEED_SLUG, slug))).toEqual([]);
  });
});
