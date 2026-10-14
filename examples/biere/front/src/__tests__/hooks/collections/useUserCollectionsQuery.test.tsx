import type { QueryClient, QueryObserverOptions } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { createTestQueryClient } from "@/__tests__/utils/renderWithProviders";
import { useUserCollectionsQuery } from "@/hooks/collections/useUserCollectionsQuery";
import { queryTimes } from "@/config/tanstackQuery";
import { collectionKeys } from "@/utils/queryKeys/collectionQueryKeys";

const mockService = vi.hoisted(() => ({ default: { getForUser: vi.fn() } }));

vi.mock("@/api/collections/collectionService", () => mockService);

const COLLECTIONS = [
  { id: null, kind: "wishlist", name: "", beerCount: 2 },
  { id: 5, kind: "custom", name: "Trappistes", beerCount: 1 },
];

const wrapperFor = (client: QueryClient) => {
  const Wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

const getForUser = () => mockService.default.getForUser as Mock;

describe("useUserCollectionsQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts pending with no collection, then exposes the collections of the user", async () => {
    getForUser().mockResolvedValue(COLLECTIONS);

    const { result } = renderHook(() => useUserCollectionsQuery(1, true), { wrapper: wrapperFor(createTestQueryClient()) });

    expect(result.current.isPending).toBe(true);
    expect(result.current.collections).toEqual([]);
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.collections).toEqual(COLLECTIONS);
    expect(result.current.isError).toBe(false);
    expect(getForUser()).toHaveBeenCalledTimes(1);
    expect(getForUser()).toHaveBeenCalledWith(1);
  });

  it("reads nothing while disabled, then reads the collections once enabled", async () => {
    getForUser().mockResolvedValue(COLLECTIONS);

    const { result, rerender } = renderHook(({ isEnabled }) => useUserCollectionsQuery(2, isEnabled), {
      initialProps: { isEnabled: false },
      wrapper: wrapperFor(createTestQueryClient()),
    });

    expect(result.current.collections).toEqual([]);
    expect(getForUser()).not.toHaveBeenCalled();

    rerender({ isEnabled: true });

    await waitFor(() => expect(result.current.collections).toEqual(COLLECTIONS));
    expect(getForUser()).toHaveBeenCalledTimes(1);
    expect(getForUser()).toHaveBeenCalledWith(2);
  });

  it("exposes an empty list when the collections are not visible", async () => {
    getForUser().mockResolvedValue(null);

    const { result } = renderHook(() => useUserCollectionsQuery(3, true), { wrapper: wrapperFor(createTestQueryClient()) });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.collections).toEqual([]);
    expect(result.current.isError).toBe(false);
  });

  it("reports the error and no collection when the service rejects", async () => {
    getForUser().mockRejectedValue(new Error("down"));

    const { result } = renderHook(() => useUserCollectionsQuery(1, true), { wrapper: wrapperFor(createTestQueryClient()) });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.collections).toEqual([]);
  });

  it("reads the collections again on refetch and recovers from an error", async () => {
    getForUser().mockRejectedValueOnce(new Error("down")).mockResolvedValue(COLLECTIONS);

    const { result } = renderHook(() => useUserCollectionsQuery(1, true), { wrapper: wrapperFor(createTestQueryClient()) });
    await waitFor(() => expect(result.current.isError).toBe(true));

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => expect(result.current.collections).toEqual(COLLECTIONS));
    expect(result.current.isError).toBe(false);
    expect(getForUser()).toHaveBeenCalledTimes(2);
  });

  it("reads the collections of the new user when the id changes", async () => {
    getForUser().mockImplementation(async (userId: number) => [
      { id: null, kind: "wishlist", name: "", beerCount: userId === 2 ? 9 : 2 },
    ]);

    const { result, rerender } = renderHook(({ userId }) => useUserCollectionsQuery(userId, true), {
      initialProps: { userId: 1 },
      wrapper: wrapperFor(createTestQueryClient()),
    });
    await waitFor(() => expect(result.current.collections).toEqual([{ id: null, kind: "wishlist", name: "", beerCount: 2 }]));

    rerender({ userId: 2 });

    await waitFor(() => expect(result.current.collections).toEqual([{ id: null, kind: "wishlist", name: "", beerCount: 9 }]));
    expect(getForUser()).toHaveBeenLastCalledWith(2);
  });

  it("caches under collectionKeys.list(userId) with the short query times", async () => {
    getForUser().mockResolvedValue(COLLECTIONS);
    const client = createTestQueryClient();

    const { result } = renderHook(() => useUserCollectionsQuery(1, true), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(result.current.collections).toEqual(COLLECTIONS));

    expect(collectionKeys.list(1).slice(0, 1)).toEqual(collectionKeys.all());
    expect(collectionKeys.list(1)).not.toEqual(collectionKeys.list(2));
    const cachedQuery = client.getQueryCache().find({ queryKey: collectionKeys.list(1) });
    const options = cachedQuery?.options as QueryObserverOptions | undefined;
    expect(options).toBeDefined();
    expect(options?.staleTime).toBe(queryTimes.short.staleTime);
    expect(options?.gcTime).toBe(queryTimes.short.gcTime);
  });
});
