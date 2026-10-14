import { toast } from "@heroui/react";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { HttpError } from "@/api/httpError";
import { createTestQueryClient } from "@/__tests__/utils/renderWithProviders";
import { useReportBeerMutation } from "@/pages/map/hooks/useReportBeerMutation";
import { AvailabilityStatusEnum } from "@/types/enums/venue/availabilityStatusEnum";
import type { VenueBeer } from "@/types/models/venue/venueBeer";
import { reportVenueBeer } from "@/utils/queryFunctions/venueQueryFunctions";
import { venueKeys } from "@/utils/queryKeys/venueQueryKeys";

vi.mock("@heroui/react", () => ({
  toast: { success: vi.fn(), danger: vi.fn() },
}));

vi.mock("@/utils/queryFunctions/venueQueryFunctions", () => ({
  reportVenueBeer: vi.fn(),
}));

const CREATED: VenueBeer = {
  beerId: 7,
  beerName: "Orval",
  breweryName: "Orval",
  styleName: "Trappiste",
  family: null,
  status: AvailabilityStatusEnum.UNKNOWN,
  lastConfirmedAt: null,
  recentVoterCount: 0,
  nextVoteAt: null,
  drunk: false,
  checkinCount: 0,
  lastCheckinAt: null,
};

const wrapperFor = (client: QueryClient) => {
  const Wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

const setup = () => {
  const client = createTestQueryClient();
  client.setQueryData(venueKeys.beers(12), [{ ...CREATED, beerId: 6 }]);
  const invalidate = vi.spyOn(client, "invalidateQueries");
  const hook = renderHook(() => useReportBeerMutation(12), { wrapper: wrapperFor(client) });
  return { client, invalidate, hook };
};

describe("useReportBeerMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reports the beer for the venue it is given", async () => {
    (reportVenueBeer as Mock).mockResolvedValue(CREATED);
    const { hook } = setup();

    act(() => hook.result.current.mutate(7));

    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    expect(reportVenueBeer).toHaveBeenCalledTimes(1);
    expect(reportVenueBeer).toHaveBeenCalledWith(12, 7);
  });

  it("AC1 reloads the beers of that venue only and shows one Bière signalée toast", async () => {
    (reportVenueBeer as Mock).mockResolvedValue(CREATED);
    const { invalidate, hook } = setup();

    act(() => hook.result.current.mutate(7));

    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: venueKeys.beers(12) });
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith("Bière signalée");
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("AC2 on a 409 reloads the beers of the venue and adds no toast of its own", async () => {
    (reportVenueBeer as Mock).mockRejectedValue(new HttpError(409, "Conflict"));
    const { client, invalidate, hook } = setup();

    act(() => hook.result.current.mutate(7));

    await waitFor(() => expect(hook.result.current.isError).toBe(true));
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: venueKeys.beers(12) });
    expect(client.getQueryData(venueKeys.beers(12))).toEqual([{ ...CREATED, beerId: 6 }]);
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it.each([400, 404, 500])("on status %s reloads nothing and adds no toast", async (status) => {
    (reportVenueBeer as Mock).mockRejectedValue(new HttpError(status, "boom"));
    const { invalidate, hook } = setup();

    act(() => hook.result.current.mutate(7));

    await waitFor(() => expect(hook.result.current.isError).toBe(true));
    expect(invalidate).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("on a network failure reloads nothing and adds no toast", async () => {
    (reportVenueBeer as Mock).mockRejectedValue(new TypeError("Failed to fetch"));
    const { invalidate, hook } = setup();

    act(() => hook.result.current.mutate(7));

    await waitFor(() => expect(hook.result.current.isError).toBe(true));
    expect(invalidate).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });
});
