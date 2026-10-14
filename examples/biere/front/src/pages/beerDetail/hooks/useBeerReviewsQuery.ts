import { useInfiniteQuery } from "@tanstack/react-query";
import { queryTimes } from "@/config/tanstackQuery";
import type { ReviewPage } from "@/types/models/review/reviewPage";
import { fetchReviewPage } from "@/utils/queryFunctions/reviewQueryFunctions";
import { reviewKeys } from "@/utils/queryKeys/reviewQueryKeys";

const FIRST_PAGE = 1;

const getNextPageParam = (lastPage: ReviewPage, allPages: ReviewPage[]): number | undefined => {
  if (lastPage.items.length === 0) return undefined;
  const loadedCount = allPages.reduce((count, page) => count + page.items.length, 0);
  return loadedCount < lastPage.total ? allPages.length + 1 : undefined;
};

export const useBeerReviewsQuery = (beerId: number) => {
  const { data, isPending, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: reviewKeys.list(beerId),
    queryFn: ({ pageParam }) => fetchReviewPage(beerId, pageParam),
    initialPageParam: FIRST_PAGE,
    getNextPageParam,
    ...queryTimes.short,
  });

  return {
    mine: data?.pages.at(-1)?.mine ?? null,
    reviews: data?.pages.flatMap((page) => page.items) ?? [],
    total: data?.pages.at(-1)?.total ?? 0,
    isPending,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  };
};
