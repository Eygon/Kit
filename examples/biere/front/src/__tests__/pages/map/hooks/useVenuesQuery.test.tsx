import type { QueryClient, QueryObserverOptions } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { createTestQueryClient } from "@/__tests__/utils/renderWithProviders";
import VenueService from "@/api/venues/venueService";
import { queryTimes } from "@/config/tanstackQuery";
import { EMPTY_VENUE_QUERY } from "@/types/mappers/venue/venueQueryMapper";
import type { VenueQuery } from "@/types/models/venue/venueQuery";
import { venueKeys } from "@/utils/queryKeys/venueQueryKeys";
import { useVenuesQuery } from "@/pages/map/hooks/useVenuesQuery";

vi.mock("@/api/venues/venueService", () => ({
  default: { getAll: vi.fn() },
}));

const VENUES = [{ id: 1, name: "Le Trappiste" }];
const OTHER_VENUES = [{ id: 2, name: "La Cave" }];

const wrapperFor = (client: QueryClient) => {
  const Wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

describe("useVenuesQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches the venues of the query and exposes them", async () => {
    (VenueService.getAll as Mock).mockResolvedValue(VENUES);

    const { result } = renderHook(() => useVenuesQuery(EMPTY_VENUE_QUERY), { wrapper: wrapperFor(createTestQueryClient()) });

    expect(result.current.isPending).toBe(true);
    expect(result.current.venues).toEqual([]);
    await waitFor(() => expect(result.current.venues).toEqual(VENUES));
    expect(result.current.isPending).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(VenueService.getAll).toHaveBeenCalledTimes(1);
    expect(VenueService.getAll).toHaveBeenCalledWith(EMPTY_VENUE_QUERY);
  });

  it("flags the error when the request rejects", async () => {
    (VenueService.getAll as Mock).mockRejectedValue(new Error("server down"));

    const { result } = renderHook(() => useVenuesQuery(EMPTY_VENUE_QUERY), { wrapper: wrapperFor(createTestQueryClient()) });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.venues).toEqual([]);
  });

  it("refetches the same query when refetch is called", async () => {
    (VenueService.getAll as Mock).mockResolvedValueOnce(VENUES).mockResolvedValueOnce(OTHER_VENUES);

    const { result } = renderHook(() => useVenuesQuery(EMPTY_VENUE_QUERY), { wrapper: wrapperFor(createTestQueryClient()) });
    await waitFor(() => expect(result.current.venues).toEqual(VENUES));

    await act(async () => {
      await result.current.refetch();
    });

    expect(VenueService.getAll).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(result.current.venues).toEqual(OTHER_VENUES));
  });

  it("caches under venueKeys.list(query) with the long stale and gc times", async () => {
    (VenueService.getAll as Mock).mockResolvedValue(VENUES);
    const client = createTestQueryClient();

    const { result } = renderHook(() => useVenuesQuery(EMPTY_VENUE_QUERY), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(result.current.venues).toEqual(VENUES));

    expect(client.getQueryData(venueKeys.list(EMPTY_VENUE_QUERY))).toEqual(VENUES);
    const options = client.getQueryCache().find({ queryKey: venueKeys.list(EMPTY_VENUE_QUERY) })?.options as
      | QueryObserverOptions
      | undefined;
    expect(options?.staleTime).toBe(queryTimes.long.staleTime);
    expect(options?.gcTime).toBe(queryTimes.long.gcTime);
  });

  it("keeps the previous venues on screen while a new query loads", async () => {
    let resolveSecond: (venues: unknown[]) => void = () => undefined;
    (VenueService.getAll as Mock)
      .mockResolvedValueOnce(VENUES)
      .mockImplementationOnce(() => new Promise((resolve) => (resolveSecond = resolve)));

    const { result, rerender } = renderHook(({ query }: { query: VenueQuery }) => useVenuesQuery(query), {
      wrapper: wrapperFor(createTestQueryClient()),
      initialProps: { query: EMPTY_VENUE_QUERY },
    });
    await waitFor(() => expect(result.current.venues).toEqual(VENUES));

    rerender({ query: { ...EMPTY_VENUE_QUERY, confirmedOnly: true } });

    await waitFor(() => expect(VenueService.getAll).toHaveBeenCalledTimes(2));
    expect(result.current.venues).toEqual(VENUES);
    expect(result.current.isPending).toBe(false);

    await act(async () => {
      resolveSecond(OTHER_VENUES);
    });
    await waitFor(() => expect(result.current.venues).toEqual(OTHER_VENUES));
  });
});
