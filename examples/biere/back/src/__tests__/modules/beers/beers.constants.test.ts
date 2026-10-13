import { describe, expect, it } from "vitest";
import {
  BEER_DESCRIPTION_MAX_LENGTH,
  BEER_NAME_MAX_LENGTH,
  BEER_SEARCH_TEXT_MAX_LENGTH,
  BEER_STYLE_DESCRIPTION_MAX_LENGTH,
  BEER_STYLE_NAME_MAX_LENGTH,
  BREWERY_CITY_MAX_LENGTH,
  BREWERY_NAME_MAX_LENGTH,
  COUNTRY_CODE_LENGTH,
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
    }).toEqual({ name: 60, description: 300, searchText: 120 });
  });
});
