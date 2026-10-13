import { useInfiniteQuery } from "@tanstack/react-query";
import { queryTimes } from "@/config/tanstackQuery";
import type { CheckinPage } from "@/types/models/checkin/checkinPage";
import { fetchCheckinPage } from "@/utils/queryFunctions/checkinQueryFunctions";
import { checkinKeys } from "@/utils/queryKeys/checkinQueryKeys";

const FIRST_PAGE = 1;

const getNextPageParam = (lastPage: CheckinPage, allPages: CheckinPage[]): number | undefined => {
  if (lastPage.items.length === 0) return undefined;
  const loadedCount = allPages.reduce((count, page) => count + page.items.length, 0);
  return loadedCount < lastPage.total ? allPages.length + 1 : undefined;
};

export const useBeerCheckinsQuery = (beerId: number | null) => {
  const { data, isPending, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: checkinKeys.list(beerId),
    queryFn: ({ pageParam }) => fetchCheckinPage(beerId, pageParam),
    initialPageParam: FIRST_PAGE,
    getNextPageParam,
    enabled: beerId !== null,
    ...queryTimes.short,
  });

  return {
    checkins: data?.pages.flatMap((page) => page.items) ?? [],
    total: data?.pages.at(-1)?.total ?? 0,
    isPending,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  };
};
