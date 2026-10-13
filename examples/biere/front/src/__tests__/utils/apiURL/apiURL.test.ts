import {
  API_V1,
  BEERS,
  BEER_BY_ID,
  BEER_STYLES,
  ME_DEX,
  VENUES,
  VENUE_BEERS,
  VENUE_BEER_VOTES,
} from "@/utils/apiURL/apiURL";
import { API_BASE_URL } from "@/config/apiConfig";

describe("apiURL", () => {
  it("prefixes every route with the global api version under the configured base", () => {
    expect(API_V1()).toBe(`${API_BASE_URL}/api/v1`);
  });

  it("builds the beers collection route from the api root", () => {
    expect(BEERS()).toBe(`${API_V1()}/beers`);
    expect(BEERS()).toMatch(/\/api\/v1\/beers$/);
  });

  it("builds the beer styles route from the api root", () => {
    expect(BEER_STYLES()).toBe(`${API_V1()}/beer-styles`);
    expect(BEER_STYLES()).toMatch(/\/api\/v1\/beer-styles$/);
  });

  it("builds the beer route from the beers collection and the id", () => {
    expect(BEER_BY_ID(7)).toBe(`${BEERS()}/7`);
    expect(BEER_BY_ID(7)).toMatch(/\/api\/v1\/beers\/7$/);
  });

  it("builds the dex route of the current user from the api root", () => {
    expect(ME_DEX()).toBe(`${API_V1()}/me/dex`);
    expect(ME_DEX()).toMatch(/\/api\/v1\/me\/dex$/);
  });

  it("builds the venues collection route from the api root", () => {
    expect(VENUES()).toBe(`${API_V1()}/venues`);
    expect(VENUES()).toMatch(/\/api\/v1\/venues$/);
  });
});

describe("VENUE_BEERS", () => {
  it("builds the venue beers route from the venues collection and the venue id", () => {
    expect(VENUE_BEERS(12)).toBe(`${VENUES()}/12/beers`);
    expect(VENUE_BEERS(12)).toMatch(/\/api\/v1\/venues\/12\/beers$/);
  });
});

describe("VENUE_BEER_VOTES", () => {
  it("builds the votes route from the venue beers route, the venue id and the beer id", () => {
    expect(VENUE_BEER_VOTES(12, 7)).toBe(`${VENUE_BEERS(12)}/7/votes`);
    expect(VENUE_BEER_VOTES(12, 7)).toMatch(/\/api\/v1\/venues\/12\/beers\/7\/votes$/);
  });
});
