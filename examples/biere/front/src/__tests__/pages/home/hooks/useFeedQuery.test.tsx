import type { QueryClient, QueryObserverOptions } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { createTestQueryClient } from "@/__tests__/utils/renderWithProviders";
import FeedService from "@/api/feed/feedService";
import { queryTimes } from "@/config/tanstackQuery";
import { useFeedQuery } from "@/pages/home/hooks/useFeedQuery";
import { feedKeys } from "@/utils/queryKeys/feedQueryKeys";

vi.mock("@/api/feed/feedService", () => ({
  default: { getPage: vi.fn() },
}));

const TOTAL = 25;
const PAGE_SIZE = 20;

const feedItemOf = (index: number) => ({ id: `checkin-${index}`, beerName: `Bière ${index}` });

const itemsOfPage = (page: number, total: number) =>
  Array.from({ length: Math.max(0, Math.min(PAGE_SIZE, total - (page - 1) * PAGE_SIZE)) }, (_, index) =>
    feedItemOf(total - ((page - 1) * PAGE_SIZE + index)),
  );

const stubPages = (total = TOTAL) => {
  (FeedService.getPage as Mock).mockImplementation(async (page: number) => ({
    items: itemsOfPage(page, total),
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

describe("useFeedQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts pending, then exposes the first 20 of 25 cards and a next page", async () => {
    stubPages();

    const { result } = renderHook(() => useFeedQuery(), { wrapper: wrapperFor(createTestQueryClient()) });

    expect(result.current.isPending).toBe(true);
    expect(result.current.items).toEqual([]);
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(FeedService.getPage).toHaveBeenCalledWith(1);
    expect(result.current.items).toHaveLength(20);
    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.isError).toBe(false);
  });

  it("loads the 5 remaining cards on the next page and offers no further page", async () => {
    stubPages();

    const { result } = renderHook(() => useFeedQuery(), { wrapper: wrapperFor(createTestQueryClient()) });
    await waitFor(() => expect(result.current.items).toHaveLength(20));

    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.items).toHaveLength(25));
    expect(result.current.hasNextPage).toBe(false);
    expect((FeedService.getPage as Mock).mock.calls).toEqual([[1], [2]]);
  });

  it("flags the next page as fetching while it is in flight, then clears the flag", async () => {
    stubPages();
    const { result } = renderHook(() => useFeedQuery(), { wrapper: wrapperFor(createTestQueryClient()) });
    await waitFor(() => expect(result.current.items).toHaveLength(20));
    expect(result.current.isFetchingNextPage).toBe(false);
    let release: () => void = () => undefined;
    (FeedService.getPage as Mock).mockImplementationOnce(
      (page: number) =>
        new Promise((resolve) => {
          release = () => resolve({ items: itemsOfPage(page, TOTAL), total: TOTAL, page, size: PAGE_SIZE });
        }),
    );

    act(() => {
      void result.current.fetchNextPage();
    });

    await waitFor(() => expect(result.current.isFetchingNextPage).toBe(true));
    await act(async () => {
      release();
    });
    await waitFor(() => expect(result.current.isFetchingNextPage).toBe(false));
    expect(result.current.items).toHaveLength(25);
  });

  it("offers no next page when 20 cards fill exactly the first page", async () => {
    stubPages(20);

    const { result } = renderHook(() => useFeedQuery(), { wrapper: wrapperFor(createTestQueryClient()) });

    await waitFor(() => expect(result.current.items).toHaveLength(20));
    expect(result.current.hasNextPage).toBe(false);
  });

  it("offers no next page when a page comes back empty with the total unchanged", async () => {
    (FeedService.getPage as Mock).mockResolvedValue({ items: [], total: TOTAL, page: 1, size: PAGE_SIZE });

    const { result } = renderHook(() => useFeedQuery(), { wrapper: wrapperFor(createTestQueryClient()) });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.items).toEqual([]);
    expect(result.current.hasNextPage).toBe(false);
  });

  it("keeps a card that moved from one page to the next only once", async () => {
    (FeedService.getPage as Mock).mockImplementation(async (page: number) => ({
      items: page === 1 ? itemsOfPage(1, TOTAL) : [feedItemOf(6), feedItemOf(5), feedItemOf(4), feedItemOf(3), feedItemOf(2)],
      total: TOTAL,
      page,
      size: PAGE_SIZE,
    }));

    const { result } = renderHook(() => useFeedQuery(), { wrapper: wrapperFor(createTestQueryClient()) });
    await waitFor(() => expect(result.current.items).toHaveLength(20));
    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => expect((FeedService.getPage as Mock).mock.calls).toHaveLength(2));
    const ids = result.current.items.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(24);
  });

  it("flags the error when the request fails and recovers on refetch", async () => {
    (FeedService.getPage as Mock).mockRejectedValue(new Error("server down"));

    const { result } = renderHook(() => useFeedQuery(), { wrapper: wrapperFor(createTestQueryClient()) });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.items).toEqual([]);

    stubPages();
    await act(async () => {
      await result.current.refetch();
    });
    await waitFor(() => expect(result.current.isError).toBe(false));
    expect(result.current.items).toHaveLength(20);
  });

  it("caches the list under feedKeys.list() with the short times", async () => {
    stubPages();
    const client = createTestQueryClient();

    const { result } = renderHook(() => useFeedQuery(), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(result.current.items).toHaveLength(20));

    expect(feedKeys.list()).toEqual([...feedKeys.all(), "list"]);
    expect(client.getQueryData(feedKeys.list())).toBeDefined();
    const options = client.getQueryCache().find({ queryKey: feedKeys.list() })?.options as QueryObserverOptions | undefined;
    expect(options?.staleTime).toBe(queryTimes.short.staleTime);
    expect(options?.gcTime).toBe(queryTimes.short.gcTime);
  });
});
