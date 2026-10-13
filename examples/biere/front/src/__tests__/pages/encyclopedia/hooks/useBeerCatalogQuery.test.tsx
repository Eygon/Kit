import type { QueryClient, QueryObserverOptions } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { createTestQueryClient } from "@/__tests__/utils/renderWithProviders";
import BeerService from "@/api/beers/beerService";
import { useBeerCatalogQuery } from "@/pages/encyclopedia/hooks/useBeerCatalogQuery";
import { queryTimes } from "@/config/tanstackQuery";
import { BEER_PAGE_SIZE } from "@/pages/encyclopedia/utils/encyclopediaConstants";
import { EMPTY_BEER_QUERY } from "@/types/mappers/beer/beerQueryMapper";
import { beerKeys } from "@/utils/queryKeys/beerQueryKeys";


vi.mock("@/api/beers/beerService", () => ({
  default: { getPage: vi.fn() },
}));

const TOTAL = 45;
const FACETS = {
  families: [{ value: "ipa", count: 45 }],
  countries: [{ value: "BE", count: 45 }],
  formats: [{ value: "bottle", count: 45 }],
};

const beersOfPage = (page: number, size: number) =>
  Array.from({ length: Math.max(0, Math.min(size, TOTAL - (page - 1) * size)) }, (_, index) => ({
    id: (page - 1) * size + index + 1,
    name: `Beer ${(page - 1) * size + index + 1}`,
  }));

const stubPages = (service: { getPage: unknown }) => {
  (service.getPage as Mock).mockImplementation(async (_query: unknown, page: number, size: number) => ({
    items: beersOfPage(page, size),
    total: TOTAL,
    page,
    size,
    facets: FACETS,
  }));
};

