import { skipToken, useQuery } from "@tanstack/react-query";
import { queryTimes } from "@/config/tanstackQuery";
import { fetchVenueBeers } from "@/utils/queryFunctions/venueQueryFunctions";
import { venueKeys } from "@/utils/queryKeys/venueQueryKeys";

export const useVenueBeersQuery = (venueId: number | null) => {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: venueKeys.beers(venueId),
    queryFn: venueId === null ? skipToken : () => fetchVenueBeers(venueId),
    ...queryTimes.long,
  });

  return { beers: data ?? [], isPending, isError, refetch };
};
