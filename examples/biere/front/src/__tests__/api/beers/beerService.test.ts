import { toast } from "@heroui/react";
import { EMPTY_BEER_QUERY } from "@/types/mappers/beer/beerQueryMapper";
import { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";
import { BeerFormatEnum } from "@/types/enums/beer/beerFormatEnum";
import { BeerSortEnum } from "@/types/enums/beer/beerSortEnum";
import BeerService from "@/api/beers/beerService";
import { BEERS, BEER_BY_ID } from "@/utils/apiURL/apiURL";
import { HttpStatusCodeEnum } from "@/types/enums/http/httpStatusCodeEnum";
import { HttpError } from "@/api/httpError";


vi.mock("@heroui/react", () => ({
  toast: { danger: vi.fn() },
}));

const mockFetch = vi.fn();

const beerDto = {
  id: 7,
  name: "Orval",
  breweryName: "Brasserie d'Orval",
  country: "BE",
  styleId: 12,
  styleName: "Trappiste",
  family: "trappist",
  abv: 6.2,
  aromas: ["fruity", "bubblegum"],
  formats: ["bottle", "keg"],
  description: "Une trappiste.",
  drunk: true,
  checkinCount: 2,
  inWishlist: false,
};

const pageDto = {
  items: [beerDto, { ...beerDto, id: 8, family: "mead" }],
  total: 45,
  page: 2,
  size: 20,
  facets: {
    families: [
      { value: "trappist", count: 2 },
      { value: "mead", count: 1 },
    ],
    countries: [{ value: "BE", count: 3 }],
    formats: [{ value: "bottle", count: 3 }],
  },
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

const filteredQuery = () => {
  return {
    ...EMPTY_BEER_QUERY,
    search: "ipa",
    family: BeerFamilyEnum.IPA,
    styleIds: [3, 7],
    countries: ["BE", "DE"],
    formats: [BeerFormatEnum.BOTTLE, BeerFormatEnum.CAN],
    abvMin: 4.5,
    abvMax: 8,
    sort: BeerSortEnum.ABV,
  };
};

describe("BeerService.getPage", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(toast.danger).mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests page 2 with exactly the contract parameters", async () => {
    mockFetch.mockImplementation(async () => json(pageDto));

    await BeerService.getPage(filteredQuery(), 2, 20);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      `${BEERS()}?q=ipa&family=ipa&style=3&style=7&country=BE&country=DE&format=bottle&format=can&abvMin=4.5&abvMax=8&sort=abv&page=2&size=20`,
    );
    expect(init.method).toBe("GET");
  });

  it("sends neither empty nor absent parameter for an unfiltered query", async () => {
    mockFetch.mockImplementation(async () => json(pageDto));

    await BeerService.getPage(EMPTY_BEER_QUERY, 1, 20);

    expect(mockFetch.mock.calls[0][0]).toBe(`${BEERS()}?page=1&size=20`);
  });

  it("returns items, total and facets as models, dropping unknown values without crashing", async () => {
    mockFetch.mockImplementation(async () => json(pageDto));

    const page = await BeerService.getPage(EMPTY_BEER_QUERY, 2, 20);

    expect(page.total).toBe(45);
    expect(page.items).toHaveLength(2);
    expect(page.items[0]).toEqual({ ...beerDto, aromas: ["fruity"], formats: ["bottle"], bitternessLevel: null, colorLevel: null, styleColorRange: null, averageRating: null, reviewCount: 0, ratingDistribution: [], criteria: [] });
    expect(page.items[1].family).toBeNull();
    expect(page.facets.families).toEqual([{ value: "trappist", count: 2 }]);
    expect(page.facets.countries).toEqual([{ value: "BE", count: 3 }]);
    expect(page.facets.formats).toEqual([{ value: "bottle", count: 3 }]);
  });

  it.each([400, 401, 500])("rejects with the HttpError on status %s and shows no toast", async (status) => {
    mockFetch.mockImplementation(async () => json({ message: "boom" }, status));

    const failure = BeerService.getPage(EMPTY_BEER_QUERY, 1, 20);

    await expect(failure).rejects.toBeInstanceOf(HttpError);
    await expect(failure).rejects.toMatchObject({ status });
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("rejects on a network failure and shows no toast", async () => {
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(BeerService.getPage(EMPTY_BEER_QUERY, 1, 20)).rejects.toThrow("Failed to fetch");
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("rejects on an empty 204 answer instead of returning a page", async () => {
    mockFetch.mockImplementation(async () => new Response(null, { status: 204 }));

    await expect(BeerService.getPage(EMPTY_BEER_QUERY, 1, 20)).rejects.toMatchObject({ status: 204 });
  });
});

describe("BeerService.getById", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(toast.danger).mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests the beer by its id with a GET and returns it as a model without the unknown values", async () => {
    mockFetch.mockImplementation(async () => json(beerDto));

    const beer = await BeerService.getById(7);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(BEER_BY_ID(7));
    expect(url).toBe(`${BEERS()}/7`);
    expect(init.method).toBe("GET");
    expect(beer).toEqual({ ...beerDto, aromas: ["fruity"], formats: ["bottle"], bitternessLevel: null, colorLevel: null, styleColorRange: null, averageRating: null, reviewCount: 0, ratingDistribution: [], criteria: [] });
  });

  it("returns null on a 404 and shows no toast", async () => {
    mockFetch.mockImplementation(async () => json({ message: "Beer 99 not found." }, HttpStatusCodeEnum.NOT_FOUND));

    await expect(BeerService.getById(99)).resolves.toBeNull();
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it.each([400, 401, 500])("rethrows the HttpError on status %s and shows no toast", async (status) => {
    mockFetch.mockImplementation(async () => json({ message: "boom" }, status));

    const failure = BeerService.getById(7);

    await expect(failure).rejects.toBeInstanceOf(HttpError);
    await expect(failure).rejects.toMatchObject({ status });
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("rethrows a network failure and shows no toast", async () => {
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(BeerService.getById(7)).rejects.toThrow("Failed to fetch");
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("rejects on an empty 204 answer instead of returning a beer", async () => {
    mockFetch.mockImplementation(async () => new Response(null, { status: 204 }));

    await expect(BeerService.getById(7)).rejects.toMatchObject({ status: 204 });
  });
});
