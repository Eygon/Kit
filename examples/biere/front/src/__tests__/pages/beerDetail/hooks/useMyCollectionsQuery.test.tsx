import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { createTestQueryClient } from "@/__tests__/utils/renderWithProviders";
import { useMyCollectionsQuery } from "@/pages/beerDetail/hooks/useMyCollectionsQuery";
import type { MyCollection } from "@/types/mappers/collection/myCollectionMapper";
import { fetchMyCollections } from "@/utils/queryFunctions/collectionQueryFunctions";
import { collectionKeys } from "@/utils/queryKeys/collectionQueryKeys";

vi.mock("@/utils/queryFunctions/collectionQueryFunctions", () => ({
  fetchMyCollections: vi.fn(),
}));

const COLLECTIONS: MyCollection[] = [
  { id: null, kind: "wishlist", name: "", beerCount: 1, containsBeer: true } as MyCollection,
  { id: 5, kind: "custom", name: "Trappistes", beerCount: 0, containsBeer: false } as MyCollection,
];

const wrapperFor = (client: QueryClient) => {
  const Wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

describe("useMyCollectionsQuery", () => {
  let client: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = createTestQueryClient();
  });

  it("builds the keys of the collections read for a beer under the collections root", () => {
    expect(collectionKeys.mine(7)).toEqual([...collectionKeys.all(), "mine", 7]);
    expect(collectionKeys.mine(7)).not.toEqual(collectionKeys.mine(8));
  });

  it("reads my collections of the beer when enabled and exposes them", async () => {
    (fetchMyCollections as Mock).mockResolvedValue(COLLECTIONS);

    const { result } = renderHook(() => useMyCollectionsQuery(7, true), { wrapper: wrapperFor(client) });

    expect(result.current.isPending).toBe(true);
    expect(result.current.collections).toEqual([]);
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(fetchMyCollections).toHaveBeenCalledTimes(1);
    expect(fetchMyCollections).toHaveBeenCalledWith(7);
    expect(result.current.collections).toEqual(COLLECTIONS);
    expect(result.current.isError).toBe(false);
  });

  it("does not read anything while disabled or without a beer", () => {
    renderHook(() => useMyCollectionsQuery(7, false), { wrapper: wrapperFor(client) });
    renderHook(() => useMyCollectionsQuery(null, true), { wrapper: wrapperFor(client) });

    expect(fetchMyCollections).not.toHaveBeenCalled();
  });

  it("reports the failure once, with no retry of its own", async () => {
    (fetchMyCollections as Mock).mockRejectedValue(new Error("server down"));
    const retryingClient = createTestQueryClient();
    retryingClient.setDefaultOptions({ queries: { retry: 1, retryDelay: 1 } });

    const { result } = renderHook(() => useMyCollectionsQuery(7, true), { wrapper: wrapperFor(retryingClient) });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(fetchMyCollections).toHaveBeenCalledTimes(1);
    expect(result.current.collections).toEqual([]);
  });
});
