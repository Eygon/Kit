import { toast } from "@heroui/react";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { createTestQueryClient } from "@/__tests__/utils/renderWithProviders";
import { useDeleteCheckinMutation } from "@/pages/journal/hooks/useDeleteCheckinMutation";
import i18n from "@/i18n/i18n";
import { deleteCheckin } from "@/utils/queryFunctions/checkinQueryFunctions";
import { beerKeys } from "@/utils/queryKeys/beerQueryKeys";
import { checkinKeys } from "@/utils/queryKeys/checkinQueryKeys";
import { dexKeys } from "@/utils/queryKeys/dexQueryKeys";
import { venueKeys } from "@/utils/queryKeys/venueQueryKeys";

vi.mock("@heroui/react", () => ({
  toast: { success: vi.fn(), danger: vi.fn() },
}));

vi.mock("@/utils/queryFunctions/checkinQueryFunctions", () => ({
  deleteCheckin: vi.fn(),
}));

const wrapperFor = (client: QueryClient) => {
  const Wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

const renderDeleteHook = (client: QueryClient) =>
  renderHook(() => useDeleteCheckinMutation(), { wrapper: wrapperFor(client) });

describe("useDeleteCheckinMutation", () => {
  let client: QueryClient;
  let invalidate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    client = createTestQueryClient();
    invalidate = vi.spyOn(client, "invalidateQueries");
  });

  it("sends the checkin id to the query function", async () => {
    (deleteCheckin as Mock).mockResolvedValue(undefined);
    const { result } = renderDeleteHook(client);

    await act(async () => {
      await result.current.removeCheckin(11);
    });

    expect(deleteCheckin).toHaveBeenCalledTimes(1);
    expect((deleteCheckin as Mock).mock.calls[0][0]).toBe(11);
  });

  it("invalidates the checkins, the beers, the dex and the venues, then shows the success toast once", async () => {
    (deleteCheckin as Mock).mockResolvedValue(undefined);
    const { result } = renderDeleteHook(client);

    await act(async () => {
      await result.current.removeCheckin(11);
    });

    const keys = invalidate.mock.calls.map(([filters]: [{ queryKey: unknown }]) => filters.queryKey);
    expect(keys).toHaveLength(4);
    expect(keys).toEqual(expect.arrayContaining([checkinKeys.all(), beerKeys.all(), dexKeys.all(), venueKeys.all()]));
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith(i18n.t("pages.journal.delete.done"));
    expect(i18n.t("pages.journal.delete.done")).toBe("Dégustation supprimée.");
  });

  it("reports pending while the request is in flight", async () => {
    let resolve!: () => void;
    (deleteCheckin as Mock).mockReturnValue(new Promise<void>((res) => (resolve = res)));
    const { result } = renderDeleteHook(client);
    expect(result.current.isRemoving).toBe(false);

    let removal!: Promise<unknown>;
    act(() => {
      removal = result.current.removeCheckin(11);
    });
    await waitFor(() => expect(result.current.isRemoving).toBe(true));

    await act(async () => {
      resolve();
      await removal;
    });
    await waitFor(() => expect(result.current.isRemoving).toBe(false));
  });

  it("rethrows the failure without any toast, invalidation or success message", async () => {
    const failure = new Error("server down");
    (deleteCheckin as Mock).mockRejectedValue(failure);
    const { result } = renderDeleteHook(client);

    await act(async () => {
      await expect(result.current.removeCheckin(11)).rejects.toBe(failure);
    });

    expect(toast.danger).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
  });
});
