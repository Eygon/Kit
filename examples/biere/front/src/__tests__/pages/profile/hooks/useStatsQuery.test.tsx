import type { QueryClient, QueryObserverOptions } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { createTestQueryClient } from "@/__tests__/utils/renderWithProviders";
import StatsService from "@/api/stats/statsService";
import { queryTimes } from "@/config/tanstackQuery";
import { useStatsQuery } from "@/pages/profile/hooks/useStatsQuery";
import { statsKeys } from "@/utils/queryKeys/statsQueryKeys";

vi.mock("@/api/stats/statsService", () => ({
  default: { get: vi.fn() },
}));

const STATS = { checkinCount: 14, discoveredCount: 9, averageAbv: 6.5, countries: [], favoriteFamily: null, averageRating: null, currentStreak: 0, bestStreak: 0, monthlyCheckins: [] };

const wrapperFor = (client: QueryClient) => {
  const Wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

describe("useStatsQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts pending with no stats, then exposes the stats", async () => {
    (StatsService.get as Mock).mockResolvedValue(STATS);

    const { result } = renderHook(() => useStatsQuery(), { wrapper: wrapperFor(createTestQueryClient()) });

    expect(result.current.isPending).toBe(true);
    expect(result.current.stats).toBeNull();
    expect(result.current.isError).toBe(false);
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.stats).toEqual(STATS);
    expect(StatsService.get).toHaveBeenCalledTimes(1);
  });

  it("reports the error and no stats when the service rejects", async () => {
    (StatsService.get as Mock).mockRejectedValue(new Error("down"));

    const { result } = renderHook(() => useStatsQuery(), { wrapper: wrapperFor(createTestQueryClient()) });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.stats).toBeNull();
  });

  it("reads the stats again on refetch and recovers from an error", async () => {
    (StatsService.get as Mock).mockRejectedValueOnce(new Error("down")).mockResolvedValue(STATS);

    const { result } = renderHook(() => useStatsQuery(), { wrapper: wrapperFor(createTestQueryClient()) });
    await waitFor(() => expect(result.current.isError).toBe(true));

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => expect(result.current.stats).toEqual(STATS));
    expect(result.current.isError).toBe(false);
    expect(StatsService.get).toHaveBeenCalledTimes(2);
  });

  it("caches under statsKeys.me() with the default query times", async () => {
    (StatsService.get as Mock).mockResolvedValue(STATS);
    const client = createTestQueryClient();

    const { result } = renderHook(() => useStatsQuery(), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(result.current.stats).toEqual(STATS));

    const cachedQuery = client.getQueryCache().find({ queryKey: statsKeys.me() });
    const options = cachedQuery?.options as QueryObserverOptions | undefined;
    expect(options).toBeDefined();
    expect(options?.staleTime).toBe(queryTimes.default.staleTime);
    expect(options?.gcTime).toBe(queryTimes.default.gcTime);
  });
});
