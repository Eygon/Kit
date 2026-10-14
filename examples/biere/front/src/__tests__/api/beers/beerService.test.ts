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
    expect(page.items[0]).toEqual({ ...beerDto, aromas: ["fruity"], formats: ["bottle"], bitternessLevel: null, colorLevel: null, styleColorRange: null, averageRating: null, reviewCount: 0, ratingDistribution: [], criteria: [], source: "official", createdByName: null });
    expect(page.items[1].family).toBeNull();
    expect(page.facets.families).toEqual([{ value: "trappist", count: 2 }]);
    expect(page.facets.countries).toEqual([{ value: "BE", count: 3 }]);
    expect(page.facets.formats).toEqual([{ value: "bottle", count: 3 }]);
  });

  it("returns isApproximate true when the API flags the page as approximate", async () => {
    mockFetch.mockImplementation(async () => json({ ...pageDto, isApproximate: true }));

    const page = await BeerService.getPage({ ...EMPTY_BEER_QUERY, search: "cantilon" }, 1, 20);

    expect(page.isApproximate).toBe(true);
  });

  it("returns isApproximate false for an exact page, flagged or not", async () => {
    mockFetch.mockImplementation(async () => json({ ...pageDto, isApproximate: false }));
    const flagged = await BeerService.getPage(EMPTY_BEER_QUERY, 1, 20);
    mockFetch.mockImplementation(async () => json(pageDto));
    const unflagged = await BeerService.getPage(EMPTY_BEER_QUERY, 1, 20);

    expect(flagged.isApproximate).toBe(false);
    expect(unflagged.isApproximate).toBe(false);
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
    expect(beer).toEqual({ ...beerDto, aromas: ["fruity"], formats: ["bottle"], bitternessLevel: null, colorLevel: null, styleColorRange: null, averageRating: null, reviewCount: 0, ratingDistribution: [], criteria: [], source: "official", createdByName: null });
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

const NEW_BEER = {
  name: "Orval",
  breweryName: "Brasserie d'Orval",
  country: "BE",
  styleId: 12,
  abv: 6.2,
  description: "Une trappiste.",
};

describe("BeerService.create", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(toast.danger).mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts exactly the contract fields of the new beer to /beers", async () => {
    mockFetch.mockImplementation(async () => json({ ...beerDto, id: 90 }, 201));

    await BeerService.create(NEW_BEER);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(BEERS());
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual(NEW_BEER);
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("returns the created beer as a model with no toast", async () => {
    mockFetch.mockImplementation(async () => json({ ...beerDto, id: 90, name: "<b>gras</b>" }, 201));

    const beer = await BeerService.create(NEW_BEER);

    expect(beer).toEqual({
      ...beerDto,
      id: 90,
      name: "<b>gras</b>",
      aromas: ["fruity"],
      formats: ["bottle"],
      bitternessLevel: null,
      colorLevel: null,
      styleColorRange: null,
      averageRating: null,
      reviewCount: 0,
      ratingDistribution: [],
      criteria: [],
      source: "official",
      createdByName: null,
    });
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("on a 409 shows one toast with the already existing text and rethrows the HttpError", async () => {
    mockFetch.mockImplementation(async () => json({ message: "duplicate" }, 409));

    const failure = await BeerService.create(NEW_BEER).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(HttpError);
    expect((failure as HttpError).status).toBe(409);
    expect(toast.danger).toHaveBeenCalledTimes(1);
    expect(toast.danger).toHaveBeenCalledWith("Cette bière existe déjà");
  });

  it("on a 429 shows one toast with the daily limit text and rethrows the HttpError", async () => {
    mockFetch.mockImplementation(async () => json({ message: "too many" }, 429));

    const failure = await BeerService.create(NEW_BEER).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(HttpError);
    expect((failure as HttpError).status).toBe(429);
    expect(toast.danger).toHaveBeenCalledTimes(1);
    expect(toast.danger).toHaveBeenCalledWith("Limite atteinte : 10 propositions par jour.");
  });

  it.each([
    [400, "La demande est invalide."],
    [401, "Vous devez être identifié."],
    [404, "La ressource demandée est introuvable."],
    [500, "Une erreur est survenue. Réessayez."],
  ])("on status %s shows one toast with %s and rethrows", async (status, text) => {
    mockFetch.mockImplementation(async () => json({ message: "boom" }, status));

    const failure = await BeerService.create(NEW_BEER).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(HttpError);
    expect((failure as HttpError).status).toBe(status);
    expect(toast.danger).toHaveBeenCalledTimes(1);
    expect(toast.danger).toHaveBeenCalledWith(text);
  });

  it("on a network failure shows one generic toast and rethrows the original error", async () => {
    const networkError = new TypeError("Failed to fetch");
    mockFetch.mockRejectedValue(networkError);

    await expect(BeerService.create(NEW_BEER)).rejects.toBe(networkError);
    expect(toast.danger).toHaveBeenCalledTimes(1);
    expect(toast.danger).toHaveBeenCalledWith("Une erreur est survenue. Réessayez.");
  });

  it("treats an answer without a body as a failure: one generic toast and a rethrow", async () => {
    mockFetch.mockImplementation(async () => new Response(null, { status: 204 }));

    await expect(BeerService.create(NEW_BEER)).rejects.toBeInstanceOf(Error);
    expect(toast.danger).toHaveBeenCalledTimes(1);
    expect(toast.danger).toHaveBeenCalledWith("Une erreur est survenue. Réessayez.");
  });
});
