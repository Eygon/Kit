import { useInfiniteQuery } from "@tanstack/react-query";
import { queryTimes } from "@/config/tanstackQuery";
import type { FeedItem } from "@/types/models/feed/feedItem";
import type { FeedPage } from "@/types/models/feed/feedPage";
import { fetchFeedPage } from "@/utils/queryFunctions/feedQueryFunctions";
import { feedKeys } from "@/utils/queryKeys/feedQueryKeys";

const FIRST_PAGE = 1;

const getNextPageParam = (lastPage: FeedPage, allPages: FeedPage[]): number | undefined => {
  if (lastPage.items.length === 0) return undefined;
  const loadedCount = allPages.reduce((count, page) => count + page.items.length, 0);
  return loadedCount < lastPage.total ? allPages.length + 1 : undefined;
};

const dedupeById = (items: FeedItem[]): FeedItem[] => {
  const seenIds = new Set<string>();
  return items.filter((item) => {
    if (seenIds.has(item.id)) return false;
    seenIds.add(item.id);
    return true;
  });
};

export const useFeedQuery = () => {
  const { data, isPending, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: feedKeys.list(),
    queryFn: ({ pageParam }) => fetchFeedPage(pageParam),
    initialPageParam: FIRST_PAGE,
    getNextPageParam,
    ...queryTimes.short,
  });

  return {
    items: dedupeById(data?.pages.flatMap((page) => page.items) ?? []),
    isPending,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  };
};
