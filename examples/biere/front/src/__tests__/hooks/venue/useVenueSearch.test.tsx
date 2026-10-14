import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { createTestQueryClient } from "@/__tests__/utils/renderWithProviders";
import VenueService from "@/api/venues/venueService";
import { VENUE_SEARCH_DEBOUNCE_MS, VENUE_SEARCH_MAX_LENGTH } from "@/constants/venueSearchConstants";
import { useVenueSearch } from "@/hooks/venue/useVenueSearch";
import * as mapConstants from "@/pages/map/utils/mapConstants";
import { VenueTypeEnum } from "@/types/enums/venue/venueTypeEnum";
import { EMPTY_VENUE_QUERY } from "@/types/mappers/venue/venueQueryMapper";
import type { VenueQuery } from "@/types/models/venue/venueQuery";
import { venueKeys } from "@/utils/queryKeys/venueQueryKeys";


vi.mock("@/api/venues/venueService", () => ({
  default: { search: vi.fn() },
}));

const VENUES = [{ id: 1, name: "Académie de la Bière" }];
const RESULT = { venues: VENUES, isApproximate: false };
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

const SOURCE_ROOT = resolve(process.cwd(), "src");
const FORMER_HOOK_PATH = join(SOURCE_ROOT, "pages/map/hooks/useVenueSearch");
const VENUE_SEARCH_SPECIFIER = /["']([^"'\n]*useVenueSearch)["']/g;

const sourceFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === "__tests__" ? [] : sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });

