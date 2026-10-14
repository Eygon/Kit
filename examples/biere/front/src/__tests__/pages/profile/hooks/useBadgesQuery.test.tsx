import type { QueryClient, QueryObserverOptions } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { createTestQueryClient } from "@/__tests__/utils/renderWithProviders";
import BadgeService from "@/api/badges/badgeService";
import { queryTimes } from "@/config/tanstackQuery";
import { useBadgesQuery } from "@/pages/profile/hooks/useBadgesQuery";
import { badgeKeys } from "@/utils/queryKeys/badgeQueryKeys";

vi.mock("@/api/badges/badgeService", () => ({
  default: { getAll: vi.fn() },
}));

const BADGES = [
  { id: "firstSip", kind: "firstSip", family: null, unlocked: true, unlockedAt: "2026-03-01T18:30:00.000Z", current: 1, target: 1, comingSoon: false },
];

const wrapperFor = (client: QueryClient) => {
  const Wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

describe("useBadgesQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts pending with an empty list, then exposes the badges", async () => {
    (BadgeService.getAll as Mock).mockResolvedValue(BADGES);

    const { result } = renderHook(() => useBadgesQuery(), { wrapper: wrapperFor(createTestQueryClient()) });

    expect(result.current.isPending).toBe(true);
    expect(result.current.badges).toEqual([]);
    expect(result.current.isError).toBe(false);
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.badges).toEqual(BADGES);
    expect(BadgeService.getAll).toHaveBeenCalledTimes(1);
  });

  it("reports the error and an empty list when the service rejects", async () => {
    (BadgeService.getAll as Mock).mockRejectedValue(new Error("down"));

    const { result } = renderHook(() => useBadgesQuery(), { wrapper: wrapperFor(createTestQueryClient()) });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.badges).toEqual([]);
  });

  it("reads the badges again on refetch and recovers from an error", async () => {
    (BadgeService.getAll as Mock).mockRejectedValueOnce(new Error("down")).mockResolvedValue(BADGES);

    const { result } = renderHook(() => useBadgesQuery(), { wrapper: wrapperFor(createTestQueryClient()) });
    await waitFor(() => expect(result.current.isError).toBe(true));

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => expect(result.current.badges).toEqual(BADGES));
    expect(result.current.isError).toBe(false);
    expect(BadgeService.getAll).toHaveBeenCalledTimes(2);
  });

  it("caches under badgeKeys.me() with the default query times", async () => {
    (BadgeService.getAll as Mock).mockResolvedValue(BADGES);
    const client = createTestQueryClient();

    const { result } = renderHook(() => useBadgesQuery(), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(result.current.badges).toEqual(BADGES));

    const cachedQuery = client.getQueryCache().find({ queryKey: badgeKeys.me() });
    const options = cachedQuery?.options as QueryObserverOptions | undefined;
    expect(options).toBeDefined();
    expect(options?.staleTime).toBe(queryTimes.default.staleTime);
    expect(options?.gcTime).toBe(queryTimes.default.gcTime);
  });
});
