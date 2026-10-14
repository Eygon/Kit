import { toast } from "@heroui/react";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { createTestQueryClient } from "@/__tests__/utils/renderWithProviders";
import { useRemoveFromWishlistMutation } from "@/pages/profile/hooks/useRemoveFromWishlistMutation";
import type { WishlistItem } from "@/types/models/wishlist/wishlistItem";
import { removeFromWishlist } from "@/utils/queryFunctions/wishlistQueryFunctions";
import { beerKeys } from "@/utils/queryKeys/beerQueryKeys";
import { wishlistKeys } from "@/utils/queryKeys/wishlistQueryKeys";

vi.mock("@/utils/queryFunctions/wishlistQueryFunctions", () => ({
  removeFromWishlist: vi.fn(),
}));


const ORVAL: WishlistItem = { beerId: 7, beerName: "Orval", addedAt: "2026-10-12T12:00:00.000Z" };
const CHIMAY: WishlistItem = { beerId: 9, beerName: "Chimay", addedAt: "2026-10-11T08:00:00.000Z" };

const wrapperFor = (client: QueryClient) => {
  const Wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

describe("useRemoveFromWishlistMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(toast, "success").mockImplementation(() => "toast-id");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("removes the beer from the cached wishlist, toasts once and invalidates the wishlist and the beers", async () => {
    (removeFromWishlist as Mock).mockResolvedValue(undefined);
    const client = createTestQueryClient();
    client.setQueryData(wishlistKeys.me(), [ORVAL, CHIMAY]);
    const invalidate = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useRemoveFromWishlistMutation(), { wrapper: wrapperFor(client) });
    act(() => result.current.removeItem(7));

    await waitFor(() => expect(client.getQueryData(wishlistKeys.me())).toEqual([CHIMAY]));
    expect(removeFromWishlist).toHaveBeenCalledWith(7);
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith("Retirée de vos envies.");
    await waitFor(() => expect(result.current.pendingBeerId).toBeNull());
    expect(invalidate).toHaveBeenCalledWith({ queryKey: wishlistKeys.all() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: beerKeys.all() });
  });

  it("succeeds without a cached wishlist and leaves the cache empty", async () => {
    (removeFromWishlist as Mock).mockResolvedValue(undefined);
    const client = createTestQueryClient();

    const { result } = renderHook(() => useRemoveFromWishlistMutation(), { wrapper: wrapperFor(client) });
    act(() => result.current.removeItem(7));

    await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(1));
    expect(client.getQueryData(wishlistKeys.me())).toBeUndefined();
  });

  it("keeps the cache intact and shows no success toast when the removal fails", async () => {
    (removeFromWishlist as Mock).mockRejectedValue(new Error("down"));
    const client = createTestQueryClient();
    client.setQueryData(wishlistKeys.me(), [ORVAL, CHIMAY]);
    const invalidate = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useRemoveFromWishlistMutation(), { wrapper: wrapperFor(client) });
    act(() => result.current.removeItem(7));

    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: wishlistKeys.all() }));
    expect(client.getQueryData(wishlistKeys.me())).toEqual([ORVAL, CHIMAY]);
    expect(toast.success).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.pendingBeerId).toBeNull());
  });

  it("reports the beer being removed and ignores a second press on any beer meanwhile", async () => {
    let release: () => void = () => undefined;
    (removeFromWishlist as Mock).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const client = createTestQueryClient();
    client.setQueryData(wishlistKeys.me(), [ORVAL, CHIMAY]);

    const { result } = renderHook(() => useRemoveFromWishlistMutation(), { wrapper: wrapperFor(client) });
    expect(result.current.pendingBeerId).toBeNull();
    act(() => {
      result.current.removeItem(7);
      result.current.removeItem(7);
      result.current.removeItem(9);
    });

    await waitFor(() => expect(result.current.pendingBeerId).toBe(7));
    expect(removeFromWishlist).toHaveBeenCalledTimes(1);
    await act(async () => {
      release();
    });
    await waitFor(() => expect(result.current.pendingBeerId).toBeNull());

    act(() => result.current.removeItem(9));
    await waitFor(() => expect(removeFromWishlist).toHaveBeenCalledTimes(2));
    expect(removeFromWishlist).toHaveBeenLastCalledWith(9);
    await act(async () => {
      release();
    });
  });
});
