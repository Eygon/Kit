import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { toast } from "@heroui/react";
import { createTestQueryClient } from "@/__tests__/utils/renderWithProviders";
import { useCollectionMembershipToggle } from "@/pages/beerDetail/hooks/useCollectionMembershipToggle";
import type { MyCollection } from "@/types/mappers/collection/myCollectionMapper";
import type { Beer } from "@/types/models/beer/beer";
import { addCollectionBeer, removeCollectionBeer } from "@/utils/queryFunctions/collectionQueryFunctions";
import { addToWishlist, removeFromWishlist } from "@/utils/queryFunctions/wishlistQueryFunctions";
import { beerKeys } from "@/utils/queryKeys/beerQueryKeys";
import { collectionKeys } from "@/utils/queryKeys/collectionQueryKeys";

vi.mock("@heroui/react", () => ({
  toast: { success: vi.fn(), danger: vi.fn() },
}));

vi.mock("@/utils/queryFunctions/wishlistQueryFunctions", () => ({
  addToWishlist: vi.fn(),
  removeFromWishlist: vi.fn(),
}));

vi.mock("@/utils/queryFunctions/collectionQueryFunctions", () => ({
  addCollectionBeer: vi.fn(),
  removeCollectionBeer: vi.fn(),
}));

const WISHLIST: MyCollection = { id: null, kind: "wishlist", name: "", beerCount: 1, containsBeer: true } as MyCollection;
const TRAPPISTES: MyCollection = { id: 5, kind: "custom", name: "Trappistes", beerCount: 0, containsBeer: false } as MyCollection;
const SOUR: MyCollection = { id: 6, kind: "custom", name: "Sours", beerCount: 0, containsBeer: false } as MyCollection;
const BEER = { id: 7, name: "Orval", inWishlist: true } as Beer;

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

const cachedMine = (client: QueryClient) => client.getQueryData<MyCollection[]>(collectionKeys.mine(7));

