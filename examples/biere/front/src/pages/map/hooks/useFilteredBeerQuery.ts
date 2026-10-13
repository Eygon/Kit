import { skipToken, useQuery } from "@tanstack/react-query";
import { queryTimes } from "@/config/tanstackQuery";
import { fetchBeer } from "@/utils/queryFunctions/beerQueryFunctions";
import { beerKeys } from "@/utils/queryKeys/beerQueryKeys";

export const useFilteredBeerQuery = (beerId: number | null) =>
  useQuery({
    queryKey: beerKeys.detail(beerId),
    queryFn: beerId === null ? skipToken : () => fetchBeer(beerId),
    ...queryTimes.long,
  });
