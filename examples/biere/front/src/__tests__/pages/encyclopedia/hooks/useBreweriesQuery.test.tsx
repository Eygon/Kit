import type { QueryClient, QueryObserverOptions } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { createTestQueryClient } from "@/__tests__/utils/renderWithProviders";
import BreweryService from "@/api/breweries/breweryService";
import { queryTimes } from "@/config/tanstackQuery";
import { useBreweriesQuery } from "@/pages/encyclopedia/hooks/useBreweriesQuery";
import { breweryKeys } from "@/utils/queryKeys/breweryQueryKeys";

vi.mock("@/api/breweries/breweryService", () => ({
  default: { getAll: vi.fn() },
}));

const BREWERIES = [
  { id: 4, name: "Chimay", country: "BE" },
  { id: 9, name: "Orval", country: "BE" },
];

const wrapperFor = (client: QueryClient) => {
  const Wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

describe("useBreweriesQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is pending first, then exposes the breweries", async () => {
    (BreweryService.getAll as Mock).mockResolvedValue(BREWERIES);

    const { result } = renderHook(() => useBreweriesQuery(true), { wrapper: wrapperFor(createTestQueryClient()) });

    expect(result.current.isPending).toBe(true);
    expect(result.current.breweries).toEqual([]);
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.breweries).toEqual(BREWERIES);
    expect(result.current.isError).toBe(false);
    expect(BreweryService.getAll).toHaveBeenCalledTimes(1);
  });

  it("calls nothing while it is disabled, then loads once it is enabled", async () => {
    (BreweryService.getAll as Mock).mockResolvedValue(BREWERIES);
    const client = createTestQueryClient();

    const { result, rerender } = renderHook(({ isEnabled }) => useBreweriesQuery(isEnabled), {
      wrapper: wrapperFor(client),
      initialProps: { isEnabled: false },
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(BreweryService.getAll).not.toHaveBeenCalled();
    expect(result.current.breweries).toEqual([]);
    expect(result.current.isError).toBe(false);

    rerender({ isEnabled: true });

    await waitFor(() => expect(result.current.breweries).toEqual(BREWERIES));
    expect(BreweryService.getAll).toHaveBeenCalledTimes(1);
  });

  it("flags the error with no brewery when the request fails", async () => {
    (BreweryService.getAll as Mock).mockRejectedValue(new Error("server down"));

    const { result } = renderHook(() => useBreweriesQuery(true), { wrapper: wrapperFor(createTestQueryClient()) });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.breweries).toEqual([]);
  });

  it("caches under breweryKeys.list() with the long stale and gc times", async () => {
    (BreweryService.getAll as Mock).mockResolvedValue(BREWERIES);
    const client = createTestQueryClient();

    const { result } = renderHook(() => useBreweriesQuery(true), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(result.current.breweries).toEqual(BREWERIES));

    expect(client.getQueryData(breweryKeys.list())).toEqual(BREWERIES);
    const cachedQuery = client.getQueryCache().find({ queryKey: breweryKeys.list() });
    const options = cachedQuery?.options as QueryObserverOptions | undefined;
    expect(options?.staleTime).toBe(queryTimes.long.staleTime);
    expect(options?.gcTime).toBe(queryTimes.long.gcTime);
  });

  it("serves a second mount from the cache without another request", async () => {
    (BreweryService.getAll as Mock).mockResolvedValue(BREWERIES);
    const client = createTestQueryClient();
    const first = renderHook(() => useBreweriesQuery(true), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(first.result.current.breweries).toEqual(BREWERIES));
    first.unmount();

    const second = renderHook(() => useBreweriesQuery(true), { wrapper: wrapperFor(client) });

    expect(second.result.current.breweries).toEqual(BREWERIES);
    expect(second.result.current.isPending).toBe(false);
    expect(BreweryService.getAll).toHaveBeenCalledTimes(1);
  });
});
