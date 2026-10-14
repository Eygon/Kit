import { toast } from "@heroui/react";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { createTestQueryClient } from "@/__tests__/utils/renderWithProviders";
import i18n from "@/i18n/i18n";
import { useDeleteCollectionMutation } from "@/pages/collection/hooks/useDeleteCollectionMutation";
import { deleteCollection } from "@/utils/queryFunctions/collectionQueryFunctions";
import { collectionKeys } from "@/utils/queryKeys/collectionQueryKeys";

vi.mock("@heroui/react", () => ({
  toast: { success: vi.fn(), danger: vi.fn() },
}));

vi.mock("@/utils/queryFunctions/collectionQueryFunctions", () => ({
  deleteCollection: vi.fn(),
}));

const wrapperFor = (client: QueryClient) => {
  const Wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

const renderDeleteHook = (client: QueryClient) =>
  renderHook(() => useDeleteCollectionMutation(), { wrapper: wrapperFor(client) });

describe("useDeleteCollectionMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends the collection id to the query function", async () => {
    (deleteCollection as Mock).mockResolvedValue(undefined);
    const { result } = renderDeleteHook(createTestQueryClient());

    await act(async () => {
      await result.current.removeCollection(5);
    });

    expect(deleteCollection).toHaveBeenCalledTimes(1);
    expect((deleteCollection as Mock).mock.calls[0][0]).toBe(5);
  });

  it("marks every collection query stale without rereading the deleted detail, then toasts the success once", async () => {
    (deleteCollection as Mock).mockResolvedValue(undefined);
    const client = createTestQueryClient();
    client.setQueryData(collectionKeys.list(1), []);
    client.setQueryData(collectionKeys.detail(1, 5), { name: "Trappistes" });
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const { result } = renderDeleteHook(client);

    await act(async () => {
      await result.current.removeCollection(5);
    });

    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: collectionKeys.all(), refetchType: "none" });
    expect(client.getQueryState(collectionKeys.list(1))?.isInvalidated).toBe(true);
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith(i18n.t("pages.collection.deleteSuccess"));
    expect(i18n.t("pages.collection.deleteSuccess")).toBe("Collection supprimée");
  });

  it("rethrows, invalidates nothing and toasts no success when the deletion fails", async () => {
    (deleteCollection as Mock).mockRejectedValue(new Error("Down"));
    const client = createTestQueryClient();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const { result } = renderDeleteHook(client);

    await act(async () => {
      await expect(result.current.removeCollection(5)).rejects.toThrow("Down");
    });

    expect(invalidate).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("reports removing while the request is in flight", async () => {
    let finish: () => void = () => undefined;
    (deleteCollection as Mock).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const { result } = renderDeleteHook(createTestQueryClient());
    expect(result.current.isRemoving).toBe(false);

    let pending: Promise<unknown> = Promise.resolve();
    act(() => {
      pending = result.current.removeCollection(5);
    });
    await vi.waitFor(() => expect(result.current.isRemoving).toBe(true));
    await act(async () => {
      finish();
      await pending;
    });

    await vi.waitFor(() => expect(result.current.isRemoving).toBe(false));
  });
});
