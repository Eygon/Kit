import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { toast } from "@heroui/react";
import { createTestQueryClient } from "@/__tests__/utils/renderWithProviders";
import { useWishlistToggle } from "@/pages/beerDetail/hooks/useWishlistToggle";
import type { Beer } from "@/types/models/beer/beer";
import { addToWishlist, removeFromWishlist } from "@/utils/queryFunctions/wishlistQueryFunctions";
import { beerKeys } from "@/utils/queryKeys/beerQueryKeys";

vi.mock("@heroui/react", () => ({
  toast: { success: vi.fn(), danger: vi.fn() },
}));

vi.mock("@/utils/queryFunctions/wishlistQueryFunctions", () => ({
  addToWishlist: vi.fn(),
  removeFromWishlist: vi.fn(),
}));

const BEER = {
  id: 7,
  name: "Orval",
  drunk: true,
  checkinCount: 3,
  inWishlist: false,
} as Beer;

const ITEM = { beerId: 7, beerName: "Orval", addedAt: "2026-10-12T12:00:00.000Z" };

const wrapperFor = (client: QueryClient) => {
  const Wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const cachedBeer = (client: QueryClient) => client.getQueryData<Beer | null>(beerKeys.detail(7));

describe("useWishlistToggle", () => {
  let client: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = createTestQueryClient();
    client.setQueryData(beerKeys.detail(7), BEER);
  });

  it("flips inWishlist in the cache before the server answers, then adds and toasts the success", async () => {
    const pending = deferred<typeof ITEM>();
    (addToWishlist as Mock).mockReturnValue(pending.promise);
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useWishlistToggle(7), { wrapper: wrapperFor(client) });

    act(() => result.current.toggleWishlist(true));

    await waitFor(() => expect(cachedBeer(client)).toEqual({ ...BEER, inWishlist: true }));
    expect(result.current.isPending).toBe(true);
    expect(addToWishlist).toHaveBeenCalledTimes(1);
    expect(addToWishlist).toHaveBeenCalledWith(7);
    expect(toast.success).not.toHaveBeenCalled();

    await act(async () => pending.resolve(ITEM));

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith("Ajoutée à vos envies.");
    expect(cachedBeer(client)).toEqual({ ...BEER, inWishlist: true });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: beerKeys.all() });
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("removes the beer from the cache before the server answers when it was in the wishlist", async () => {
    client.setQueryData(beerKeys.detail(7), { ...BEER, inWishlist: true });
    const pending = deferred<void>();
    (removeFromWishlist as Mock).mockReturnValue(pending.promise);
    const { result } = renderHook(() => useWishlistToggle(7), { wrapper: wrapperFor(client) });

    act(() => result.current.toggleWishlist(false));

    await waitFor(() => expect(cachedBeer(client)).toEqual({ ...BEER, inWishlist: false }));
    expect(result.current.isPending).toBe(true);
    expect(removeFromWishlist).toHaveBeenCalledTimes(1);
    expect(removeFromWishlist).toHaveBeenCalledWith(7);
    expect(addToWishlist).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();

    await act(async () => pending.resolve());

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Retirée de vos envies."));
    expect(result.current.isPending).toBe(false);
    expect(cachedBeer(client)).toEqual({ ...BEER, inWishlist: false });
  });

  it("rolls the cache back on failure, with no success toast and no toast.danger from the hook", async () => {
    const pending = deferred<typeof ITEM>();
    (addToWishlist as Mock).mockReturnValue(pending.promise);
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useWishlistToggle(7), { wrapper: wrapperFor(client) });

    act(() => result.current.toggleWishlist(true));
    await waitFor(() => expect(cachedBeer(client)?.inWishlist).toBe(true));

    await act(async () => pending.reject(new Error("server down")));

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(cachedBeer(client)).toEqual(BEER);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: beerKeys.all() });
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("fires one call when toggled twice in the same tick, then accepts a new toggle once settled", async () => {
    const pending = deferred<typeof ITEM>();
    (addToWishlist as Mock).mockReturnValue(pending.promise);
    (removeFromWishlist as Mock).mockResolvedValue(undefined);
    const { result } = renderHook(() => useWishlistToggle(7), { wrapper: wrapperFor(client) });

    act(() => {
      result.current.toggleWishlist(true);
      result.current.toggleWishlist(true);
    });
    await act(async () => pending.resolve(ITEM));
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(addToWishlist).toHaveBeenCalledTimes(1);

    act(() => result.current.toggleWishlist(false));
    await waitFor(() => expect(removeFromWishlist).toHaveBeenCalledTimes(1));
  });

  it("does nothing when there is no beer id", () => {
    const { result } = renderHook(() => useWishlistToggle(null), { wrapper: wrapperFor(client) });

    act(() => result.current.toggleWishlist(true));

    expect(addToWishlist).not.toHaveBeenCalled();
    expect(removeFromWishlist).not.toHaveBeenCalled();
    expect(result.current.isPending).toBe(false);
  });

  it("leaves an unknown beer untouched and does not invent a cache entry on failure", async () => {
    const empty = createTestQueryClient();
    empty.setQueryData(beerKeys.detail(7), null);
    (addToWishlist as Mock).mockRejectedValue(new Error("nope"));
    const { result } = renderHook(() => useWishlistToggle(7), { wrapper: wrapperFor(empty) });

    act(() => result.current.toggleWishlist(true));

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(cachedBeer(empty)).toBeNull();

    const missing = createTestQueryClient();
    (addToWishlist as Mock).mockRejectedValue(new Error("nope"));
    const second = renderHook(() => useWishlistToggle(7), { wrapper: wrapperFor(missing) });

    act(() => second.result.current.toggleWishlist(true));

    await waitFor(() => expect(second.result.current.isPending).toBe(false));
    expect(cachedBeer(missing)).toBeUndefined();
  });
});