describe("useCollectionMembershipToggle", () => {
  let client: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = createTestQueryClient();
    client.setQueryData(collectionKeys.mine(7), [WISHLIST, TRAPPISTES, SOUR]);
    client.setQueryData(beerKeys.detail(7), BEER);
  });

  it("adds the beer to a custom collection, flips only that row, toasts with the name and invalidates the collections and beers", async () => {
    (addCollectionBeer as Mock).mockResolvedValue({ id: 5, kind: "custom", name: "Trappistes", beerCount: 1 });
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useCollectionMembershipToggle(7), { wrapper: wrapperFor(client) });

    await act(async () => result.current.toggleMembership(TRAPPISTES, true));

    expect(addCollectionBeer).toHaveBeenCalledTimes(1);
    expect(addCollectionBeer).toHaveBeenCalledWith(5, 7);
    expect(removeCollectionBeer).not.toHaveBeenCalled();
    expect(addToWishlist).not.toHaveBeenCalled();
    expect(cachedMine(client)).toEqual([WISHLIST, { ...TRAPPISTES, containsBeer: true }, SOUR]);
    expect(client.getQueryData(beerKeys.detail(7))).toEqual(BEER);
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith("Ajoutée à « Trappistes ».");
    expect(invalidate).toHaveBeenCalledWith({ queryKey: collectionKeys.all() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: beerKeys.all() });
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("removes the beer from a custom collection", async () => {
    client.setQueryData(collectionKeys.mine(7), [WISHLIST, { ...TRAPPISTES, containsBeer: true }]);
    (removeCollectionBeer as Mock).mockResolvedValue(undefined);
    const { result } = renderHook(() => useCollectionMembershipToggle(7), { wrapper: wrapperFor(client) });

    await act(async () => result.current.toggleMembership({ ...TRAPPISTES, containsBeer: true }, false));

    expect(removeCollectionBeer).toHaveBeenCalledTimes(1);
    expect(removeCollectionBeer).toHaveBeenCalledWith(5, 7);
    expect(addCollectionBeer).not.toHaveBeenCalled();
    expect(cachedMine(client)).toEqual([WISHLIST, TRAPPISTES]);
    expect(toast.success).toHaveBeenCalledWith("Retirée de « Trappistes ».");
  });

  it("removes the beer from the wishlist through the wishlist route and follows it on the beer detail", async () => {
    (removeFromWishlist as Mock).mockResolvedValue(undefined);
    const { result } = renderHook(() => useCollectionMembershipToggle(7), { wrapper: wrapperFor(client) });

    await act(async () => result.current.toggleMembership(WISHLIST, false));

    expect(removeFromWishlist).toHaveBeenCalledTimes(1);
    expect(removeFromWishlist).toHaveBeenCalledWith(7);
    expect(removeCollectionBeer).not.toHaveBeenCalled();
    expect(cachedMine(client)).toEqual([{ ...WISHLIST, containsBeer: false }, TRAPPISTES, SOUR]);
    expect(client.getQueryData(beerKeys.detail(7))).toEqual({ ...BEER, inWishlist: false });
    expect(toast.success).toHaveBeenCalledWith("Retirée de vos envies.");
  });

  it("adds the beer to the wishlist through the wishlist route and follows it on the beer detail", async () => {
    client.setQueryData(collectionKeys.mine(7), [{ ...WISHLIST, containsBeer: false }, TRAPPISTES]);
    client.setQueryData(beerKeys.detail(7), { ...BEER, inWishlist: false });
    (addToWishlist as Mock).mockResolvedValue({ beerId: 7 });
    const { result } = renderHook(() => useCollectionMembershipToggle(7), { wrapper: wrapperFor(client) });

    await act(async () => result.current.toggleMembership({ ...WISHLIST, containsBeer: false }, true));

    expect(addToWishlist).toHaveBeenCalledWith(7);
    expect(addCollectionBeer).not.toHaveBeenCalled();
    expect(cachedMine(client)).toEqual([WISHLIST, TRAPPISTES]);
    expect(client.getQueryData(beerKeys.detail(7))).toEqual({ ...BEER, inWishlist: true });
    expect(toast.success).toHaveBeenCalledWith("Ajoutée à vos envies.");
  });

  it("leaves the cache untouched on failure, with no success toast and no toast.danger from the hook, and settles", async () => {
    const pending = deferred<unknown>();
    (addCollectionBeer as Mock).mockReturnValue(pending.promise);
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useCollectionMembershipToggle(7), { wrapper: wrapperFor(client) });

    act(() => {
      void result.current.toggleMembership(TRAPPISTES, true);
    });
    await waitFor(() => expect(result.current.isTogglePending(TRAPPISTES)).toBe(true));

    await act(async () => pending.reject(new Error("server down")));

    await waitFor(() => expect(result.current.isTogglePending(TRAPPISTES)).toBe(false));
    expect(cachedMine(client)).toEqual([WISHLIST, TRAPPISTES, SOUR]);
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.danger).not.toHaveBeenCalled();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: collectionKeys.all() });
  });

  it("fires one call when the same row is toggled twice in the same tick while the request is still in flight", async () => {
    const pending = deferred<unknown>();
    (addCollectionBeer as Mock).mockReturnValue(pending.promise);
    const { result } = renderHook(() => useCollectionMembershipToggle(7), { wrapper: wrapperFor(client) });

    act(() => {
      void result.current.toggleMembership(TRAPPISTES, true);
      void result.current.toggleMembership(TRAPPISTES, true);
    });

    await waitFor(() => expect(addCollectionBeer).toHaveBeenCalledTimes(1));
    expect(result.current.isTogglePending(TRAPPISTES)).toBe(true);
    expect(result.current.isTogglePending(SOUR)).toBe(false);

    await act(async () => pending.resolve({ id: 5 }));
    await waitFor(() => expect(result.current.isTogglePending(TRAPPISTES)).toBe(false));
  });

  it("keeps two different rows independent: the second one fires while the first is in flight", async () => {
    const first = deferred<unknown>();
    (addCollectionBeer as Mock).mockImplementation((collectionId: number) =>
      collectionId === 5 ? first.promise : Promise.resolve({ id: collectionId }),
    );
    const { result } = renderHook(() => useCollectionMembershipToggle(7), { wrapper: wrapperFor(client) });

    act(() => {
      void result.current.toggleMembership(TRAPPISTES, true);
    });
    await act(async () => result.current.toggleMembership(SOUR, true));

    expect(addCollectionBeer).toHaveBeenCalledTimes(2);
    expect(addCollectionBeer).toHaveBeenNthCalledWith(2, 6, 7);
    expect(result.current.isTogglePending(TRAPPISTES)).toBe(true);
    expect(result.current.isTogglePending(SOUR)).toBe(false);

    await act(async () => first.resolve({ id: 5 }));
    await waitFor(() => expect(result.current.isTogglePending(TRAPPISTES)).toBe(false));
  });

  it("does nothing without a beer", async () => {
    const { result } = renderHook(() => useCollectionMembershipToggle(null), { wrapper: wrapperFor(client) });

    await act(async () => result.current.toggleMembership(TRAPPISTES, true));

    expect(addCollectionBeer).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });
});
