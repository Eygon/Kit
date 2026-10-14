import { toast } from "@heroui/react";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { createTestQueryClient } from "@/__tests__/utils/renderWithProviders";
import i18n from "@/i18n/i18n";
import { useRemoveCollectionBeerMutation } from "@/pages/collection/hooks/useRemoveCollectionBeerMutation";
import { removeCollectionBeer } from "@/utils/queryFunctions/collectionQueryFunctions";
import { removeFromWishlist } from "@/utils/queryFunctions/wishlistQueryFunctions";
import { beerKeys } from "@/utils/queryKeys/beerQueryKeys";
import { collectionKeys } from "@/utils/queryKeys/collectionQueryKeys";
import { wishlistKeys } from "@/utils/queryKeys/wishlistQueryKeys";

vi.mock("@heroui/react", () => ({
  toast: { success: vi.fn(), danger: vi.fn() },
}));

vi.mock("@/utils/queryFunctions/collectionQueryFunctions", () => ({
  removeCollectionBeer: vi.fn(),
}));

vi.mock("@/utils/queryFunctions/wishlistQueryFunctions", () => ({
  removeFromWishlist: vi.fn(),
}));

const wrapperFor = (client: QueryClient) => {
  const Wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

const renderRemoveHook = (client: QueryClient) =>
  renderHook(() => useRemoveCollectionBeerMutation(), { wrapper: wrapperFor(client) });

describe("useRemoveCollectionBeerMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends the collection id and the beer id to the query function", async () => {
    (removeCollectionBeer as Mock).mockResolvedValue(undefined);
    const { result } = renderRemoveHook(createTestQueryClient());

    await act(async () => {
      await result.current.removeBeer(5, 12);
    });

    expect(removeCollectionBeer).toHaveBeenCalledTimes(1);
    expect(removeCollectionBeer).toHaveBeenCalledWith(5, 12);
  });

  it("invalidates every collection query once and toasts the success once", async () => {
    (removeCollectionBeer as Mock).mockResolvedValue(undefined);
    const client = createTestQueryClient();
    client.setQueryData(collectionKeys.list(1), []);
    client.setQueryData(collectionKeys.detail(1, 5), { name: "Trappistes" });
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const { result } = renderRemoveHook(client);

    await act(async () => {
      await result.current.removeBeer(5, 12);
    });

    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: collectionKeys.all() });
    expect(client.getQueryState(collectionKeys.list(1))?.isInvalidated).toBe(true);
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith(i18n.t("pages.collection.removeSuccess"));
    expect(i18n.t("pages.collection.removeSuccess")).toBe("Bière retirée de la collection");
  });

  it("removes from the wishlist À goûter when the collection id is null and refreshes wishlist and beers", async () => {
    (removeFromWishlist as Mock).mockResolvedValue(undefined);
    const client = createTestQueryClient();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const { result } = renderRemoveHook(client);

    await act(async () => {
      await result.current.removeBeer(null, 12);
    });

    expect(removeFromWishlist).toHaveBeenCalledTimes(1);
    expect(removeFromWishlist).toHaveBeenCalledWith(12);
    expect(removeCollectionBeer).not.toHaveBeenCalled();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: collectionKeys.all() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: wishlistKeys.all() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: beerKeys.all() });
    expect(toast.success).toHaveBeenCalledTimes(1);
  });

  it("rethrows, invalidates nothing and toasts no success when the removal fails", async () => {
    (removeCollectionBeer as Mock).mockRejectedValue(new Error("Down"));
    const client = createTestQueryClient();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const { result } = renderRemoveHook(client);

    await act(async () => {
      await expect(result.current.removeBeer(5, 12)).rejects.toThrow("Down");
    });

    expect(invalidate).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(result.current.removingBeerIds).toEqual([]);
  });

  it("tracks every beer in flight and frees each id when its request settles", async () => {
    const finishers = new Map<number, () => void>();
    (removeCollectionBeer as Mock).mockImplementation(
      (_collectionId: number, beerId: number) =>
        new Promise<void>((resolve) => {
          finishers.set(beerId, resolve);
        }),
    );
    const { result } = renderRemoveHook(createTestQueryClient());
    expect(result.current.removingBeerIds).toEqual([]);

    let first: Promise<unknown> = Promise.resolve();
    let second: Promise<unknown> = Promise.resolve();
    act(() => {
      first = result.current.removeBeer(5, 12);
      second = result.current.removeBeer(5, 13);
    });
    await vi.waitFor(() => expect(result.current.removingBeerIds).toEqual([12, 13]));

    await act(async () => {
      finishers.get(12)?.();
      await first;
    });
    await vi.waitFor(() => expect(result.current.removingBeerIds).toEqual([13]));

    await act(async () => {
      finishers.get(13)?.();
      await second;
    });
    await vi.waitFor(() => expect(result.current.removingBeerIds).toEqual([]));
  });

  it("sends one request for two removals of the same beer in the same tick", async () => {
    (removeCollectionBeer as Mock).mockResolvedValue(undefined);
    const { result } = renderRemoveHook(createTestQueryClient());

    await act(async () => {
      await Promise.all([result.current.removeBeer(5, 12), result.current.removeBeer(5, 12)]);
    });

    expect(removeCollectionBeer).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledTimes(1);
  });
});
