import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { toast } from "@heroui/react";
import { createTestQueryClient } from "@/__tests__/utils/renderWithProviders";
import { useUpdateCheckinMutation } from "@/components/modules/checkinSheet/hooks/useUpdateCheckinMutation";
import type { Checkin } from "@/types/models/checkin/checkin";
import { updateCheckin } from "@/utils/queryFunctions/checkinQueryFunctions";
import { badgeKeys } from "@/utils/queryKeys/badgeQueryKeys";
import { beerKeys } from "@/utils/queryKeys/beerQueryKeys";
import { checkinKeys } from "@/utils/queryKeys/checkinQueryKeys";
import { dexKeys } from "@/utils/queryKeys/dexQueryKeys";
import { feedKeys } from "@/utils/queryKeys/feedQueryKeys";
import { statsKeys } from "@/utils/queryKeys/statsQueryKeys";
import { venueKeys } from "@/utils/queryKeys/venueQueryKeys";

vi.mock("@heroui/react", () => ({
  toast: { success: vi.fn(), danger: vi.fn() },
}));

vi.mock("@/utils/queryFunctions/checkinQueryFunctions", () => ({
  updateCheckin: vi.fn(),
}));

const UPDATED: Checkin = {
  id: 11,
  beerId: 7,
  beerName: "Orval",
  drankAt: "2026-10-12T12:00:00.000Z",
  place: "Chez Paul",
  rating: 4,
  aromas: [],
  format: null,
  price: null,
  comment: "",
  photoId: null,
  venueId: null,
};

const REQUEST = { checkinId: 11, changes: { rating: 4 } };

const wrapperFor = (client: QueryClient) => {
  const Wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

describe("useUpdateCheckinMutation", () => {
  let client: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = createTestQueryClient();
  });

  it("sends the id and the changes to the query function and hands back the updated checkin", async () => {
    (updateCheckin as Mock).mockResolvedValue(UPDATED);
    const { result } = renderHook(() => useUpdateCheckinMutation(), { wrapper: wrapperFor(client) });

    let answer: Checkin | undefined;
    await act(async () => {
      answer = await result.current.updateCheckin(REQUEST);
    });

    expect(updateCheckin).toHaveBeenCalledTimes(1);
    expect((updateCheckin as Mock).mock.calls[0][0]).toEqual(REQUEST);
    expect(answer).toEqual(UPDATED);
  });

  it("reports updating while the request is in flight and not before or after", async () => {
    const pending = deferred<Checkin>();
    (updateCheckin as Mock).mockReturnValue(pending.promise);
    const { result } = renderHook(() => useUpdateCheckinMutation(), { wrapper: wrapperFor(client) });
    expect(result.current.isUpdating).toBe(false);

    let updating: Promise<Checkin> | undefined;
    act(() => {
      updating = result.current.updateCheckin(REQUEST);
    });

    await waitFor(() => expect(result.current.isUpdating).toBe(true));

    await act(async () => {
      pending.resolve(UPDATED);
      await updating;
    });

    await waitFor(() => expect(result.current.isUpdating).toBe(false));
  });

  it("refreshes the checkins, the beers, the dex, the venues, the stats, the feed and the badges", async () => {
    (updateCheckin as Mock).mockResolvedValue(UPDATED);
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useUpdateCheckinMutation(), { wrapper: wrapperFor(client) });

    await act(async () => {
      await result.current.updateCheckin(REQUEST);
    });

    expect(invalidate).toHaveBeenCalledTimes(7);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: checkinKeys.all() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: beerKeys.all() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: dexKeys.all() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: venueKeys.all() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: statsKeys.all() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: feedKeys.all() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: badgeKeys.all() });
  });

  it("toasts the success once", async () => {
    (updateCheckin as Mock).mockResolvedValue(UPDATED);
    const { result } = renderHook(() => useUpdateCheckinMutation(), { wrapper: wrapperFor(client) });

    await act(async () => {
      await result.current.updateCheckin(REQUEST);
    });

    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith("Dégustation modifiée.");
  });

  it("rejects without invalidating or toasting anything when the request fails", async () => {
    (updateCheckin as Mock).mockRejectedValue(new Error("boom"));
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useUpdateCheckinMutation(), { wrapper: wrapperFor(client) });

    await act(async () => {
      await expect(result.current.updateCheckin(REQUEST)).rejects.toThrow("boom");
    });

    expect(invalidate).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.danger).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.isUpdating).toBe(false));
  });
});
