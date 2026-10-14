import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { createTestQueryClient } from "@/__tests__/utils/renderWithProviders";
import VenueService from "@/api/venues/venueService";
import { useVenueSearch } from "@/pages/map/hooks/useVenueSearch";
import { VENUE_SEARCH_DEBOUNCE_MS, VENUE_SEARCH_MAX_LENGTH } from "@/pages/map/utils/mapConstants";
import { VenueTypeEnum } from "@/types/enums/venue/venueTypeEnum";
import { EMPTY_VENUE_QUERY } from "@/types/mappers/venue/venueQueryMapper";
import type { VenueQuery } from "@/types/models/venue/venueQuery";
import { venueKeys } from "@/utils/queryKeys/venueQueryKeys";

vi.mock("@/api/venues/venueService", () => ({
  default: { getAll: vi.fn() },
}));

const VENUES = [{ id: 1, name: "Académie de la Bière" }];
const FILTERS: VenueQuery = {
  ...EMPTY_VENUE_QUERY,
  bounds: { north: 48.9, south: 48.8, east: 2.4, west: 2.2 },
  types: [VenueTypeEnum.BAR],
  confirmedOnly: true,
  position: { latitude: 48.85, longitude: 2.35 },
  radiusKm: 5,
};

const wrapperFor = (client: QueryClient) => {
  const Wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

const renderSearch = (filterQuery: VenueQuery = FILTERS, client: QueryClient = createTestQueryClient()) => {
  return renderHook(() => useVenueSearch(filterQuery), { wrapper: wrapperFor(client) });
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("useVenueSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exposes the search limits as constants", async () => {
    expect(VENUE_SEARCH_MAX_LENGTH).toBe(100);
    expect(VENUE_SEARCH_DEBOUNCE_MS).toBe(300);
  });

  it("is idle and sends nothing before the user types", async () => {
    const { result } = renderSearch();

    await act(async () => {
      await wait(VENUE_SEARCH_DEBOUNCE_MS + 50);
    });

    expect(result.current.isIdle).toBe(true);
    expect(result.current.isPending).toBe(false);
    expect(result.current.term).toBe("");
    expect(result.current.venues).toEqual([]);
    expect(VenueService.getAll).not.toHaveBeenCalled();
  });

  it.each(["   ", "\t "])("stays idle for a blank text (%j)", async (blank) => {
    const { result } = renderSearch();

    act(() => result.current.setSearchText(blank));
    await act(async () => {
      await wait(VENUE_SEARCH_DEBOUNCE_MS + 50);
    });

    expect(result.current.searchText).toBe(blank);
    expect(result.current.term).toBe("");
    expect(result.current.isIdle).toBe(true);
    expect(VenueService.getAll).not.toHaveBeenCalled();
  });

  it("waits for the pause, then searches with the trimmed text, the filters and no bounds", async () => {
    (VenueService.getAll as Mock).mockResolvedValue(VENUES);
    const { result } = renderSearch();

    act(() => result.current.setSearchText("  acad  "));

    expect(result.current.searchText).toBe("  acad  ");
    expect(result.current.term).toBe("");
    expect(VenueService.getAll).not.toHaveBeenCalled();

    await waitFor(() => expect(result.current.venues).toEqual(VENUES));

    expect(result.current.term).toBe("acad");
    expect(result.current.isIdle).toBe(false);
    expect(result.current.isPending).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(VenueService.getAll).toHaveBeenCalledTimes(1);
    expect(VenueService.getAll).toHaveBeenCalledWith({ ...FILTERS, bounds: null, q: "acad" });
  });

  it("reports pending while the request is in flight", async () => {
    (VenueService.getAll as Mock).mockImplementation(() => new Promise(() => undefined));
    const { result } = renderSearch();

    act(() => result.current.setSearchText("acad"));
    await waitFor(() => expect(VenueService.getAll).toHaveBeenCalledTimes(1));

    expect(result.current.isIdle).toBe(false);
    expect(result.current.isPending).toBe(true);
    expect(result.current.venues).toEqual([]);
  });

  it("sends only the last text when the user keeps typing", async () => {
    (VenueService.getAll as Mock).mockResolvedValue(VENUES);
    const { result } = renderSearch();
    const pause = VENUE_SEARCH_DEBOUNCE_MS;

    act(() => result.current.setSearchText("a"));
    await act(async () => {
      await wait(pause / 2);
    });
    act(() => result.current.setSearchText("ac"));
    await act(async () => {
      await wait(pause / 2);
    });
    act(() => result.current.setSearchText("acad"));
    await waitFor(() => expect(result.current.venues).toEqual(VENUES));

    expect(VenueService.getAll).toHaveBeenCalledTimes(1);
    expect(VenueService.getAll).toHaveBeenCalledWith({ ...FILTERS, bounds: null, q: "acad" });
  });

  it("caches the result under the venue list key of the search query", async () => {
    (VenueService.getAll as Mock).mockResolvedValue(VENUES);
    const client = createTestQueryClient();
    const { result } = renderSearch(FILTERS, client);

    act(() => result.current.setSearchText("acad"));
    await waitFor(() => expect(result.current.venues).toEqual(VENUES));

    expect(client.getQueryData(venueKeys.list({ ...FILTERS, bounds: null, q: "acad" }))).toEqual(VENUES);
  });

  it("returns to idle without a request when the text is cleared", async () => {
    (VenueService.getAll as Mock).mockResolvedValue(VENUES);
    const { result } = renderSearch();

    act(() => result.current.setSearchText("acad"));
    await waitFor(() => expect(result.current.venues).toEqual(VENUES));
    act(() => result.current.setSearchText(""));
    await waitFor(() => expect(result.current.isIdle).toBe(true));

    expect(result.current.venues).toEqual([]);
    expect(VenueService.getAll).toHaveBeenCalledTimes(1);
  });

  it("flags the error and searches again on refetch", async () => {
    (VenueService.getAll as Mock).mockRejectedValueOnce(new Error("server down")).mockResolvedValue(VENUES);
    const { result } = renderSearch();

    act(() => result.current.setSearchText("acad"));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.isIdle).toBe(false);
    await act(async () => {
      await result.current.refetch();
    });
    await waitFor(() => expect(result.current.venues).toEqual(VENUES));

    expect(result.current.isError).toBe(false);
    expect(VenueService.getAll).toHaveBeenCalledTimes(2);
  });

  it("keeps the text typed while the filters change, and searches again with the new filters", async () => {
    (VenueService.getAll as Mock).mockResolvedValue(VENUES);
    const { result, rerender } = renderHook(({ filters }: { filters: VenueQuery }) => useVenueSearch(filters), {
      wrapper: wrapperFor(createTestQueryClient()),
      initialProps: { filters: FILTERS },
    });

    act(() => result.current.setSearchText("acad"));
    await waitFor(() => expect(result.current.venues).toEqual(VENUES));
    rerender({ filters: { ...FILTERS, confirmedOnly: false } });
    await waitFor(() => expect(VenueService.getAll).toHaveBeenCalledTimes(2));

    expect(result.current.searchText).toBe("acad");
    expect(VenueService.getAll).toHaveBeenLastCalledWith({ ...FILTERS, confirmedOnly: false, bounds: null, q: "acad" });
  });
});
