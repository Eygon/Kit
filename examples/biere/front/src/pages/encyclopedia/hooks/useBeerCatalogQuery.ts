import { useInfiniteQuery } from "@tanstack/react-query";
import { queryTimes } from "@/config/tanstackQuery";
import { BEER_PAGE_SIZE } from "@/pages/encyclopedia/utils/encyclopediaConstants";
import type { BeerPage } from "@/types/models/beer/beerPage";
import type { BeerQuery } from "@/types/models/beer/beerQuery";
import { fetchBeerPage } from "@/utils/queryFunctions/beerQueryFunctions";
import { beerKeys } from "@/utils/queryKeys/beerQueryKeys";

const FIRST_PAGE = 1;

const getNextPageParam = (lastPage: BeerPage, allPages: BeerPage[]): number | undefined => {
  if (lastPage.items.length === 0) return undefined;
  const loadedCount = allPages.reduce((count, page) => count + page.items.length, 0);
  return loadedCount < lastPage.total ? allPages.length + 1 : undefined;
};

export const useBeerCatalogQuery = (query: BeerQuery) => {
  const { data, isPending, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: beerKeys.catalog(query),
    queryFn: ({ pageParam }) => fetchBeerPage(query, pageParam, BEER_PAGE_SIZE),
    initialPageParam: FIRST_PAGE,
    getNextPageParam,
    ...queryTimes.long,
  });

  const lastPage = data?.pages.at(-1);

  return {
    beers: data?.pages.flatMap((page) => page.items) ?? [],
    total: lastPage?.total ?? 0,
    facets: data?.pages[0]?.facets ?? null,
    isPending,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  };
};
