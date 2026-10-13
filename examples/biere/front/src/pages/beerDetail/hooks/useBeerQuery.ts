import { skipToken, useQuery } from "@tanstack/react-query";
import { queryTimes } from "@/config/tanstackQuery";
import { fetchBeer } from "@/utils/queryFunctions/beerQueryFunctions";
import { beerKeys } from "@/utils/queryKeys/beerQueryKeys";

export const useBeerQuery = (beerId: number | null) =>
  useQuery({
    queryKey: beerKeys.detail(beerId),
    queryFn: beerId === null ? skipToken : () => fetchBeer(beerId),
    enabled: beerId !== null,
    ...queryTimes.long,
  });
