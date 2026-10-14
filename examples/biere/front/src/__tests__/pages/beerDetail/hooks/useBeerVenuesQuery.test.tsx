import type { QueryClient, QueryObserverOptions } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { createTestQueryClient } from "@/__tests__/utils/renderWithProviders";
import { useBeerVenuesQuery } from "@/pages/beerDetail/hooks/useBeerVenuesQuery";
import VenueService from "@/api/venues/venueService";
import { queryTimes } from "@/config/tanstackQuery";
import { venueKeys } from "@/utils/queryKeys/venueQueryKeys";

vi.mock("@/api/venues/venueService", () => ({
  default: { getForBeer: vi.fn() },
}));

const VENUES = [{ venueId: 12, venueName: "Le Trappiste" }];
const OTHER_VENUES = [{ venueId: 13, venueName: "La Cave" }];

const wrapperFor = (client: QueryClient) => {
  const Wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

describe("useBeerVenuesQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches the venues of the beer and exposes them", async () => {
    (VenueService.getForBeer as Mock).mockResolvedValue(VENUES);

    const { result } = renderHook(() => useBeerVenuesQuery(7), { wrapper: wrapperFor(createTestQueryClient()) });

    expect(result.current.isPending).toBe(true);
    expect(result.current.venues).toEqual([]);
    await waitFor(() => expect(result.current.venues).toEqual(VENUES));
    expect(result.current.isPending).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(VenueService.getForBeer).toHaveBeenCalledTimes(1);
    expect(VenueService.getForBeer).toHaveBeenCalledWith(7);
  });

  it("flags the error when the request fails", async () => {
    (VenueService.getForBeer as Mock).mockRejectedValue(new Error("server down"));

    const { result } = renderHook(() => useBeerVenuesQuery(7), { wrapper: wrapperFor(createTestQueryClient()) });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.venues).toEqual([]);
  });

  it("refetches on demand and recovers after an error", async () => {
    (VenueService.getForBeer as Mock).mockRejectedValueOnce(new Error("server down")).mockResolvedValue(VENUES);

    const { result } = renderHook(() => useBeerVenuesQuery(7), { wrapper: wrapperFor(createTestQueryClient()) });
    await waitFor(() => expect(result.current.isError).toBe(true));

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => expect(result.current.venues).toEqual(VENUES));
    expect(result.current.isError).toBe(false);
    expect(VenueService.getForBeer).toHaveBeenCalledTimes(2);
  });

  it("caches per beer under venueKeys.forBeer with the long stale and gc times", async () => {
    (VenueService.getForBeer as Mock).mockImplementation(async (beerId: number) => (beerId === 7 ? VENUES : OTHER_VENUES));
    const client = createTestQueryClient();

    const first = renderHook(() => useBeerVenuesQuery(7), { wrapper: wrapperFor(client) });
    const second = renderHook(() => useBeerVenuesQuery(8), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(first.result.current.venues).toEqual(VENUES));
    await waitFor(() => expect(second.result.current.venues).toEqual(OTHER_VENUES));

    expect(client.getQueryData(venueKeys.forBeer(7))).toEqual(VENUES);
    expect(client.getQueryData(venueKeys.forBeer(8))).toEqual(OTHER_VENUES);
    expect(venueKeys.forBeer(7)).not.toEqual(venueKeys.forBeer(8));
    const options = client.getQueryCache().find({ queryKey: venueKeys.forBeer(7) })?.options as QueryObserverOptions | undefined;
    expect(options?.staleTime).toBe(queryTimes.long.staleTime);
    expect(options?.gcTime).toBe(queryTimes.long.gcTime);
  });

  it("keeps the forBeer key under the venues root and apart from the list and beers keys", () => {
    expect(venueKeys.forBeer(7).slice(0, venueKeys.all().length)).toEqual(venueKeys.all());
    expect(venueKeys.forBeer(7)).not.toEqual(venueKeys.beers(7));
  });
});
