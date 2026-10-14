import { RoutePathEnum, buildBeerDetailPath, buildMapPathForBeer, parseBeerIdParam } from "@/types/enums/routing/routePathEnum";

describe("RoutePathEnum", () => {
  it("keeps the public url segments", () => {
    expect(Object.values(RoutePathEnum)).toEqual(["/", "/carte", "/journal", "/profil", "/bieres/:beerId"]);
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
