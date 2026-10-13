import type { QueryClient, QueryObserverOptions } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { createTestQueryClient } from "@/__tests__/utils/renderWithProviders";
import BeerService from "@/api/beers/beerService";
import { queryTimes } from "@/config/tanstackQuery";
import { useFilteredBeerQuery } from "@/pages/map/hooks/useFilteredBeerQuery";
import { beerKeys } from "@/utils/queryKeys/beerQueryKeys";

vi.mock("@/api/beers/beerService", () => ({
  default: { getById: vi.fn() },
}));

const BEER = { id: 7, name: "Orval" };

const wrapperFor = (client: QueryClient) => {
  const Wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

describe("useFilteredBeerQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches the beer of the id and exposes it", async () => {
    (BeerService.getById as Mock).mockResolvedValue(BEER);

    const { result } = renderHook(() => useFilteredBeerQuery(7), { wrapper: wrapperFor(createTestQueryClient()) });

    expect(result.current.isPending).toBe(true);
    await waitFor(() => expect(result.current.data).toEqual(BEER));
    expect(BeerService.getById).toHaveBeenCalledTimes(1);
    expect(BeerService.getById).toHaveBeenCalledWith(7);
  });

  it("sends no request for a null id", async () => {

    const { result } = renderHook(() => useFilteredBeerQuery(null), { wrapper: wrapperFor(createTestQueryClient()) });

    expect(result.current.fetchStatus).toBe("idle");
    expect(result.current.isPending).toBe(true);
    expect(BeerService.getById).not.toHaveBeenCalled();
  });

  it("exposes null for an unknown beer", async () => {
    (BeerService.getById as Mock).mockResolvedValue(null);

    const { result } = renderHook(() => useFilteredBeerQuery(99), { wrapper: wrapperFor(createTestQueryClient()) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it("caches under beerKeys.detail(id) with the long stale and gc times", async () => {
    (BeerService.getById as Mock).mockResolvedValue(BEER);
    const client = createTestQueryClient();

    const { result } = renderHook(() => useFilteredBeerQuery(7), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(result.current.data).toEqual(BEER));

    expect(client.getQueryData(beerKeys.detail(7))).toEqual(BEER);
    const options = client.getQueryCache().find({ queryKey: beerKeys.detail(7) })?.options as QueryObserverOptions | undefined;
    expect(options?.staleTime).toBe(queryTimes.long.staleTime);
    expect(options?.gcTime).toBe(queryTimes.long.gcTime);
  });
});
