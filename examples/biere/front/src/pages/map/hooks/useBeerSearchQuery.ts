import { skipToken, useQuery } from "@tanstack/react-query";
import { queryTimes } from "@/config/tanstackQuery";
import { EMPTY_BEER_QUERY } from "@/types/mappers/beer/beerQueryMapper";
import { fetchBeerPage } from "@/utils/queryFunctions/beerQueryFunctions";
import { beerKeys } from "@/utils/queryKeys/beerQueryKeys";

export const BEER_SEARCH_MIN_LENGTH = 2;
const BEER_SEARCH_SIZE = 10;
const FIRST_PAGE = 1;

export const useBeerSearchQuery = (search: string) => {
  const term = search.trim();
  const isSearchable = term.length >= BEER_SEARCH_MIN_LENGTH;
  const { data, isError, isFetching, refetch } = useQuery({
    queryKey: [...beerKeys.all(), "search", term] as const,
    queryFn: isSearchable ? () => fetchBeerPage({ ...EMPTY_BEER_QUERY, search: term }, FIRST_PAGE, BEER_SEARCH_SIZE) : skipToken,
    ...queryTimes.long,
  });

  return { beers: data?.items ?? [], isError, isFetching, refetch };
};
