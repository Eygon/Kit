import type { Mock } from "vitest";
import BeerService from "@/api/beers/beerService";
import { createBeer, fetchBeer, fetchBeerPage } from "@/utils/queryFunctions/beerQueryFunctions";
import { EMPTY_BEER_QUERY } from "@/types/mappers/beer/beerQueryMapper";


vi.mock("@/api/beers/beerService", () => ({
  default: { getPage: vi.fn(), getById: vi.fn(), create: vi.fn() },
}));

describe("fetchBeerPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates to BeerService.getPage with the query, page and size and returns its page", async () => {
    const page = { items: [], total: 0, page: 3, size: 20, facets: { families: [], countries: [], formats: [] } };
    (BeerService.getPage as Mock).mockResolvedValue(page);

    const result = await fetchBeerPage({ ...EMPTY_BEER_QUERY, search: "ipa" }, 3, 20);

    expect(BeerService.getPage).toHaveBeenCalledTimes(1);
    expect(BeerService.getPage).toHaveBeenCalledWith({ ...EMPTY_BEER_QUERY, search: "ipa" }, 3, 20);
    expect(result).toBe(page);
  });

  it("lets the service rejection through", async () => {
    (BeerService.getPage as Mock).mockRejectedValue(new Error("down"));

    await expect(fetchBeerPage(EMPTY_BEER_QUERY, 1, 20)).rejects.toThrow("down");
  });
});

describe("fetchBeer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates to BeerService.getById with the id and returns its beer", async () => {
    const beer = { id: 7, name: "Orval" };
    (BeerService.getById as Mock).mockResolvedValue(beer);

    const result = await fetchBeer(7);

    expect(BeerService.getById).toHaveBeenCalledTimes(1);
    expect(BeerService.getById).toHaveBeenCalledWith(7);
    expect(result).toBe(beer);
  });

  it("returns null for an unknown beer", async () => {
    (BeerService.getById as Mock).mockResolvedValue(null);

    await expect(fetchBeer(99)).resolves.toBeNull();
  });

  it("lets the service rejection through", async () => {
    (BeerService.getById as Mock).mockRejectedValue(new Error("down"));

    await expect(fetchBeer(7)).rejects.toThrow("down");
  });
});

const NEW_BEER_STUB = { name: "Orval", breweryName: "Brasserie", country: "BE", styleId: 12, abv: 6.2, description: "" };

describe("createBeer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates to BeerService.create with the new beer and returns the created beer", async () => {
    const newBeer = { name: "Orval", breweryName: "Brasserie d'Orval", country: "BE", styleId: 12, abv: 6.2, description: "" };
    const created = { id: 90, name: "Orval" };
    (BeerService.create as Mock).mockResolvedValue(created);

    const result = await createBeer(newBeer);

    expect(BeerService.create).toHaveBeenCalledTimes(1);
    expect(BeerService.create).toHaveBeenCalledWith(newBeer);
    expect(result).toBe(created);
  });

  it("lets the service rejection through", async () => {
    (BeerService.create as Mock).mockRejectedValue(new Error("down"));

    await expect(createBeer(NEW_BEER_STUB)).rejects.toThrow("down");
  });
});
