import { renderHook } from "@testing-library/react";
import { useExistingBeerLoader } from "@/pages/encyclopedia/hooks/useExistingBeerLoader";
import { EMPTY_BEER_QUERY } from "@/types/mappers/beer/beerQueryMapper";
import type { Beer } from "@/types/models/beer/beer";
import type { BeerPage } from "@/types/models/beer/beerPage";
import { fetchBeerPage } from "@/utils/queryFunctions/beerQueryFunctions";

vi.mock("@/utils/queryFunctions/beerQueryFunctions", () => ({
  fetchBeerPage: vi.fn(),
}));

const buildBeer = (id: number, name: string, breweryName: string) => ({ id, name, breweryName }) as unknown as Beer;

const pageOf = (items: Beer[]) => ({ items, total: items.length, page: 1, size: 50, facets: { families: [], countries: [], formats: [] } }) as unknown as BeerPage;

const loadWith = (name: string, breweryName: string) => {
  const { result } = renderHook(() => useExistingBeerLoader());
  return result.current.loadExistingBeer(name, breweryName);
};

describe("useExistingBeerLoader", () => {
  beforeEach(() => {
    vi.mocked(fetchBeerPage).mockReset();
  });

  it("searches the catalog by the name on the first page of 50", async () => {
    vi.mocked(fetchBeerPage).mockResolvedValue(pageOf([]));

    await loadWith("Orval", "Brasserie d'Orval");

    expect(fetchBeerPage).toHaveBeenCalledTimes(1);
    expect(fetchBeerPage).toHaveBeenCalledWith({ ...EMPTY_BEER_QUERY, search: "Orval" }, 1, 50);
  });

  it("returns the beer whose name and brewery match without regard to case, accents and spaces", async () => {
    const match = buildBeer(2, "Orval", "Brasserie d'Orval");
    vi.mocked(fetchBeerPage).mockResolvedValue(pageOf([buildBeer(1, "Orval Extra", "Brasserie d'Orval"), match]));

    expect(await loadWith("  ÓRVAL ", " brasserie   D'ORVAL")).toBe(match);
  });

  it("returns null when the name matches but the brewery differs", async () => {
    vi.mocked(fetchBeerPage).mockResolvedValue(pageOf([buildBeer(1, "Orval", "Chimay")]));

    expect(await loadWith("Orval", "Brasserie d'Orval")).toBeNull();
  });

  it("returns null when the brewery matches but the name differs", async () => {
    vi.mocked(fetchBeerPage).mockResolvedValue(pageOf([buildBeer(1, "Orval Extra", "Brasserie d'Orval")]));

    expect(await loadWith("Orval", "Brasserie d'Orval")).toBeNull();
  });

  it("returns null for an empty result", async () => {
    vi.mocked(fetchBeerPage).mockResolvedValue(pageOf([]));

    expect(await loadWith("Orval", "Brasserie d'Orval")).toBeNull();
  });

  it("returns the first match when two beers match", async () => {
    const first = buildBeer(1, "Orval", "Brasserie d'Orval");
    vi.mocked(fetchBeerPage).mockResolvedValue(pageOf([first, buildBeer(2, "orval", "brasserie d'orval")]));

    expect(await loadWith("Orval", "Brasserie d'Orval")).toBe(first);
  });

  it("returns null on any error", async () => {
    vi.mocked(fetchBeerPage).mockRejectedValue(new Error("boom"));

    expect(await loadWith("Orval", "Brasserie d'Orval")).toBeNull();
  });
});
