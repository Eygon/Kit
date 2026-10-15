import { RoutePathEnum, buildBeerDetailPath, buildMapPathForBeer, buildMapPathForVenue, buildUserProfilePath, parseBeerIdParam, parseVenueIdParam } from "@/types/enums/routing/routePathEnum";

describe("RoutePathEnum", () => {
  it("keeps the public url segments", () => {
    expect(Object.values(RoutePathEnum)).toEqual(["/", "/bieres", "/carte", "/journal", "/profil", "/profils", "/profils/:userId", "/bieres/:beerId", "/profils/:userId/collections/:collectionId", "/profils/:userId/wishlist", "/votes"]);
  });

  it("exposes the beer detail pattern", () => {
    expect(RoutePathEnum.BEER_DETAIL).toBe("/bieres/:beerId");
  });
});

describe("buildBeerDetailPath", () => {
  it("fills the beer id in the pattern", () => {
    expect(buildBeerDetailPath(12)).toBe("/bieres/12");
  });
});

describe("buildUserProfilePath", () => {
  it("fills the user id in the pattern", () => {
    expect(buildUserProfilePath(3)).toBe("/profils/3");
    expect(RoutePathEnum.USER_PROFILE).toBe("/profils/:userId");
  });
});

describe("parseBeerIdParam", () => {
  it("reads a positive integer", () => {
    expect(parseBeerIdParam("12")).toBe(12);
    expect(parseBeerIdParam("1")).toBe(1);
  });

  it.each([undefined, "", "0", "-1", "1.5", "abc", "12abc", " 12", "1e3"])("rejects %s", (value) => {
    expect(parseBeerIdParam(value)).toBeNull();
  });
});

describe("buildMapPathForBeer", () => {
  it("points the map at the beer through the beer query parameter", () => {
    expect(buildMapPathForBeer(12)).toBe("/carte?beer=12");
    expect(buildMapPathForBeer(1)).toBe(`${RoutePathEnum.MAP}?beer=1`);
  });
});

describe("buildMapPathForVenue", () => {
  it("points the map at the venue through the venue query parameter", () => {
    expect(buildMapPathForVenue(42)).toBe("/carte?venue=42");
    expect(buildMapPathForVenue(1)).toBe(`${RoutePathEnum.MAP}?venue=1`);
  });

  it("is read back by parseVenueIdParam", () => {
    const params = new URLSearchParams(buildMapPathForVenue(42).split("?")[1]);

    expect(parseVenueIdParam(params.get("venue"))).toBe(42);
  });
});

describe("parseVenueIdParam", () => {
  it("reads a positive integer", () => {
    expect(parseVenueIdParam("12")).toBe(12);
    expect(parseVenueIdParam("1")).toBe(1);
  });

  it.each([null, "", "0", "-1", "1.5", "abc", "12abc", " 12", "1e3"])("rejects %s", (value) => {
    expect(parseVenueIdParam(value)).toBeNull();
  });

  it("adds no route and no tab: the member list is unchanged", () => {
    expect(Object.values(RoutePathEnum)).toHaveLength(11);
  });
});