const wrapperFor = (client: QueryClient) => {
  const Wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

describe("useBeerCatalogQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts pending with no beer, then exposes the first page, the total and the facets", async () => {
    stubPages(BeerService);

    const { result } = renderHook(() => useBeerCatalogQuery(EMPTY_BEER_QUERY), {
      wrapper: wrapperFor(createTestQueryClient()),
    });

    expect(result.current.isPending).toBe(true);
    expect(result.current.beers).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.facets).toBeNull();
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(BEER_PAGE_SIZE).toBe(20);
    expect(BeerService.getPage).toHaveBeenCalledWith(EMPTY_BEER_QUERY, 1, BEER_PAGE_SIZE);
    expect(result.current.beers).toHaveLength(20);
    expect(result.current.total).toBe(TOTAL);
    expect(result.current.facets).toEqual(FACETS);
    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.isError).toBe(false);
  });

  it("loads 20, then 40, then 45 beers and offers no further page", async () => {
    stubPages(BeerService);

    const { result } = renderHook(() => useBeerCatalogQuery(EMPTY_BEER_QUERY), {
      wrapper: wrapperFor(createTestQueryClient()),
    });
    await waitFor(() => expect(result.current.beers).toHaveLength(20));

    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.beers).toHaveLength(40));
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.beers).toHaveLength(45));
    expect(result.current.hasNextPage).toBe(false);
    expect(result.current.isFetchingNextPage).toBe(false);
    expect(result.current.beers.map((beer: { id: number }) => beer.id)).toEqual(Array.from({ length: 45 }, (_, index) => index + 1));
    expect(
      (BeerService.getPage as Mock).mock.calls.map((call: unknown[]) => [call[1], call[2]]),
    ).toEqual([
      [1, 20],
      [2, 20],
      [3, 20],
    ]);
  });

  it("offers no next page when everything fits in the first page", async () => {
    (BeerService.getPage as Mock).mockResolvedValue({
      items: beersOfPage(1, 3),
      total: 3,
      page: 1,
      size: 20,
      facets: FACETS,
    });

    const { result } = renderHook(() => useBeerCatalogQuery(EMPTY_BEER_QUERY), {
      wrapper: wrapperFor(createTestQueryClient()),
    });

    await waitFor(() => expect(result.current.beers).toHaveLength(3));
    expect(result.current.hasNextPage).toBe(false);
  });

  it("offers no next page when a page beyond the last comes back empty with the total unchanged", async () => {
    (BeerService.getPage as Mock).mockResolvedValue({ items: [], total: TOTAL, page: 4, size: 20, facets: FACETS });

    const { result } = renderHook(() => useBeerCatalogQuery(EMPTY_BEER_QUERY), {
      wrapper: wrapperFor(createTestQueryClient()),
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.beers).toEqual([]);
    expect(result.current.total).toBe(TOTAL);
    expect(result.current.hasNextPage).toBe(false);
  });

  it("reports an empty catalog without error", async () => {
    (BeerService.getPage as Mock).mockResolvedValue({ items: [], total: 0, page: 1, size: 20, facets: FACETS });

    const { result } = renderHook(() => useBeerCatalogQuery(EMPTY_BEER_QUERY), {
      wrapper: wrapperFor(createTestQueryClient()),
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.beers).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.hasNextPage).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it("flags the error when the page request fails and recovers on refetch", async () => {
    (BeerService.getPage as Mock).mockRejectedValue(new Error("server down"));

    const { result } = renderHook(() => useBeerCatalogQuery(EMPTY_BEER_QUERY), {
      wrapper: wrapperFor(createTestQueryClient()),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.beers).toEqual([]);
    expect(result.current.facets).toBeNull();

    stubPages(BeerService);
    await act(async () => {
      await result.current.refetch();
    });
    await waitFor(() => expect(result.current.isError).toBe(false));
    expect(result.current.beers).toHaveLength(20);
  });

  it("caches the catalog under beerKeys.catalog(query) and refetches for another query", async () => {
    stubPages(BeerService);
    const client = createTestQueryClient();

    const { result, rerender } = renderHook(({ query }) => useBeerCatalogQuery(query), {
      wrapper: wrapperFor(client),
      initialProps: { query: EMPTY_BEER_QUERY },
    });
    await waitFor(() => expect(result.current.beers).toHaveLength(20));
    expect(client.getQueryData(beerKeys.catalog(EMPTY_BEER_QUERY))).toBeDefined();

    const searched = { ...EMPTY_BEER_QUERY, search: "ipa" };
    rerender({ query: searched });
    await waitFor(() => expect(BeerService.getPage).toHaveBeenCalledWith(searched, 1, 20));
    expect(client.getQueryData(beerKeys.catalog(searched))).toBeDefined();
  });

  it("keeps the long stale and gc times on the cached catalog query", async () => {
    stubPages(BeerService);
    const client = createTestQueryClient();

    const { result } = renderHook(() => useBeerCatalogQuery(EMPTY_BEER_QUERY), {
      wrapper: wrapperFor(client),
    });
    await waitFor(() => expect(result.current.beers).toHaveLength(20));

    const cachedQuery = client.getQueryCache().find({ queryKey: beerKeys.catalog(EMPTY_BEER_QUERY) });
    const options = cachedQuery?.options as QueryObserverOptions | undefined;
    expect(options).toBeDefined();
    expect(options?.staleTime).toBe(queryTimes.long.staleTime);
    expect(options?.gcTime).toBe(queryTimes.long.gcTime);
  });

  it("restarts from the first page of the new filter when the query changes while the second page is loading", async () => {
    const FILTERED_ID_OFFSET = 1000;
    let releaseStalePage: () => void = () => undefined;
    const stalePageGate = new Promise<void>((resolve) => {
      releaseStalePage = resolve;
    });
    (BeerService.getPage as Mock).mockImplementation(
      async (query: { search: string }, page: number, size: number) => {
        if (query.search === "" && page === 2) await stalePageGate;
        const offset = query.search === "" ? 0 : FILTERED_ID_OFFSET;
        return {
          items: beersOfPage(page, size).map((beer) => ({ ...beer, id: beer.id + offset })),
          total: TOTAL,
          page,
          size,
          facets: FACETS,
        };
      },
    );
    const client = createTestQueryClient();

    const { result, rerender } = renderHook(({ query }) => useBeerCatalogQuery(query), {
      wrapper: wrapperFor(client),
      initialProps: { query: EMPTY_BEER_QUERY },
    });
    await waitFor(() => expect(result.current.beers).toHaveLength(20));

    act(() => {
      void result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.isFetchingNextPage).toBe(true));

    const searched = { ...EMPTY_BEER_QUERY, search: "ipa" };
    rerender({ query: searched });

    const expectedIds = Array.from({ length: 20 }, (_, index) => FILTERED_ID_OFFSET + index + 1);
    await waitFor(() => {
      expect(result.current.beers).toHaveLength(20);
      expect(result.current.beers.map((beer: { id: number }) => beer.id)).toEqual(expectedIds);
    });

    await act(async () => {
      releaseStalePage();
    });
    expect(result.current.beers.map((beer: { id: number }) => beer.id)).toEqual(expectedIds);
  });
});
