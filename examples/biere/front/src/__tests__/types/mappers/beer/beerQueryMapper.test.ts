import { EMPTY_BEER_QUERY, beerQueryToSearchParams, isEmptyBeerQuery, searchParamsToBeerQuery } from "@/types/mappers/beer/beerQueryMapper";
import { BeerSortEnum } from "@/types/enums/beer/beerSortEnum";
import { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";
import { BeerFormatEnum } from "@/types/enums/beer/beerFormatEnum";
import { BeerStatusEnum } from "@/types/enums/beer/beerStatusEnum";

describe("EMPTY_BEER_QUERY", () => {
  it("holds no filter and the default sort", () => {
    expect(EMPTY_BEER_QUERY).toEqual({
      search: "",
      family: null,
      styleIds: [],
      countries: [],
      formats: [],
      abvMin: null,
      abvMax: null,
      status: null,
      minRating: null,
      sort: BeerSortEnum.NAME,
    });
  });
});

describe("beerQueryToSearchParams", () => {
  it("sends exactly the contract parameters for page 2 of a fully filtered query", () => {
    const params = beerQueryToSearchParams(
      {
        search: "ipa",
        family: BeerFamilyEnum.IPA,
        styleIds: [3, 7],
        countries: ["BE", "DE"],
        formats: [BeerFormatEnum.BOTTLE, BeerFormatEnum.CAN],
        abvMin: 4.5,
        abvMax: 8,
        status: BeerStatusEnum.WISHLIST,
        minRating: 3.5,
        sort: BeerSortEnum.ABV,
      },
      2,
      20,
    );

    expect(params.toString()).toBe(
      "q=ipa&family=ipa&style=3&style=7&country=BE&country=DE&format=bottle&format=can&abvMin=4.5&abvMax=8&status=wishlist&minRating=3.5&sort=abv&page=2&size=20",
    );
    expect(params.getAll("style")).toEqual(["3", "7"]);
    expect(params.getAll("country")).toEqual(["BE", "DE"]);
    expect(params.getAll("format")).toEqual(["bottle", "can"]);
  });

  it("sends no parameter at all for the empty query without page nor size", () => {
    expect(beerQueryToSearchParams(EMPTY_BEER_QUERY).toString()).toBe("");
  });

  it("sends only page and size for the empty query", () => {
    expect(beerQueryToSearchParams(EMPTY_BEER_QUERY, 1, 20).toString()).toBe("page=1&size=20");
  });

  it("omits a blank or whitespace-only search and trims a padded one", () => {
    expect(beerQueryToSearchParams({ ...EMPTY_BEER_QUERY, search: "   " }).has("q")).toBe(false);
    expect(beerQueryToSearchParams({ ...EMPTY_BEER_QUERY, search: "  orval " }).get("q")).toBe("orval");
  });

  it("omits the default sort and sends the other ones", () => {
    expect(beerQueryToSearchParams({ ...EMPTY_BEER_QUERY, sort: BeerSortEnum.NAME }).has("sort")).toBe(false);
    expect(beerQueryToSearchParams({ ...EMPTY_BEER_QUERY, sort: BeerSortEnum.BREWERY }).get("sort")).toBe("brewery");
  });

  it("sends a zero degree bound but omits a null one", () => {
    const zeroMin = beerQueryToSearchParams({ ...EMPTY_BEER_QUERY, abvMin: 0 });
    expect(zeroMin.get("abvMin")).toBe("0");
    expect(zeroMin.has("abvMax")).toBe(false);

    const onlyMax = beerQueryToSearchParams({ ...EMPTY_BEER_QUERY, abvMax: 14 });
    expect(onlyMax.has("abvMin")).toBe(false);
    expect(onlyMax.get("abvMax")).toBe("14");
  });

  it("AC4 writes the status once and omits a null one", () => {
    expect(beerQueryToSearchParams({ ...EMPTY_BEER_QUERY, status: BeerStatusEnum.DRUNK }).getAll("status")).toEqual(["drunk"]);
    expect(beerQueryToSearchParams({ ...EMPTY_BEER_QUERY, status: BeerStatusEnum.UNTASTED }).toString()).toBe("status=untasted");
    expect(beerQueryToSearchParams({ ...EMPTY_BEER_QUERY, status: null }).has("status")).toBe(false);
  });

  it("AC1 writes the minimum rating once and omits a null one", () => {
    expect(beerQueryToSearchParams({ ...EMPTY_BEER_QUERY, minRating: 4 }).toString()).toBe("minRating=4");
    expect(beerQueryToSearchParams({ ...EMPTY_BEER_QUERY, minRating: 3.5 }).getAll("minRating")).toEqual(["3.5"]);
    expect(beerQueryToSearchParams({ ...EMPTY_BEER_QUERY, minRating: null }).has("minRating")).toBe(false);
  });

  it("AC2 writes the rating sort", () => {
    expect(beerQueryToSearchParams({ ...EMPTY_BEER_QUERY, sort: BeerSortEnum.RATING }).toString()).toBe("sort=rating");
  });

  it("omits empty lists and a null family", () => {
    const params = beerQueryToSearchParams({ ...EMPTY_BEER_QUERY, search: "x" }, 3, 50);

    expect([...params.keys()]).toEqual(["q", "page", "size"]);
  });

  it("encodes percent, underscore and backslash of the search so the server receives them literally", () => {
    const params = beerQueryToSearchParams({ ...EMPTY_BEER_QUERY, search: "100%_a\\b" });

    expect(params.toString()).toBe("q=100%25_a%5Cb");
    expect(params.get("q")).toBe("100%_a\\b");
  });
});

describe("searchParamsToBeerQuery", () => {
  const parse = (search: string) => searchParamsToBeerQuery(new URLSearchParams(search));

  it("gives the empty query for no parameter", () => {
    expect(parse("")).toEqual(EMPTY_BEER_QUERY);
  });

  it("reads every filter", () => {
    expect(
      parse("q=ipa&family=ipa&style=3&style=7&country=BE&country=DE&format=bottle&format=can&abvMin=4.5&abvMax=8&sort=abv"),
    ).toEqual({
      search: "ipa",
      family: BeerFamilyEnum.IPA,
      styleIds: [3, 7],
      countries: ["BE", "DE"],
      formats: [BeerFormatEnum.BOTTLE, BeerFormatEnum.CAN],
      abvMin: 4.5,
      abvMax: 8,
      status: null,
      minRating: null,
      sort: BeerSortEnum.ABV,
    });
  });

  it("AC4 reads each of the three statuses", () => {
    expect(parse("status=drunk")).toEqual({ ...EMPTY_BEER_QUERY, status: BeerStatusEnum.DRUNK });
    expect(parse("status=wishlist")).toEqual({ ...EMPTY_BEER_QUERY, status: BeerStatusEnum.WISHLIST });
    expect(parse("status=untasted&q=x")).toEqual({ ...EMPTY_BEER_QUERY, search: "x", status: BeerStatusEnum.UNTASTED });
  });

  it("AC5 ignores an unknown status and keeps the other parameters", () => {
    expect(parse("status=bogus")).toEqual(EMPTY_BEER_QUERY);
    expect(parse("status=DRUNK&q=ipa")).toEqual({ ...EMPTY_BEER_QUERY, search: "ipa" });
    expect(parse("status=")).toEqual(EMPTY_BEER_QUERY);
    expect(parse("status=all")).toEqual(EMPTY_BEER_QUERY);
  });

  it("AC1 reads each minimum rating option", () => {
    expect(parse("minRating=3")).toEqual({ ...EMPTY_BEER_QUERY, minRating: 3 });
    expect(parse("minRating=3.5&q=x")).toEqual({ ...EMPTY_BEER_QUERY, search: "x", minRating: 3.5 });
    expect(parse("minRating=4")).toEqual({ ...EMPTY_BEER_QUERY, minRating: 4 });
    expect(parse("minRating=4.5")).toEqual({ ...EMPTY_BEER_QUERY, minRating: 4.5 });
  });

  it("AC3 ignores a minimum rating that is not one of the options and keeps the other parameters", () => {
    expect(parse("minRating=7")).toEqual(EMPTY_BEER_QUERY);
    expect(parse("minRating=3.3&q=ipa")).toEqual({ ...EMPTY_BEER_QUERY, search: "ipa" });
    expect(parse("minRating=abc")).toEqual(EMPTY_BEER_QUERY);
    expect(parse("minRating=")).toEqual(EMPTY_BEER_QUERY);
    expect(parse("minRating=0")).toEqual(EMPTY_BEER_QUERY);
    expect(parse("minRating=5")).toEqual(EMPTY_BEER_QUERY);
  });

  it("AC2 reads the rating sort", () => {
    expect(parse("sort=rating")).toEqual({ ...EMPTY_BEER_QUERY, sort: BeerSortEnum.RATING });
  });

  it("round-trips a fully filtered query through beerQueryToSearchParams", () => {
    const query = {
      search: "orval",
      family: BeerFamilyEnum.TRAPPIST,
      styleIds: [2],
      countries: ["BE"],
      formats: [BeerFormatEnum.DRAFT],
      abvMin: 0,
      abvMax: 14,
      status: BeerStatusEnum.UNTASTED,
      minRating: 4.5,
      sort: BeerSortEnum.BREWERY,
    };

    expect(searchParamsToBeerQuery(beerQueryToSearchParams(query))).toEqual(query);
  });

  it("ignores an unknown family, format and sort", () => {
    expect(parse("family=lagerx&format=keg&format=can&sort=price")).toEqual({
      ...EMPTY_BEER_QUERY,
      formats: [BeerFormatEnum.CAN],
    });
  });

  it("keeps only the style ids that are integers above zero", () => {
    expect(parse("style=0&style=-2&style=1.5&style=abc&style=&style=12&style=1e1")).toEqual({
      ...EMPTY_BEER_QUERY,
      styleIds: [12],
    });
  });

  it("keeps only the two upper case letter country codes", () => {
    expect(parse("country=BE&country=be&country=BEL&country=B&country=&country=D3&country=FR")).toEqual({
      ...EMPTY_BEER_QUERY,
      countries: ["BE", "FR"],
    });
  });

  it("keeps the degrees from 0 to 14 included and ignores the others", () => {
    expect(parse("abvMin=0&abvMax=14")).toEqual({ ...EMPTY_BEER_QUERY, abvMin: 0, abvMax: 14 });
    expect(parse("abvMin=-1&abvMax=14.1")).toEqual(EMPTY_BEER_QUERY);
    expect(parse("abvMin=abc&abvMax=")).toEqual(EMPTY_BEER_QUERY);
    expect(parse("abvMin=1e1&abvMax=%205")).toEqual(EMPTY_BEER_QUERY);
  });

  it("ignores both degrees when the minimum is above the maximum", () => {
    expect(parse("abvMin=9&abvMax=5&q=x")).toEqual({ ...EMPTY_BEER_QUERY, search: "x" });
  });

  it("keeps equal degrees and a lone degree", () => {
    expect(parse("abvMin=5&abvMax=5")).toEqual({ ...EMPTY_BEER_QUERY, abvMin: 5, abvMax: 5 });
    expect(parse("abvMin=7")).toEqual({ ...EMPTY_BEER_QUERY, abvMin: 7 });
  });
});

describe("isEmptyBeerQuery", () => {
  it("is true for the empty query and for a sort only", () => {
    expect(isEmptyBeerQuery(EMPTY_BEER_QUERY)).toBe(true);
    expect(isEmptyBeerQuery({ ...EMPTY_BEER_QUERY, sort: BeerSortEnum.ABV })).toBe(true);
  });

  it("is true for a blank search", () => {
    expect(isEmptyBeerQuery({ ...EMPTY_BEER_QUERY, search: "   " })).toBe(true);
  });

  it.each([
    ["a search", { search: "orval" }],
    ["a family", { family: BeerFamilyEnum.STOUT }],
    ["a style", { styleIds: [1] }],
    ["a country", { countries: ["BE"] }],
    ["a format", { formats: [BeerFormatEnum.CAN] }],
    ["a minimum degree of zero", { abvMin: 0 }],
    ["a maximum degree", { abvMax: 8 }],
    ["a drunk status", { status: BeerStatusEnum.DRUNK }],
    ["a wishlist status", { status: BeerStatusEnum.WISHLIST }],
    ["an untasted status", { status: BeerStatusEnum.UNTASTED }],
    ["a minimum rating", { minRating: 3 }],
  ])("is false with %s", (_label, overrides) => {
    expect(isEmptyBeerQuery({ ...EMPTY_BEER_QUERY, ...overrides })).toBe(false);
  });
});
