import { toast } from "@heroui/react";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { createTestQueryClient } from "@/__tests__/utils/renderWithProviders";
import { useSaveReviewMutation } from "@/pages/beerDetail/hooks/useSaveReviewMutation";
import i18n from "@/i18n/i18n";
import type { NewReview } from "@/types/models/review/newReview";
import { saveReview } from "@/utils/queryFunctions/reviewQueryFunctions";
import { beerKeys } from "@/utils/queryKeys/beerQueryKeys";
import { reviewKeys } from "@/utils/queryKeys/reviewQueryKeys";

vi.mock("@heroui/react", () => ({
  toast: { success: vi.fn(), danger: vi.fn() },
}));

vi.mock("@/utils/queryFunctions/reviewQueryFunctions", () => ({
  saveReview: vi.fn(),
}));

const REVIEW: NewReview = { rating: 4, text: "", sweetness: null, acidity: null, body: null };

const wrapperFor = (client: QueryClient) => {
  const Wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

const renderSaveHook = (client: QueryClient) =>
  renderHook(() => useSaveReviewMutation(), { wrapper: wrapperFor(client) });

describe("useSaveReviewMutation", () => {
  let client: QueryClient;
  let invalidate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    client = createTestQueryClient();
    invalidate = vi.spyOn(client, "invalidateQueries");
  });

  it("sends the beer id and the review to the query function", async () => {
    (saveReview as Mock).mockResolvedValue(undefined);
    const { result } = renderSaveHook(client);

    await act(async () => {
      await result.current.saveReview({ beerId: 7, review: REVIEW });
    });

    expect(saveReview).toHaveBeenCalledTimes(1);
    expect((saveReview as Mock).mock.calls[0][0]).toEqual({ beerId: 7, review: REVIEW });
  });

  it("invalidates the beers and the reviews of this beer, then shows the success toast once", async () => {
    (saveReview as Mock).mockResolvedValue(undefined);
    const { result } = renderSaveHook(client);

    await act(async () => {
      await result.current.saveReview({ beerId: 7, review: REVIEW });
    });

    const keys = invalidate.mock.calls.map(([filters]: [{ queryKey: unknown }]) => filters.queryKey);
    expect(keys).toHaveLength(2);
    expect(keys).toEqual(expect.arrayContaining([beerKeys.all(), reviewKeys.list(7)]));
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith(i18n.t("pages.beerDetail.reviews.sheet.saved"));
    expect(i18n.t("pages.beerDetail.reviews.sheet.saved")).toBe("Avis enregistré");
  });

  it("reports saving while the request is in flight", async () => {
    let resolve!: () => void;
    (saveReview as Mock).mockReturnValue(new Promise<void>((res) => (resolve = res)));
    const { result } = renderSaveHook(client);
    expect(result.current.isSaving).toBe(false);

    let saving!: Promise<unknown>;
    act(() => {
      saving = result.current.saveReview({ beerId: 7, review: REVIEW });
    });
    await waitFor(() => expect(result.current.isSaving).toBe(true));

    await act(async () => {
      resolve();
      await saving;
    });
    await waitFor(() => expect(result.current.isSaving).toBe(false));
  });

  it("rethrows the failure without any toast, invalidation or success message", async () => {
    const failure = new Error("server down");
    (saveReview as Mock).mockRejectedValue(failure);
    const { result } = renderSaveHook(client);

    await act(async () => {
      await expect(result.current.saveReview({ beerId: 7, review: REVIEW })).rejects.toBe(failure);
    });

    expect(toast.danger).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
  });
});