const resolveSpecifier = (file: string, specifier: string) =>
  specifier.startsWith("@/") ? join(SOURCE_ROOT, specifier.slice(2)) : resolve(dirname(file), specifier);

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("useVenueSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("exposes the search limits as constants", async () => {
    expect(VENUE_SEARCH_MAX_LENGTH).toBe(100);
    expect(VENUE_SEARCH_DEBOUNCE_MS).toBe(300);
  });

  it("leaves nothing at the former map location of the search hook", () => {
    expect(existsSync(resolve(process.cwd(), "src/pages/map/hooks/useVenueSearch.ts"))).toBe(false);
    expect(existsSync(resolve(process.cwd(), "src/__tests__/pages/map/hooks/useVenueSearch.test.tsx"))).toBe(false);
  });

  it("AC3 has no module of the app that still points to the former map location of the search hook", () => {
    const sources = sourceFiles(SOURCE_ROOT);
    const importers = sources
      .filter((file) =>
        [...readFileSync(file, "utf8").matchAll(VENUE_SEARCH_SPECIFIER)].some(
          ([, specifier]) => resolveSpecifier(file, specifier) === FORMER_HOOK_PATH,
        ),
      )
      .map((file) => relative(SOURCE_ROOT, file));

    expect(sources.length).toBeGreaterThan(100);
    expect(importers).toEqual([]);
  });

  it("T020 no longer exports the search limits from the map constants", () => {
    expect(mapConstants).not.toHaveProperty("VENUE_SEARCH_MAX_LENGTH");
    expect(mapConstants).not.toHaveProperty("VENUE_SEARCH_DEBOUNCE_MS");
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
    expect(VenueService.search).not.toHaveBeenCalled();
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
    expect(VenueService.search).not.toHaveBeenCalled();
  });

  it("waits for the pause, then searches with the trimmed text, the filters and no bounds", async () => {
    (VenueService.search as Mock).mockResolvedValue(RESULT);
    const { result } = renderSearch();

    act(() => result.current.setSearchText("  acad  "));

    expect(result.current.searchText).toBe("  acad  ");
    expect(result.current.term).toBe("");
    expect(VenueService.search).not.toHaveBeenCalled();

    await waitFor(() => expect(result.current.venues).toEqual(VENUES));

    expect(result.current.term).toBe("acad");
    expect(result.current.isIdle).toBe(false);
    expect(result.current.isPending).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(VenueService.search).toHaveBeenCalledTimes(1);
    expect(VenueService.search).toHaveBeenCalledWith({ ...FILTERS, bounds: null, q: "acad" });
  });

  it("AC1 sends nothing 1 ms before the 300 ms pause and one search right at the pause", async () => {
    vi.useFakeTimers();
    (VenueService.search as Mock).mockResolvedValue(RESULT);
    const { result } = renderSearch();

    act(() => result.current.setSearchText("acad"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(299);
    });

    expect(result.current.term).toBe("");
    expect(VenueService.search).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(result.current.term).toBe("acad");
    expect(VenueService.search).toHaveBeenCalledTimes(1);
    expect(VenueService.search).toHaveBeenCalledWith({ ...FILTERS, bounds: null, q: "acad" });
  });

  it("reports pending while the request is in flight", async () => {
    (VenueService.search as Mock).mockImplementation(() => new Promise(() => undefined));
    const { result } = renderSearch();

    act(() => result.current.setSearchText("acad"));
    await waitFor(() => expect(VenueService.search).toHaveBeenCalledTimes(1));

    expect(result.current.isIdle).toBe(false);
    expect(result.current.isPending).toBe(true);
    expect(result.current.venues).toEqual([]);
  });

  it("sends only the last text when the user keeps typing", async () => {
    (VenueService.search as Mock).mockResolvedValue(RESULT);
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

    expect(VenueService.search).toHaveBeenCalledTimes(1);
    expect(VenueService.search).toHaveBeenCalledWith({ ...FILTERS, bounds: null, q: "acad" });
  });

  it("caches the result under the venue search key of the search query", async () => {
    (VenueService.search as Mock).mockResolvedValue(RESULT);
    const client = createTestQueryClient();
    const { result } = renderSearch(FILTERS, client);

    act(() => result.current.setSearchText("acad"));
    await waitFor(() => expect(result.current.venues).toEqual(VENUES));

    expect(client.getQueryData(venueKeys.search({ ...FILTERS, bounds: null, q: "acad" }))).toEqual(RESULT);
  });

  it("does not cache the search under the venue list key of the map", async () => {
    (VenueService.search as Mock).mockResolvedValue(RESULT);
    const client = createTestQueryClient();
    const { result } = renderSearch(FILTERS, client);

    act(() => result.current.setSearchText("acad"));
    await waitFor(() => expect(result.current.venues).toEqual(VENUES));

    expect(client.getQueryData(venueKeys.list({ ...FILTERS, bounds: null, q: "acad" }))).toBeUndefined();
  });

  it("AC2 reports an exact search as not approximate", async () => {
    (VenueService.search as Mock).mockResolvedValue(RESULT);
    const { result } = renderSearch();

    expect(result.current.isApproximate).toBe(false);
    act(() => result.current.setSearchText("acad"));
    await waitFor(() => expect(result.current.venues).toEqual(VENUES));

    expect(result.current.isApproximate).toBe(false);
  });

  it("AC1 reports a search answered by the tolerant fallback as approximate, then exact again for another text", async () => {
    (VenueService.search as Mock).mockImplementation(async (query: VenueQuery) =>
      query.q === "taverne cluni" ? { venues: VENUES, isApproximate: true } : RESULT,
    );
    const { result } = renderSearch();

    act(() => result.current.setSearchText("taverne cluni"));
    await waitFor(() => expect(result.current.isApproximate).toBe(true));
    expect(result.current.venues).toEqual(VENUES);

    act(() => result.current.setSearchText("acad"));
    await waitFor(() => expect(result.current.term).toBe("acad"));
    await waitFor(() => expect(result.current.isApproximate).toBe(false));
  });

  it("is not approximate while idle, after an approximate search was cleared", async () => {
    (VenueService.search as Mock).mockResolvedValue({ venues: VENUES, isApproximate: true });
    const { result } = renderSearch();

    act(() => result.current.setSearchText("cluni"));
    await waitFor(() => expect(result.current.isApproximate).toBe(true));
    act(() => result.current.setSearchText(""));
    await waitFor(() => expect(result.current.isIdle).toBe(true));

    expect(result.current.isApproximate).toBe(false);
    expect(result.current.venues).toEqual([]);
  });

  it("returns to idle without a request when the text is cleared", async () => {
    (VenueService.search as Mock).mockResolvedValue(RESULT);
    const { result } = renderSearch();

    act(() => result.current.setSearchText("acad"));
    await waitFor(() => expect(result.current.venues).toEqual(VENUES));
    act(() => result.current.setSearchText(""));
    await waitFor(() => expect(result.current.isIdle).toBe(true));

    expect(result.current.venues).toEqual([]);
    expect(VenueService.search).toHaveBeenCalledTimes(1);
  });

  it("flags the error and searches again on refetch", async () => {
    (VenueService.search as Mock).mockRejectedValueOnce(new Error("server down")).mockResolvedValue(RESULT);
    const { result } = renderSearch();

    act(() => result.current.setSearchText("acad"));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.isIdle).toBe(false);
    await act(async () => {
      await result.current.refetch();
    });
    await waitFor(() => expect(result.current.venues).toEqual(VENUES));

    expect(result.current.isError).toBe(false);
    expect(VenueService.search).toHaveBeenCalledTimes(2);
  });

  it("keeps the text typed while the filters change, and searches again with the new filters", async () => {
    (VenueService.search as Mock).mockResolvedValue(RESULT);
    const { result, rerender } = renderHook(({ filters }: { filters: VenueQuery }) => useVenueSearch(filters), {
      wrapper: wrapperFor(createTestQueryClient()),
      initialProps: { filters: FILTERS },
    });

    act(() => result.current.setSearchText("acad"));
    await waitFor(() => expect(result.current.venues).toEqual(VENUES));
    rerender({ filters: { ...FILTERS, confirmedOnly: false } });
    await waitFor(() => expect(VenueService.search).toHaveBeenCalledTimes(2));

    expect(result.current.searchText).toBe("acad");
    expect(VenueService.search).toHaveBeenLastCalledWith({ ...FILTERS, confirmedOnly: false, bounds: null, q: "acad" });
  });
});
