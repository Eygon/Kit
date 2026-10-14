import { toast } from "@heroui/react";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { createTestQueryClient } from "@/__tests__/utils/renderWithProviders";
import i18n from "@/i18n/i18n";
import { useDeleteReviewMutation } from "@/pages/beerDetail/hooks/useDeleteReviewMutation";
import { deleteReview } from "@/utils/queryFunctions/reviewQueryFunctions";
import { beerKeys } from "@/utils/queryKeys/beerQueryKeys";
import { reviewKeys } from "@/utils/queryKeys/reviewQueryKeys";

vi.mock("@heroui/react", () => ({
  toast: { success: vi.fn(), danger: vi.fn() },
}));

vi.mock("@/utils/queryFunctions/reviewQueryFunctions", () => ({
  deleteReview: vi.fn(),
}));

const wrapperFor = (client: QueryClient) => {
  const Wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

const renderDeleteHook = (client: QueryClient) =>
  renderHook(() => useDeleteReviewMutation(), { wrapper: wrapperFor(client) });

describe("useDeleteReviewMutation", () => {
  let client: QueryClient;
  let invalidate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    client = createTestQueryClient();
    invalidate = vi.spyOn(client, "invalidateQueries");
  });

  it("sends the beer id to the query function", async () => {
    (deleteReview as Mock).mockResolvedValue(undefined);
    const { result } = renderDeleteHook(client);

    await act(async () => {
      await result.current.removeReview(7);
    });

    expect(deleteReview).toHaveBeenCalledTimes(1);
    expect((deleteReview as Mock).mock.calls[0][0]).toBe(7);
  });

  it("invalidates the beers and the reviews of this beer, then shows the success toast once", async () => {
    (deleteReview as Mock).mockResolvedValue(undefined);
    const { result } = renderDeleteHook(client);

    await act(async () => {
      await result.current.removeReview(7);
    });

    const keys = invalidate.mock.calls.map(([filters]: [{ queryKey: unknown }]) => filters.queryKey);
    expect(keys).toHaveLength(2);
    expect(keys).toEqual(expect.arrayContaining([beerKeys.all(), reviewKeys.list(7)]));
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith(i18n.t("pages.beerDetail.reviews.delete.done"));
    expect(i18n.t("pages.beerDetail.reviews.delete.done")).toBe("Avis supprimé");
  });

  it("reports removing while the request is in flight", async () => {
    let resolve!: () => void;
    (deleteReview as Mock).mockReturnValue(new Promise<void>((res) => (resolve = res)));
    const { result } = renderDeleteHook(client);
    expect(result.current.isRemoving).toBe(false);

    let removing!: Promise<unknown>;
    act(() => {
      removing = result.current.removeReview(7);
    });
    await waitFor(() => expect(result.current.isRemoving).toBe(true));

    await act(async () => {
      resolve();
      await removing;
    });
    await waitFor(() => expect(result.current.isRemoving).toBe(false));
  });

  it("rethrows the failure without any toast, invalidation or success message", async () => {
    const failure = new Error("server down");
    (deleteReview as Mock).mockRejectedValue(failure);
    const { result } = renderDeleteHook(client);

    await act(async () => {
      await expect(result.current.removeReview(7)).rejects.toBe(failure);
    });

    expect(toast.danger).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
  });
});
