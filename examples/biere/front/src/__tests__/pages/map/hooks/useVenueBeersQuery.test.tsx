import type { QueryClient, QueryObserverOptions } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { createTestQueryClient } from "@/__tests__/utils/renderWithProviders";
import { useVenueBeersQuery } from "@/pages/map/hooks/useVenueBeersQuery";
import VenueService from "@/api/venues/venueService";
import { queryTimes } from "@/config/tanstackQuery";
import { venueKeys } from "@/utils/queryKeys/venueQueryKeys";

vi.mock("@/api/venues/venueService", () => ({
  default: { getBeers: vi.fn() },
}));

const BEERS = [{ beerId: 7, beerName: "Houblon Chouffe" }];
const OTHER_BEERS = [{ beerId: 8, beerName: "Orval" }];

const wrapperFor = (client: QueryClient) => {
  const Wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

describe("useVenueBeersQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches the beers of the venue and exposes them", async () => {
    (VenueService.getBeers as Mock).mockResolvedValue(BEERS);

    const { result } = renderHook(() => useVenueBeersQuery(12), { wrapper: wrapperFor(createTestQueryClient()) });

    expect(result.current.isPending).toBe(true);
    expect(result.current.beers).toEqual([]);
    await waitFor(() => expect(result.current.beers).toEqual(BEERS));
    expect(result.current.isPending).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(VenueService.getBeers).toHaveBeenCalledTimes(1);
    expect(VenueService.getBeers).toHaveBeenCalledWith(12);
  });

  it("does not fetch while the venue id is null", async () => {
    const { result } = renderHook(() => useVenueBeersQuery(null), { wrapper: wrapperFor(createTestQueryClient()) });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(VenueService.getBeers).not.toHaveBeenCalled();
    expect(result.current.beers).toEqual([]);
  });

  it("flags the error when the request rejects", async () => {
    (VenueService.getBeers as Mock).mockRejectedValue(new Error("server down"));

    const { result } = renderHook(() => useVenueBeersQuery(12), { wrapper: wrapperFor(createTestQueryClient()) });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.beers).toEqual([]);
  });

  it("refetches the same venue when refetch is called", async () => {
    (VenueService.getBeers as Mock).mockResolvedValueOnce(BEERS).mockResolvedValueOnce(OTHER_BEERS);

    const { result } = renderHook(() => useVenueBeersQuery(12), { wrapper: wrapperFor(createTestQueryClient()) });
    await waitFor(() => expect(result.current.beers).toEqual(BEERS));

    await act(async () => {
      await result.current.refetch();
    });

    expect(VenueService.getBeers).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(result.current.beers).toEqual(OTHER_BEERS));
  });

  it("caches under venueKeys.beers(venueId) with the long stale and gc times", async () => {
    (VenueService.getBeers as Mock).mockResolvedValue(BEERS);
    const client = createTestQueryClient();

    const { result } = renderHook(() => useVenueBeersQuery(12), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(result.current.beers).toEqual(BEERS));

    expect(client.getQueryData(venueKeys.beers(12))).toEqual(BEERS);
    const options = client.getQueryCache().find({ queryKey: venueKeys.beers(12) })?.options as
      | QueryObserverOptions
      | undefined;
    expect(options?.staleTime).toBe(queryTimes.long.staleTime);
    expect(options?.gcTime).toBe(queryTimes.long.gcTime);
  });

  it("shows the loading state again for another venue instead of the previous beers", async () => {
    (VenueService.getBeers as Mock)
      .mockResolvedValueOnce(BEERS)
      .mockImplementationOnce(() => new Promise(() => undefined));

    const { result, rerender } = renderHook(({ venueId }: { venueId: number }) => useVenueBeersQuery(venueId), {
      wrapper: wrapperFor(createTestQueryClient()),
      initialProps: { venueId: 12 },
    });
    await waitFor(() => expect(result.current.beers).toEqual(BEERS));

    rerender({ venueId: 13 });

    await waitFor(() => expect(VenueService.getBeers).toHaveBeenCalledWith(13));
    expect(result.current.isPending).toBe(true);
    expect(result.current.beers).toEqual([]);
  });
});
