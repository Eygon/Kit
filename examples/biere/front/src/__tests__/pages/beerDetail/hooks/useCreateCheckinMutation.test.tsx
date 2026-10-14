import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { toast } from "@heroui/react";
import { createTestQueryClient } from "@/__tests__/utils/renderWithProviders";
import { useCreateCheckinMutation } from "@/pages/beerDetail/hooks/useCreateCheckinMutation";
import type { CreatedCheckin } from "@/types/models/checkin/createdCheckin";
import type { NewCheckin } from "@/types/models/checkin/newCheckin";
import { createCheckin } from "@/utils/queryFunctions/checkinQueryFunctions";
import { beerKeys } from "@/utils/queryKeys/beerQueryKeys";
import { checkinKeys } from "@/utils/queryKeys/checkinQueryKeys";
import { dexKeys } from "@/utils/queryKeys/dexQueryKeys";
import { venueKeys } from "@/utils/queryKeys/venueQueryKeys";

vi.mock("@heroui/react", () => ({
  toast: { success: vi.fn(), danger: vi.fn() },
}));

vi.mock("@/utils/queryFunctions/checkinQueryFunctions", () => ({
  createCheckin: vi.fn(),
}));

const NEW_CHECKIN: NewCheckin = {
  beerId: 7,
  drankAt: "2026-10-12T12:00:00.000Z",
  place: "Chez Paul",
  format: "bottle",
  rating: null,
  aromas: [],
  price: null,
  comment: "",
};

const created = (isFirstDiscovery: boolean): CreatedCheckin => ({
  checkin: {
    id: 11,
    beerId: 7,
    beerName: "Orval",
    drankAt: "2026-10-12T12:00:00.000Z",
    place: "Chez Paul",
    rating: null,
    aromas: [],
    format: null,
    price: null,
    comment: "",
    photoId: null,
  },
  isFirstDiscovery,
});

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

describe("useCreateCheckinMutation", () => {
  let client: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = createTestQueryClient();
  });

  it("sends the new checkin to the query function and hands back the created checkin", async () => {
    (createCheckin as Mock).mockResolvedValue(created(false));
    const { result } = renderHook(() => useCreateCheckinMutation(), { wrapper: wrapperFor(client) });

    let answer: CreatedCheckin | undefined;
    await act(async () => {
      answer = await result.current.saveCheckin(NEW_CHECKIN);
    });

    expect(createCheckin).toHaveBeenCalledTimes(1);
    expect((createCheckin as Mock).mock.calls[0][0]).toEqual(NEW_CHECKIN);
    expect(answer).toEqual(created(false));
  });

  it("reports saving while the request is in flight and not before or after", async () => {
    const pending = deferred<CreatedCheckin>();
    (createCheckin as Mock).mockReturnValue(pending.promise);
    const { result } = renderHook(() => useCreateCheckinMutation(), { wrapper: wrapperFor(client) });
    expect(result.current.isSaving).toBe(false);

    let saving: Promise<CreatedCheckin> | undefined;
    act(() => {
      saving = result.current.saveCheckin(NEW_CHECKIN);
    });

    await waitFor(() => expect(result.current.isSaving).toBe(true));

    await act(async () => {
      pending.resolve(created(false));
      await saving;
    });

    await waitFor(() => expect(result.current.isSaving).toBe(false));
  });

  it.each([true, false])("invalidates the beers, the dex, the checkins and the venues when first discovery is %s", async (isFirstDiscovery) => {
    (createCheckin as Mock).mockResolvedValue(created(isFirstDiscovery));
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useCreateCheckinMutation(), { wrapper: wrapperFor(client) });

    await act(async () => {
      await result.current.saveCheckin(NEW_CHECKIN);
    });

    expect(invalidate).toHaveBeenCalledTimes(4);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: beerKeys.all() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: dexKeys.all() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: checkinKeys.all() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: venueKeys.all() });
  });

  it("toasts the success when it is not the first discovery", async () => {
    (createCheckin as Mock).mockResolvedValue(created(false));
    const { result } = renderHook(() => useCreateCheckinMutation(), { wrapper: wrapperFor(client) });

    await act(async () => {
      await result.current.saveCheckin(NEW_CHECKIN);
    });

    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith("Dégustation enregistrée.");
  });

  it("shows no success toast on a first discovery, the sheet celebrates instead", async () => {
    (createCheckin as Mock).mockResolvedValue(created(true));
    const { result } = renderHook(() => useCreateCheckinMutation(), { wrapper: wrapperFor(client) });

    await act(async () => {
      await result.current.saveCheckin(NEW_CHECKIN);
    });

    expect(toast.success).not.toHaveBeenCalled();
  });

  it("rejects without invalidating or toasting a success when the request fails", async () => {
    (createCheckin as Mock).mockRejectedValue(new Error("boom"));
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useCreateCheckinMutation(), { wrapper: wrapperFor(client) });

    await act(async () => {
      await expect(result.current.saveCheckin(NEW_CHECKIN)).rejects.toThrow("boom");
    });

    expect(invalidate).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.danger).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.isSaving).toBe(false));
  });

  it("refreshes the beers, the dex, the checkins and the venues when the request times out, as the write may have landed", async () => {
    (createCheckin as Mock).mockRejectedValue(new DOMException("signal timed out", "TimeoutError"));
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useCreateCheckinMutation(), { wrapper: wrapperFor(client) });

    await act(async () => {
      await expect(result.current.saveCheckin(NEW_CHECKIN)).rejects.toThrow("signal timed out");
    });

    expect(invalidate).toHaveBeenCalledTimes(4);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: beerKeys.all() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: dexKeys.all() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: checkinKeys.all() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: venueKeys.all() });
    expect(toast.success).not.toHaveBeenCalled();
  });
});
