import type { QueryClient, QueryObserverOptions } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { createTestQueryClient } from "@/__tests__/utils/renderWithProviders";
import BeerService from "@/api/beers/beerService";
import { queryTimes } from "@/config/tanstackQuery";
import { useBeerPreviewQuery } from "@/pages/encyclopedia/hooks/useBeerPreviewQuery";
import { BEER_PREVIEW_SIZE } from "@/pages/encyclopedia/utils/encyclopediaConstants";
import { EMPTY_BEER_QUERY } from "@/types/mappers/beer/beerQueryMapper";
import { beerKeys } from "@/utils/queryKeys/beerQueryKeys";

vi.mock("@/api/beers/beerService", () => ({
  default: { getPage: vi.fn() },
}));

const FACETS = {
  families: [{ value: "ipa", count: 49 }],
  countries: [{ value: "BE", count: 49 }],
  formats: [{ value: "bottle", count: 30 }],
};

const BELGIUM_QUERY = { ...EMPTY_BEER_QUERY, countries: ["BE"] };

const stubTotals = () => {
  (BeerService.getPage as Mock).mockImplementation(async (query: { countries: string[] }, page: number, size: number) => ({
    items: [],
    total: query.countries.length > 0 ? 49 : 120,
    page,
    size,
    facets: FACETS,
    isApproximate: false,
  }));
};

const wrapperFor = (client: QueryClient) => {
  const Wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

describe("useBeerPreviewQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("asks for the first page of a single beer and exposes the total and the facets", async () => {
    stubTotals();

    const { result } = renderHook(() => useBeerPreviewQuery(BELGIUM_QUERY, true), {
      wrapper: wrapperFor(createTestQueryClient()),
    });

    expect(result.current.total).toBeNull();
    expect(result.current.facets).toBeNull();
    await waitFor(() => expect(result.current.total).toBe(49));
    expect(BEER_PREVIEW_SIZE).toBe(1);
    expect(BeerService.getPage).toHaveBeenCalledTimes(1);
    expect(BeerService.getPage).toHaveBeenCalledWith(BELGIUM_QUERY, 1, BEER_PREVIEW_SIZE);
    expect(result.current.facets).toEqual(FACETS);
    expect(result.current.isError).toBe(false);
    expect(result.current.isFetching).toBe(false);
  });

  it("sends no request while it is disabled", async () => {
    stubTotals();

    const { result } = renderHook(() => useBeerPreviewQuery(BELGIUM_QUERY, false), {
      wrapper: wrapperFor(createTestQueryClient()),
    });

    expect(result.current.isFetching).toBe(false);
    expect(result.current.total).toBeNull();
    expect(BeerService.getPage).not.toHaveBeenCalled();
  });

  it("starts fetching when it becomes enabled", async () => {
    stubTotals();

    const { result, rerender } = renderHook(({ isEnabled }) => useBeerPreviewQuery(BELGIUM_QUERY, isEnabled), {
      wrapper: wrapperFor(createTestQueryClient()),
      initialProps: { isEnabled: false },
    });
    rerender({ isEnabled: true });

    await waitFor(() => expect(result.current.total).toBe(49));
  });

  it("keeps the previous total while the counter of a new draft is loading", async () => {
    stubTotals();
    const { result, rerender } = renderHook(({ query }) => useBeerPreviewQuery(query, true), {
      wrapper: wrapperFor(createTestQueryClient()),
      initialProps: { query: EMPTY_BEER_QUERY },
    });
    await waitFor(() => expect(result.current.total).toBe(120));

    let resolveNext: (value: unknown) => void = () => undefined;
    (BeerService.getPage as Mock).mockReturnValueOnce(new Promise((resolve) => (resolveNext = resolve)));
    rerender({ query: BELGIUM_QUERY });

    await waitFor(() => expect(result.current.isFetching).toBe(true));
    expect(result.current.total).toBe(120);
    expect(result.current.facets).toEqual(FACETS);

    resolveNext({ items: [], total: 49, page: 1, size: 1, facets: FACETS });
    await waitFor(() => expect(result.current.total).toBe(49));
  });

  it("flags the error, with no total, when the request fails", async () => {
    (BeerService.getPage as Mock).mockRejectedValue(new Error("server down"));

    const { result } = renderHook(() => useBeerPreviewQuery(BELGIUM_QUERY, true), {
      wrapper: wrapperFor(createTestQueryClient()),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.total).toBeNull();
    expect(result.current.facets).toBeNull();
  });

  it("caches under beerKeys.preview(query) with the long stale and gc times", async () => {
    stubTotals();
    const client = createTestQueryClient();

    const { result } = renderHook(() => useBeerPreviewQuery(BELGIUM_QUERY, true), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(result.current.total).toBe(49));

    expect(client.getQueryData(beerKeys.catalog(BELGIUM_QUERY))).toBeUndefined();
    const cachedQuery = client.getQueryCache().find({ queryKey: beerKeys.preview(BELGIUM_QUERY) });
    const options = cachedQuery?.options as QueryObserverOptions | undefined;
    expect(options).toBeDefined();
    expect(options?.staleTime).toBe(queryTimes.long.staleTime);
    expect(options?.gcTime).toBe(queryTimes.long.gcTime);
  });
});
