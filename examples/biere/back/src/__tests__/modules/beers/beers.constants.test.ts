import { describe, expect, it } from "vitest";
import * as beersConstants from "@/modules/beers/beers.constants";
import {
  BEER_ABV_MAX_DECIMAL_PLACES,
  BEER_ABV_MAX_PERCENT,
  BEER_LIST_MIN_ITEMS,
  CORRECTION_QUORUM,
  CORRECTION_REASON_MAX_LENGTH,
  CORRECTIONS_RECENTLY_CLOSED_LIMIT,
  CORRECTION_VALUE_MAX_LENGTH,
  CORRECTION_VOTE_DURATION_DAYS,
  CORRECTION_VOTE_DURATION_MS,
  CORRECTION_WINDOW_MS,
  CORRECTIONS_PER_WINDOW_MAX,
  BEER_AROMAS_MAX,
  BEER_EBC_MAX,
  BEER_EBC_MIN,
  BEER_FORMATS_MAX,
  BEER_IBU_MAX,
  BEER_IBU_MIN,
  BEER_SCALE_MAX,
  BEER_SCALE_MIN,
  BEER_DESCRIPTION_MAX_LENGTH,
  BEER_NAME_MAX_LENGTH,
  BEER_NAME_MIN_LENGTH,
  BEER_PROPOSAL_ABV_MAX_PERCENT,
  BEER_PROPOSAL_WINDOW_MS,
  BEER_PROPOSALS_PER_WINDOW_MAX,
  BEER_SEARCH_TEXT_MAX_LENGTH,
  BEER_STYLE_DESCRIPTION_MAX_LENGTH,
  BEER_STYLE_NAME_MAX_LENGTH,
  BREWERY_CITY_MAX_LENGTH,
  BREWERY_NAME_MAX_LENGTH,
  BREWERY_NAME_MIN_LENGTH,
  COUNTRY_CODE_LENGTH,
  COUNTRY_CODES,
} from "@/modules/beers/beers.constants";

describe("beers constants", () => {
  it("bounds names, descriptions, cities and country codes", () => {
    expect({
      styleName: BEER_STYLE_NAME_MAX_LENGTH,
      styleDescription: BEER_STYLE_DESCRIPTION_MAX_LENGTH,
      breweryName: BREWERY_NAME_MAX_LENGTH,
      breweryCity: BREWERY_CITY_MAX_LENGTH,
      countryCode: COUNTRY_CODE_LENGTH,
    }).toEqual({ styleName: 60, styleDescription: 200, breweryName: 60, breweryCity: 60, countryCode: 2 });
  });

  it("bounds beer names, descriptions and search texts", () => {
    expect({
      name: BEER_NAME_MAX_LENGTH,
      description: BEER_DESCRIPTION_MAX_LENGTH,
      searchText: BEER_SEARCH_TEXT_MAX_LENGTH,
    }).toEqual({ name: 80, description: 500, searchText: 141 });
  });

  it("derives the search text length from the beer name, a space and the brewery name", () => {
    expect(BEER_SEARCH_TEXT_MAX_LENGTH).toBe(BEER_NAME_MAX_LENGTH + 1 + BREWERY_NAME_MAX_LENGTH);
  });

  it("sets the proposal rules without touching the filter ceiling", () => {
    expect({
      beerNameMin: BEER_NAME_MIN_LENGTH,
      breweryNameMin: BREWERY_NAME_MIN_LENGTH,
      proposalAbvMax: BEER_PROPOSAL_ABV_MAX_PERCENT,
      abvDecimals: BEER_ABV_MAX_DECIMAL_PLACES,
      perWindow: BEER_PROPOSALS_PER_WINDOW_MAX,
      windowMs: BEER_PROPOSAL_WINDOW_MS,
      filterAbvMax: BEER_ABV_MAX_PERCENT,
    }).toEqual({
      beerNameMin: 2,
      breweryNameMin: 2,
      proposalAbvMax: 20,
      abvDecimals: 1,
      perWindow: 10,
      windowMs: 86_400_000,
      filterAbvMax: 14,
    });
  });

  it("bounds the characteristics of a beer", () => {
    expect({
      ibuMin: BEER_IBU_MIN,
      ibuMax: BEER_IBU_MAX,
      ebcMin: BEER_EBC_MIN,
      ebcMax: BEER_EBC_MAX,
      scaleMin: BEER_SCALE_MIN,
      scaleMax: BEER_SCALE_MAX,
      aromasMax: BEER_AROMAS_MAX,
      formatsMax: BEER_FORMATS_MAX,
    }).toEqual({ ibuMin: 0, ibuMax: 120, ebcMin: 2, ebcMax: 80, scaleMin: 1, scaleMax: 5, aromasMax: 5, formatsMax: 3 });
  });

  it("no longer exposes the review criterion constants", () => {
    expect(Object.keys(beersConstants).filter((name) => name.startsWith("REVIEW_CRITERION"))).toEqual([]);
  });

  it("lists the 249 ISO 3166-1 alpha-2 country codes in alphabetical order without duplicate", () => {
    expect(COUNTRY_CODES).toHaveLength(249);
    expect(new Set(COUNTRY_CODES).size).toBe(249);
    expect([...COUNTRY_CODES].sort()).toEqual([...COUNTRY_CODES]);
    expect(COUNTRY_CODES.every((code) => /^[A-Z]{2}$/.test(code))).toBe(true);
  });

  it("knows the countries of the seeded breweries and rejects codes outside the standard", () => {
    expect(COUNTRY_CODES).toEqual(expect.arrayContaining(["FR", "BE", "DE", "GB", "US", "ZW", "AD", "AX"]));
    expect(COUNTRY_CODES).not.toContain("XX");
    expect(COUNTRY_CODES).not.toContain("UK");
  });

  it("sets the correction rules: seven days to vote, bounded texts, ten proposals per 24 hours", () => {
    expect({
      voteDays: CORRECTION_VOTE_DURATION_DAYS,
      voteMs: CORRECTION_VOTE_DURATION_MS,
      reasonMax: CORRECTION_REASON_MAX_LENGTH,
      valueMax: CORRECTION_VALUE_MAX_LENGTH,
      perWindow: CORRECTIONS_PER_WINDOW_MAX,
      windowMs: CORRECTION_WINDOW_MS,
      listMin: BEER_LIST_MIN_ITEMS,
    }).toEqual({ voteDays: 7, voteMs: 604_800_000, reasonMax: 200, valueMax: 200, perWindow: 10, windowMs: 86_400_000, listMin: 1 });
  });

  it("sets the resolution rules: a quorum of two agreements and the ten latest closed corrections", () => {
    expect({ quorum: CORRECTION_QUORUM, recentlyClosed: CORRECTIONS_RECENTLY_CLOSED_LIMIT }).toEqual({ quorum: 2, recentlyClosed: 10 });
  });
});
