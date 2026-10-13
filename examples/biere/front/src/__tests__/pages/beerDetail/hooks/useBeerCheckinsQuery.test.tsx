import type { QueryClient, QueryObserverOptions } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { createTestQueryClient } from "@/__tests__/utils/renderWithProviders";
import CheckinService from "@/api/checkins/checkinService";
import { queryTimes } from "@/config/tanstackQuery";
import { useBeerCheckinsQuery } from "@/pages/beerDetail/hooks/useBeerCheckinsQuery";
import { checkinKeys } from "@/utils/queryKeys/checkinQueryKeys";

vi.mock("@/api/checkins/checkinService", () => ({
  default: { getPage: vi.fn() },
}));

const TOTAL = 25;
const PAGE_SIZE = 20;

const checkinsOfPage = (page: number, total: number) =>
  Array.from({ length: Math.max(0, Math.min(PAGE_SIZE, total - (page - 1) * PAGE_SIZE)) }, (_, index) => ({
    id: total - ((page - 1) * PAGE_SIZE + index),
    place: `Bar ${(page - 1) * PAGE_SIZE + index + 1}`,
  }));

const stubPages = (total = TOTAL) => {
  (CheckinService.getPage as Mock).mockImplementation(async (_beerId: number | null, page: number) => ({
    items: checkinsOfPage(page, total),
    total,
    page,
    size: PAGE_SIZE,
  }));
};

const wrapperFor = (client: QueryClient) => {
  const Wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

describe("useBeerCheckinsQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts pending with no checkin, then exposes the first 20 of 25 and a next page", async () => {
    stubPages();

    const { result } = renderHook(() => useBeerCheckinsQuery(7), { wrapper: wrapperFor(createTestQueryClient()) });

    expect(result.current.isPending).toBe(true);
    expect(result.current.checkins).toEqual([]);
    expect(result.current.total).toBe(0);
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(CheckinService.getPage).toHaveBeenCalledWith(7, 1);
    expect(result.current.checkins).toHaveLength(20);
    expect(result.current.total).toBe(TOTAL);
    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.isError).toBe(false);
  });

  it("loads the 5 remaining checkins on the next page and offers no further page", async () => {
    stubPages();

    const { result } = renderHook(() => useBeerCheckinsQuery(7), { wrapper: wrapperFor(createTestQueryClient()) });
    await waitFor(() => expect(result.current.checkins).toHaveLength(20));

    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.checkins).toHaveLength(25));
    expect(result.current.hasNextPage).toBe(false);
    expect(result.current.isFetchingNextPage).toBe(false);
    expect(result.current.checkins.map((checkin: { id: number }) => checkin.id)).toEqual(
      Array.from({ length: 25 }, (_, index) => 25 - index),
    );
    expect((CheckinService.getPage as Mock).mock.calls).toEqual([
      [7, 1],
      [7, 2],
    ]);
  });

  it("offers no next page when 20 checkins fill exactly the first page", async () => {
    stubPages(20);

    const { result } = renderHook(() => useBeerCheckinsQuery(7), { wrapper: wrapperFor(createTestQueryClient()) });

    await waitFor(() => expect(result.current.checkins).toHaveLength(20));
    expect(result.current.hasNextPage).toBe(false);
  });

  it("offers no next page when a page beyond the last comes back empty with the total unchanged", async () => {
    (CheckinService.getPage as Mock).mockResolvedValue({ items: [], total: TOTAL, page: 3, size: PAGE_SIZE });

    const { result } = renderHook(() => useBeerCheckinsQuery(7), { wrapper: wrapperFor(createTestQueryClient()) });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.checkins).toEqual([]);
    expect(result.current.total).toBe(TOTAL);
    expect(result.current.hasNextPage).toBe(false);
  });

  it("reports no tasting without error", async () => {
    stubPages(0);

    const { result } = renderHook(() => useBeerCheckinsQuery(7), { wrapper: wrapperFor(createTestQueryClient()) });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.checkins).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.hasNextPage).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it("flags the error when the request fails and recovers on refetch", async () => {
    (CheckinService.getPage as Mock).mockRejectedValue(new Error("server down"));

    const { result } = renderHook(() => useBeerCheckinsQuery(7), { wrapper: wrapperFor(createTestQueryClient()) });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.checkins).toEqual([]);

    stubPages();
    await act(async () => {
      await result.current.refetch();
    });
    await waitFor(() => expect(result.current.isError).toBe(false));
    expect(result.current.checkins).toHaveLength(20);
  });

  it("does not request anything while the beer id is null", async () => {
    stubPages();

    const { result } = renderHook(() => useBeerCheckinsQuery(null), { wrapper: wrapperFor(createTestQueryClient()) });

    await act(async () => {
      await Promise.resolve();
    });
    expect(CheckinService.getPage).not.toHaveBeenCalled();
    expect(result.current.checkins).toEqual([]);
    expect(result.current.isPending).toBe(true);
  });

  it("caches the list under checkinKeys.list(beerId) with the short times and refetches for another beer", async () => {
    stubPages();
    const client = createTestQueryClient();

    const { result, rerender } = renderHook(({ beerId }) => useBeerCheckinsQuery(beerId), {
      wrapper: wrapperFor(client),
      initialProps: { beerId: 7 },
    });
    await waitFor(() => expect(result.current.checkins).toHaveLength(20));
    expect(client.getQueryData(checkinKeys.list(7))).toBeDefined();

    const options = client.getQueryCache().find({ queryKey: checkinKeys.list(7) })?.options as
      | QueryObserverOptions
      | undefined;
    expect(options?.staleTime).toBe(queryTimes.short.staleTime);
    expect(options?.gcTime).toBe(queryTimes.short.gcTime);

    rerender({ beerId: 8 });
    await waitFor(() => expect(CheckinService.getPage).toHaveBeenCalledWith(8, 1));
    expect(client.getQueryData(checkinKeys.list(8))).toBeDefined();
  });
});
