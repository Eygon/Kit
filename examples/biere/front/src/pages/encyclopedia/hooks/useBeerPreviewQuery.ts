import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryTimes } from "@/config/tanstackQuery";
import { BEER_PREVIEW_SIZE } from "@/pages/encyclopedia/utils/encyclopediaConstants";
import type { BeerQuery } from "@/types/models/beer/beerQuery";
import { fetchBeerPage } from "@/utils/queryFunctions/beerQueryFunctions";
import { beerKeys } from "@/utils/queryKeys/beerQueryKeys";

const FIRST_PAGE = 1;

export const useBeerPreviewQuery = (query: BeerQuery, isEnabled: boolean) => {
  const { data, isError, isFetching } = useQuery({
    queryKey: beerKeys.preview(query),
    queryFn: () => fetchBeerPage(query, FIRST_PAGE, BEER_PREVIEW_SIZE),
    enabled: isEnabled,
    placeholderData: keepPreviousData,
    ...queryTimes.long,
  });

  return { total: data?.total ?? null, facets: data?.facets ?? null, isError, isFetching };
};
