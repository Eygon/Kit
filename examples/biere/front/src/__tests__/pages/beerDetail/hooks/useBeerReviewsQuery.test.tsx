import type { QueryClient, QueryObserverOptions } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { createTestQueryClient } from "@/__tests__/utils/renderWithProviders";
import ReviewService from "@/api/reviews/reviewService";
import { queryTimes } from "@/config/tanstackQuery";
import { useBeerReviewsQuery } from "@/pages/beerDetail/hooks/useBeerReviewsQuery";
import { reviewKeys } from "@/utils/queryKeys/reviewQueryKeys";

vi.mock("@/api/reviews/reviewService", () => ({
  default: { getPage: vi.fn() },
}));

const TOTAL = 12;
const PAGE_SIZE = 10;

const MINE = { id: 100, authorName: "Moi", isMine: true };

const reviewsOfPage = (page: number, total: number) =>
  Array.from({ length: Math.max(0, Math.min(PAGE_SIZE, total - (page - 1) * PAGE_SIZE)) }, (_, index) => ({
    id: total - ((page - 1) * PAGE_SIZE + index),
    authorName: `Author ${(page - 1) * PAGE_SIZE + index + 1}`,
  }));

const stubPages = (total = TOTAL, mine: unknown = MINE) => {
  (ReviewService.getPage as Mock).mockImplementation(async (_beerId: number, page: number) => ({
    mine,
    items: reviewsOfPage(page, total),
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

describe("useBeerReviewsQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts pending with nothing, then exposes mine, the first 10 of 12 and a next page", async () => {
    stubPages();

    const { result } = renderHook(() => useBeerReviewsQuery(7), { wrapper: wrapperFor(createTestQueryClient()) });

    expect(result.current.isPending).toBe(true);
    expect(result.current.mine).toBeNull();
    expect(result.current.reviews).toEqual([]);
    expect(result.current.total).toBe(0);
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(ReviewService.getPage).toHaveBeenCalledWith(7, 1);
    expect(result.current.mine).toEqual(MINE);
    expect(result.current.reviews).toHaveLength(10);
    expect(result.current.total).toBe(TOTAL);
    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.isError).toBe(false);
  });

  it("loads the 2 remaining reviews on the next page, keeps mine once and offers no further page", async () => {
    stubPages();

    const { result } = renderHook(() => useBeerReviewsQuery(7), { wrapper: wrapperFor(createTestQueryClient()) });
    await waitFor(() => expect(result.current.reviews).toHaveLength(10));

    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.reviews).toHaveLength(12));
    expect(result.current.hasNextPage).toBe(false);
    expect(result.current.isFetchingNextPage).toBe(false);
    expect(result.current.mine).toEqual(MINE);
    expect(result.current.reviews.map((review: { id: number }) => review.id)).toEqual(
      Array.from({ length: 12 }, (_, index) => 12 - index),
    );
    expect((ReviewService.getPage as Mock).mock.calls).toEqual([
      [7, 1],
      [7, 2],
    ]);
  });

  it("offers no next page when 10 reviews fill exactly the first page", async () => {
    stubPages(10);

    const { result } = renderHook(() => useBeerReviewsQuery(7), { wrapper: wrapperFor(createTestQueryClient()) });

    await waitFor(() => expect(result.current.reviews).toHaveLength(10));
    expect(result.current.hasNextPage).toBe(false);
  });

  it("offers no next page when a page beyond the last comes back empty with the total unchanged", async () => {
    (ReviewService.getPage as Mock).mockResolvedValue({ mine: null, items: [], total: TOTAL, page: 3, size: PAGE_SIZE });

    const { result } = renderHook(() => useBeerReviewsQuery(7), { wrapper: wrapperFor(createTestQueryClient()) });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.reviews).toEqual([]);
    expect(result.current.total).toBe(TOTAL);
    expect(result.current.hasNextPage).toBe(false);
  });

  it("reports a beer without review and without own review, with no error", async () => {
    stubPages(0, null);

    const { result } = renderHook(() => useBeerReviewsQuery(7), { wrapper: wrapperFor(createTestQueryClient()) });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.mine).toBeNull();
    expect(result.current.reviews).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.hasNextPage).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it("flags the error when the request fails and recovers on refetch", async () => {
    (ReviewService.getPage as Mock).mockRejectedValue(new Error("server down"));

    const { result } = renderHook(() => useBeerReviewsQuery(7), { wrapper: wrapperFor(createTestQueryClient()) });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.reviews).toEqual([]);

    stubPages();
    await act(async () => {
      await result.current.refetch();
    });
    await waitFor(() => expect(result.current.isError).toBe(false));
    expect(result.current.reviews).toHaveLength(10);
  });

  it("keeps the loaded reviews and flags the error when the next page fails", async () => {
    stubPages();

    const { result } = renderHook(() => useBeerReviewsQuery(7), { wrapper: wrapperFor(createTestQueryClient()) });
    await waitFor(() => expect(result.current.reviews).toHaveLength(10));

    (ReviewService.getPage as Mock).mockRejectedValue(new Error("server down"));
    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.reviews).toHaveLength(10);
    expect(result.current.mine).toEqual(MINE);
    expect(result.current.hasNextPage).toBe(true);
  });

  it("caches the list under reviewKeys.list(beerId) with the short times and refetches for another beer", async () => {
    stubPages();
    const client = createTestQueryClient();

    const { result, rerender } = renderHook(({ beerId }) => useBeerReviewsQuery(beerId), {
      wrapper: wrapperFor(client),
      initialProps: { beerId: 7 },
    });
    await waitFor(() => expect(result.current.reviews).toHaveLength(10));
    expect(client.getQueryData(reviewKeys.list(7))).toBeDefined();

    const options = client.getQueryCache().find({ queryKey: reviewKeys.list(7) })?.options as
      | QueryObserverOptions
      | undefined;
    expect(options?.staleTime).toBe(queryTimes.short.staleTime);
    expect(options?.gcTime).toBe(queryTimes.short.gcTime);

    rerender({ beerId: 8 });
    await waitFor(() => expect(ReviewService.getPage).toHaveBeenCalledWith(8, 1));
    expect(client.getQueryData(reviewKeys.list(8))).toBeDefined();
  });
});
