import {
  API_V1,
  BEERS,
  BEER_BY_ID,
  BEER_STYLES,
  ME_BADGES,
  ME_DEX,
  ME_STATS,
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

describe("ME_BADGES", () => {
  it("builds the badges route of the current user from the api root", () => {
    expect(ME_BADGES()).toBe(`${API_V1()}/me/badges`);
    expect(ME_BADGES()).toMatch(/\/api\/v1\/me\/badges$/);
  });
});

describe("ME_STATS", () => {
  it("builds the stats route of the current user from the api root", () => {
    expect(ME_STATS()).toBe(`${API_V1()}/me/stats`);
    expect(ME_STATS()).toMatch(/\/api\/v1\/me\/stats$/);
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
