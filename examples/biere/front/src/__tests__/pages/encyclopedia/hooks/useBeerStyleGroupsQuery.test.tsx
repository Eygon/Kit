import type { QueryClient, QueryObserverOptions } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { createTestQueryClient } from "@/__tests__/utils/renderWithProviders";
import BeerStyleService from "@/api/beerStyles/beerStyleService";
import { queryTimes } from "@/config/tanstackQuery";
import { useBeerStyleGroupsQuery } from "@/pages/encyclopedia/hooks/useBeerStyleGroupsQuery";
import { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";
import { beerStyleKeys } from "@/utils/queryKeys/beerStyleQueryKeys";

vi.mock("@/api/beerStyles/beerStyleService", () => ({
  default: { getGroups: vi.fn() },
}));

const GROUPS = [
  { family: BeerFamilyEnum.TRAPPIST, styles: [{ id: 12, name: "Trappiste Blonde", description: "Une blonde." }] },
];

const wrapperFor = (client: QueryClient) => {
  const Wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

describe("useBeerStyleGroupsQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is pending first, then exposes the groups", async () => {
    (BeerStyleService.getGroups as Mock).mockResolvedValue(GROUPS);

    const { result } = renderHook(() => useBeerStyleGroupsQuery(), { wrapper: wrapperFor(createTestQueryClient()) });

    expect(result.current.isPending).toBe(true);
    expect(result.current.groups).toEqual([]);
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.groups).toEqual(GROUPS);
    expect(result.current.isError).toBe(false);
    expect(BeerStyleService.getGroups).toHaveBeenCalledTimes(1);
  });

  it("flags the error with no group when the request fails", async () => {
    (BeerStyleService.getGroups as Mock).mockRejectedValue(new Error("server down"));

    const { result } = renderHook(() => useBeerStyleGroupsQuery(), { wrapper: wrapperFor(createTestQueryClient()) });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.groups).toEqual([]);
  });

  it("refetches on demand after a failure and then exposes the groups", async () => {
    (BeerStyleService.getGroups as Mock).mockRejectedValueOnce(new Error("server down")).mockResolvedValue(GROUPS);

    const { result } = renderHook(() => useBeerStyleGroupsQuery(), { wrapper: wrapperFor(createTestQueryClient()) });
    await waitFor(() => expect(result.current.isError).toBe(true));

    await result.current.refetch();

    await waitFor(() => expect(result.current.groups).toEqual(GROUPS));
    expect(result.current.isError).toBe(false);
    expect(BeerStyleService.getGroups).toHaveBeenCalledTimes(2);
  });

  it("caches under beerStyleKeys.groups() with the infinite stale and gc times", async () => {
    (BeerStyleService.getGroups as Mock).mockResolvedValue(GROUPS);
    const client = createTestQueryClient();

    const { result } = renderHook(() => useBeerStyleGroupsQuery(), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(result.current.groups).toEqual(GROUPS));

    expect(client.getQueryData(beerStyleKeys.groups())).toEqual(GROUPS);
    const cachedQuery = client.getQueryCache().find({ queryKey: beerStyleKeys.groups() });
    const options = cachedQuery?.options as QueryObserverOptions | undefined;
    expect(options?.staleTime).toBe(queryTimes.infinite.staleTime);
    expect(options?.gcTime).toBe(queryTimes.infinite.gcTime);
  });

  it("serves a second mount from the cache without another request", async () => {
    (BeerStyleService.getGroups as Mock).mockResolvedValue(GROUPS);
    const client = createTestQueryClient();
    const first = renderHook(() => useBeerStyleGroupsQuery(), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(first.result.current.groups).toEqual(GROUPS));
    first.unmount();

    const second = renderHook(() => useBeerStyleGroupsQuery(), { wrapper: wrapperFor(client) });

    expect(second.result.current.groups).toEqual(GROUPS);
    expect(second.result.current.isPending).toBe(false);
    expect(BeerStyleService.getGroups).toHaveBeenCalledTimes(1);
  });
});
