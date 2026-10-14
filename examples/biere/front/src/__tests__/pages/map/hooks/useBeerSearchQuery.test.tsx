import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { createTestQueryClient } from "@/__tests__/utils/renderWithProviders";
import { useBeerSearchQuery } from "@/pages/map/hooks/useBeerSearchQuery";
import { EMPTY_BEER_QUERY } from "@/types/mappers/beer/beerQueryMapper";
import type { BeerPage } from "@/types/models/beer/beerPage";
import { fetchBeerPage } from "@/utils/queryFunctions/beerQueryFunctions";
import { beerKeys } from "@/utils/queryKeys/beerQueryKeys";

vi.mock("@/utils/queryFunctions/beerQueryFunctions", () => ({
  fetchBeerPage: vi.fn(),
}));

const PAGE = {
  items: [{ id: 7, name: "Orval" }],
  total: 1,
  page: 1,
  size: 10,
  facets: { families: [], countries: [], formats: [] },
} as unknown as BeerPage;

const wrapperFor = (client: QueryClient) => {
  const Wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

const render = (search: string, client: QueryClient = createTestQueryClient()) => {
  return renderHook(() => useBeerSearchQuery(search), { wrapper: wrapperFor(client) });
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

describe("useBeerSearchQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("searches the first page of the catalog with the term and nothing else", async () => {
    (fetchBeerPage as Mock).mockResolvedValue(PAGE);

    const { result } = render("orv");

    await waitFor(() => expect(result.current.beers).toEqual(PAGE.items));
    expect(fetchBeerPage).toHaveBeenCalledTimes(1);
    expect(fetchBeerPage).toHaveBeenCalledWith({ ...EMPTY_BEER_QUERY, search: "orv" }, 1, 10);
    expect(result.current.isError).toBe(false);
  });

  it.each(["", "o", " o ", "   "])("does not search for the term %j under two characters", async (term) => {
    const { result } = render(term);

    await settle();
    expect(fetchBeerPage).not.toHaveBeenCalled();
    expect(result.current.beers).toEqual([]);
    expect(result.current.isFetching).toBe(false);
  });

  it("searches from two characters and sends the trimmed term", async () => {
    (fetchBeerPage as Mock).mockResolvedValue(PAGE);

    render("  or  ");

    await waitFor(() => expect(fetchBeerPage).toHaveBeenCalledTimes(1));
    expect(fetchBeerPage).toHaveBeenCalledWith({ ...EMPTY_BEER_QUERY, search: "or" }, 1, 10);
  });

  it("flags the error and exposes no beer when the search rejects", async () => {
    (fetchBeerPage as Mock).mockRejectedValue(new Error("server down"));

    const { result } = render("orv");

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.beers).toEqual([]);
  });

  it("refetches the same term when refetch is called", async () => {
    (fetchBeerPage as Mock).mockResolvedValue(PAGE);
    const { result } = render("orv");
    await waitFor(() => expect(result.current.beers).toEqual(PAGE.items));

    await result.current.refetch();

    expect(fetchBeerPage).toHaveBeenCalledTimes(2);
  });

  it("does not write under the catalog or preview keys of the encyclopedia", async () => {
    (fetchBeerPage as Mock).mockResolvedValue(PAGE);
    const client = createTestQueryClient();
    const query = { ...EMPTY_BEER_QUERY, search: "orv" };

    const { result } = render("orv", client);
    await waitFor(() => expect(result.current.beers).toEqual(PAGE.items));

    expect(client.getQueryCache().findAll({ queryKey: beerKeys.catalog(query) })).toHaveLength(0);
    expect(client.getQueryCache().findAll({ queryKey: beerKeys.preview(query) })).toHaveLength(0);
    expect(client.getQueryCache().findAll({ queryKey: beerKeys.all() })).toHaveLength(1);
  });
});
