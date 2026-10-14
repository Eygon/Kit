import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { createTestQueryClient } from "@/__tests__/utils/renderWithProviders";
import { queryTimes } from "@/config/tanstackQuery";
import { useCollectionQuery } from "@/pages/collection/hooks/useCollectionQuery";
import { collectionKeys } from "@/utils/queryKeys/collectionQueryKeys";

const mockService = vi.hoisted(() => ({ default: { getDetail: vi.fn(), getWishlistOf: vi.fn() } }));

vi.mock("@/api/collections/collectionService", () => mockService);

const DETAIL = { id: 5, kind: "custom", name: "Trappistes", ownerId: 2, beers: [] };
const WISHLIST = { id: null, kind: "wishlist", name: "", ownerId: 2, beers: [] };

const wrapperFor = (client: QueryClient) => {
  const Wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

const getDetail = () => mockService.default.getDetail as Mock;
const getWishlistOf = () => mockService.default.getWishlistOf as Mock;

const renderCollectionQuery = (userId: number | null, collectionId: number | null, client = createTestQueryClient()) => {
  return renderHook(() => useCollectionQuery(userId, collectionId), { wrapper: wrapperFor(client) });
};

describe("useCollectionQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts pending with no collection, then exposes the collection of the user", async () => {
    getDetail().mockResolvedValue(DETAIL);

    const { result } = renderCollectionQuery(2, 5);

    expect(result.current.isPending).toBe(true);
    expect(result.current.collection).toBeNull();
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.collection).toEqual(DETAIL);
    expect(result.current.isError).toBe(false);
    expect(getDetail()).toHaveBeenCalledTimes(1);
    expect(getDetail()).toHaveBeenCalledWith(2, 5);
    expect(getWishlistOf()).not.toHaveBeenCalled();
  });

  it("reads the wishlist of the user when there is no collection id", async () => {
    getWishlistOf().mockResolvedValue(WISHLIST);

    const { result } = renderCollectionQuery(2, null);

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.collection).toEqual(WISHLIST);
    expect(getWishlistOf()).toHaveBeenCalledTimes(1);
    expect(getWishlistOf()).toHaveBeenCalledWith(2);
    expect(getDetail()).not.toHaveBeenCalled();
  });

  it("exposes null when the service finds no collection", async () => {
    getDetail().mockResolvedValue(null);

    const { result } = renderCollectionQuery(2, 9);

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.collection).toBeNull();
    expect(result.current.isError).toBe(false);
  });

  it("reads nothing while the user id is unknown", async () => {
    const { result } = renderCollectionQuery(null, 5);

    expect(result.current.collection).toBeNull();
    expect(getDetail()).not.toHaveBeenCalled();
    expect(getWishlistOf()).not.toHaveBeenCalled();
  });

  it("flags an error when the read fails and reads again on refetch", async () => {
    getDetail().mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce(DETAIL);

    const { result } = renderCollectionQuery(2, 5);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.collection).toBeNull();

    await result.current.refetch();

    await waitFor(() => expect(result.current.collection).toEqual(DETAIL));
    expect(getDetail()).toHaveBeenCalledTimes(2);
  });

  it("caches the collection and the wishlist under distinct keys with the short timing", async () => {
    getDetail().mockResolvedValue(DETAIL);
    getWishlistOf().mockResolvedValue(WISHLIST);
    const client = createTestQueryClient();

    const detail = renderCollectionQuery(2, 5, client);
    const wishlist = renderCollectionQuery(2, null, client);
    await waitFor(() => expect(detail.result.current.collection).toEqual(DETAIL));
    await waitFor(() => expect(wishlist.result.current.collection).toEqual(WISHLIST));

    expect(client.getQueryData(collectionKeys.detail(2, 5))).toEqual(DETAIL);
    expect(client.getQueryData(collectionKeys.wishlist(2))).toEqual(WISHLIST);
    expect(collectionKeys.detail(2, 5)).not.toEqual(collectionKeys.wishlist(2));
    expect(collectionKeys.detail(2, 5)).not.toEqual(collectionKeys.detail(2, 6));
    expect(collectionKeys.detail(2, 5)).not.toEqual(collectionKeys.detail(3, 5));
    expect(client.getQueryCache().find({ queryKey: collectionKeys.detail(2, 5) })?.observers[0].options.staleTime).toBe(
      queryTimes.short.staleTime,
    );
  });
});
