import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryTimes } from "@/config/tanstackQuery";
import type { VenueQuery } from "@/types/models/venue/venueQuery";
import { fetchVenues } from "@/utils/queryFunctions/venueQueryFunctions";
import { venueKeys } from "@/utils/queryKeys/venueQueryKeys";

export const useVenuesQuery = (query: VenueQuery) => {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: venueKeys.list(query),
    queryFn: () => fetchVenues(query),
    placeholderData: keepPreviousData,
    ...queryTimes.long,
  });

  return { venues: data ?? [], isPending, isError, refetch };
};
