import type { QueryClient, QueryObserverOptions } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { createTestQueryClient } from "@/__tests__/utils/renderWithProviders";
import WishlistService from "@/api/wishlist/wishlistService";
import { queryTimes } from "@/config/tanstackQuery";
import { useWishlistQuery } from "@/pages/profile/hooks/useWishlistQuery";
import { wishlistKeys } from "@/utils/queryKeys/wishlistQueryKeys";

vi.mock("@/api/wishlist/wishlistService", () => ({
  default: { getAll: vi.fn() },
}));


const ITEMS = [{ beerId: 7, beerName: "Orval", addedAt: "2026-10-12T12:00:00.000Z" }];

const wrapperFor = (client: QueryClient) => {
  const Wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

describe("useWishlistQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts pending with no item, then exposes the items", async () => {
    (WishlistService.getAll as Mock).mockResolvedValue(ITEMS);

    const { result } = renderHook(() => useWishlistQuery(), { wrapper: wrapperFor(createTestQueryClient()) });

    expect(result.current.isPending).toBe(true);
    expect(result.current.items).toEqual([]);
    expect(result.current.isError).toBe(false);
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.items).toEqual(ITEMS);
    expect(WishlistService.getAll).toHaveBeenCalledTimes(1);
  });

  it("reports the error and no item when the service rejects", async () => {
    (WishlistService.getAll as Mock).mockRejectedValue(new Error("down"));

    const { result } = renderHook(() => useWishlistQuery(), { wrapper: wrapperFor(createTestQueryClient()) });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.items).toEqual([]);
  });

  it("reads the wishlist again on refetch and recovers from an error", async () => {
    (WishlistService.getAll as Mock).mockRejectedValueOnce(new Error("down")).mockResolvedValue(ITEMS);

    const { result } = renderHook(() => useWishlistQuery(), { wrapper: wrapperFor(createTestQueryClient()) });
    await waitFor(() => expect(result.current.isError).toBe(true));

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => expect(result.current.items).toEqual(ITEMS));
    expect(result.current.isError).toBe(false);
    expect(WishlistService.getAll).toHaveBeenCalledTimes(2);
  });

  it("caches under wishlistKeys.me() with the default query times", async () => {
    (WishlistService.getAll as Mock).mockResolvedValue(ITEMS);
    const client = createTestQueryClient();

    const { result } = renderHook(() => useWishlistQuery(), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(result.current.items).toEqual(ITEMS));

    const cachedQuery = client.getQueryCache().find({ queryKey: wishlistKeys.me() });
    const options = cachedQuery?.options as QueryObserverOptions | undefined;
    expect(options).toBeDefined();
    expect(options?.staleTime).toBe(queryTimes.default.staleTime);
    expect(options?.gcTime).toBe(queryTimes.default.gcTime);
  });
});
