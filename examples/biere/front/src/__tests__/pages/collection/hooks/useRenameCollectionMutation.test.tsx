import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { createTestQueryClient } from "@/__tests__/utils/renderWithProviders";
import { useRenameCollectionMutation } from "@/pages/collection/hooks/useRenameCollectionMutation";
import type { CollectionSummary } from "@/types/models/collection/collectionSummary";
import { renameCollection } from "@/utils/queryFunctions/collectionQueryFunctions";
import { collectionKeys } from "@/utils/queryKeys/collectionQueryKeys";

vi.mock("@/utils/queryFunctions/collectionQueryFunctions", () => ({
  renameCollection: vi.fn(),
}));

const RENAMED: CollectionSummary = { id: 5, kind: "custom" as CollectionSummary["kind"], name: "Abbayes", beerCount: 3 };

const wrapperFor = (client: QueryClient) => {
  const Wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

const renderMutation = (client: QueryClient) =>
  renderHook(() => useRenameCollectionMutation(), { wrapper: wrapperFor(client) });

describe("useRenameCollectionMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends the id and the name, returns the renamed collection and invalidates every collection query", async () => {
    (renameCollection as Mock).mockResolvedValue(RENAMED);
    const client = createTestQueryClient();
    client.setQueryData(collectionKeys.detail(1, 5), { name: "Trappistes" });
    client.setQueryData(collectionKeys.list(1), []);
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const { result } = renderMutation(client);

    let renamed: unknown;
    await act(async () => {
      renamed = await result.current.renameCollection(5, "Abbayes");
    });

    expect(renameCollection).toHaveBeenCalledTimes(1);
    expect(renameCollection).toHaveBeenCalledWith(5, "Abbayes");
    expect(renamed).toEqual(RENAMED);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: collectionKeys.all() });
    expect(client.getQueryState(collectionKeys.detail(1, 5))?.isInvalidated).toBe(true);
    expect(client.getQueryState(collectionKeys.list(1))?.isInvalidated).toBe(true);
  });

  it("rethrows and invalidates nothing when the rename fails", async () => {
    (renameCollection as Mock).mockRejectedValue(new Error("Down"));
    const client = createTestQueryClient();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const { result } = renderMutation(client);

    await act(async () => {
      await expect(result.current.renameCollection(5, "Abbayes")).rejects.toThrow("Down");
    });

    expect(invalidate).not.toHaveBeenCalled();
  });

  it("sends a single request when the rename is triggered twice in the same tick", async () => {
    let finish: (collection: CollectionSummary) => void = () => undefined;
    (renameCollection as Mock).mockImplementation(
      () =>
        new Promise<CollectionSummary>((resolve) => {
          finish = resolve;
        }),
    );
    const client = createTestQueryClient();
    const { result } = renderMutation(client);

    let first: Promise<CollectionSummary | null> = Promise.resolve(null);
    let second: Promise<CollectionSummary | null> = Promise.resolve(RENAMED);
    act(() => {
      first = result.current.renameCollection(5, "Abbayes");
      second = result.current.renameCollection(5, "Abbayes");
    });
    await waitFor(() => expect(result.current.isPending).toBe(true));
    await act(async () => {
      finish(RENAMED);
      await first;
    });

    expect(renameCollection).toHaveBeenCalledTimes(1);
    await expect(second).resolves.toBeNull();
    await waitFor(() => expect(result.current.isPending).toBe(false));
  });

  it("accepts a new rename once the failed one is over", async () => {
    (renameCollection as Mock).mockRejectedValueOnce(new Error("Down")).mockResolvedValueOnce(RENAMED);
    const client = createTestQueryClient();
    const { result } = renderMutation(client);

    await act(async () => {
      await expect(result.current.renameCollection(5, "Abbayes")).rejects.toThrow("Down");
    });
    await act(async () => {
      await expect(result.current.renameCollection(5, "Abbayes")).resolves.toEqual(RENAMED);
    });

    expect(renameCollection).toHaveBeenCalledTimes(2);
  });
});
