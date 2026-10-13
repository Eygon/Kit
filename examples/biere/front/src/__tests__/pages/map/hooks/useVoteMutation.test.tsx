import { toast } from "@heroui/react";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { HttpError } from "@/api/httpError";
import { createTestQueryClient } from "@/__tests__/utils/renderWithProviders";
import { useVoteMutation } from "@/pages/map/hooks/useVoteMutation";
import { AvailabilityStatusEnum } from "@/types/enums/venue/availabilityStatusEnum";
import { VoteSenseEnum } from "@/types/enums/venue/voteSenseEnum";
import type { VenueBeer } from "@/types/models/venue/venueBeer";
import { voteVenueBeer } from "@/utils/queryFunctions/venueQueryFunctions";
import { venueKeys } from "@/utils/queryKeys/venueQueryKeys";

vi.mock("@heroui/react", () => ({
  toast: { success: vi.fn(), danger: vi.fn() },
}));

vi.mock("@/utils/queryFunctions/venueQueryFunctions", () => ({
  voteVenueBeer: vi.fn(),
}));

const beer = (beerId: number, overrides: Partial<VenueBeer> = {}): VenueBeer => ({
  beerId,
  beerName: `Bière ${beerId}`,
  breweryName: `Brasserie ${beerId}`,
  styleName: "Style",
  family: null,
  status: AvailabilityStatusEnum.MAYBE_GONE,
  lastConfirmedAt: null,
  recentVoterCount: 0,
  nextVoteAt: null,
  ...overrides,
});

const VOTED = beer(7, {
  status: AvailabilityStatusEnum.CONFIRMED,
  lastConfirmedAt: new Date("2026-10-13T10:00:00.000Z"),
  recentVoterCount: 6,
  nextVoteAt: new Date("2026-10-14T10:00:00.000Z"),
});

const wrapperFor = (client: QueryClient) => {
  const Wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

const setup = () => {
  const client = createTestQueryClient();
  client.setQueryData(venueKeys.beers(12), [beer(6), beer(7), beer(8)]);
  client.setQueryData(venueKeys.beers(99), [beer(7)]);
  const invalidate = vi.spyOn(client, "invalidateQueries");
  const hook = renderHook(() => useVoteMutation(12), { wrapper: wrapperFor(client) });
  return { client, invalidate, hook };
};

describe("useVoteMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("votes for the beer of the venue it is given with the pressed sense", async () => {
    (voteVenueBeer as Mock).mockResolvedValue(VOTED);
    const { hook } = setup();

    act(() => hook.result.current.mutate({ beerId: 7, sense: VoteSenseEnum.GONE }));

    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    expect(voteVenueBeer).toHaveBeenCalledTimes(1);
    expect(voteVenueBeer).toHaveBeenCalledWith(12, 7, VoteSenseEnum.GONE);
  });

  it("AC3 replaces only the voted beer with the response, keeps the order and the other venues", async () => {
    (voteVenueBeer as Mock).mockResolvedValue(VOTED);
    const { client, hook } = setup();

    act(() => hook.result.current.mutate({ beerId: 7, sense: VoteSenseEnum.STILL }));

    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    expect(client.getQueryData(venueKeys.beers(12))).toEqual([beer(6), VOTED, beer(8)]);
    expect(client.getQueryData(venueKeys.beers(99))).toEqual([beer(7)]);
  });

  it("AC3 invalidates the venue lists for the marker state and shows one Vote enregistré toast", async () => {
    (voteVenueBeer as Mock).mockResolvedValue(VOTED);
    const { invalidate, hook } = setup();

    act(() => hook.result.current.mutate({ beerId: 7, sense: VoteSenseEnum.STILL }));

    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: venueKeys.lists() });
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: venueKeys.beers(12) });
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith("Vote enregistré");
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("does not create a beers entry when the venue beers were never loaded", async () => {
    (voteVenueBeer as Mock).mockResolvedValue(VOTED);
    const client = createTestQueryClient();
    const { result } = renderHook(() => useVoteMutation(12), { wrapper: wrapperFor(client) });

    act(() => result.current.mutate({ beerId: 7, sense: VoteSenseEnum.STILL }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(client.getQueryData(venueKeys.beers(12))).toBeUndefined();
  });

  it("AC5 on a 409 reloads the beers of the venue, keeps the cache until then and adds no toast", async () => {
    (voteVenueBeer as Mock).mockRejectedValue(new HttpError(409, "Conflict"));
    const { client, invalidate, hook } = setup();

    act(() => hook.result.current.mutate({ beerId: 7, sense: VoteSenseEnum.STILL }));

    await waitFor(() => expect(hook.result.current.isError).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: venueKeys.beers(12) });
    expect(client.getQueryData(venueKeys.beers(12))).toEqual([beer(6), beer(7), beer(8)]);
    expect(toast.danger).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it.each([400, 404, 500])("AC6 on status %s keeps the previous state, reloads nothing and adds no toast", async (status) => {
    (voteVenueBeer as Mock).mockRejectedValue(new HttpError(status, "boom"));
    const { client, invalidate, hook } = setup();

    act(() => hook.result.current.mutate({ beerId: 7, sense: VoteSenseEnum.STILL }));

    await waitFor(() => expect(hook.result.current.isError).toBe(true));
    expect(client.getQueryData(venueKeys.beers(12))).toEqual([beer(6), beer(7), beer(8)]);
    expect(invalidate).not.toHaveBeenCalled();
    expect(toast.danger).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("AC6 on a network failure keeps the previous state and reloads nothing", async () => {
    (voteVenueBeer as Mock).mockRejectedValue(new TypeError("Failed to fetch"));
    const { client, invalidate, hook } = setup();

    act(() => hook.result.current.mutate({ beerId: 7, sense: VoteSenseEnum.GONE }));

    await waitFor(() => expect(hook.result.current.isError).toBe(true));
    expect(client.getQueryData(venueKeys.beers(12))).toEqual([beer(6), beer(7), beer(8)]);
    expect(invalidate).not.toHaveBeenCalled();
  });
});
