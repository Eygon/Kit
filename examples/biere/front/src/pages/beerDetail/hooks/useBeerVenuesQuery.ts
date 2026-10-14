import { useQuery } from "@tanstack/react-query";
import { queryTimes } from "@/config/tanstackQuery";
import { fetchBeerVenues } from "@/utils/queryFunctions/venueQueryFunctions";
import { venueKeys } from "@/utils/queryKeys/venueQueryKeys";

export const useBeerVenuesQuery = (beerId: number) => {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: venueKeys.forBeer(beerId),
    queryFn: () => fetchBeerVenues(beerId),
    ...queryTimes.long,
  });

  return { venues: data ?? [], isPending, isError, refetch };
};
