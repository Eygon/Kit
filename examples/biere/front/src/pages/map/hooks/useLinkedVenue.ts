import { skipToken, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { useSearchParams } from "react-router";
import { queryTimes } from "@/config/tanstackQuery";
import { NO_LINKED_VENUE_ID, VENUE_PARAM } from "@/pages/map/utils/mapConstants";
import { parseVenueIdParam } from "@/types/enums/routing/routePathEnum";
import { fetchVenue } from "@/utils/queryFunctions/venueQueryFunctions";
import { venueKeys } from "@/utils/queryKeys/venueQueryKeys";

export const useLinkedVenue = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const venueId = parseVenueIdParam(searchParams.get(VENUE_PARAM));

  const { data } = useQuery({
    queryKey: venueKeys.detail(venueId ?? NO_LINKED_VENUE_ID),
    queryFn: venueId === null ? skipToken : () => fetchVenue(venueId),
    ...queryTimes.long,
  });

  const clearLinkedVenue = useCallback(
    () =>
      setSearchParams(
        (previous) => {
          const params = new URLSearchParams(previous);
          params.delete(VENUE_PARAM);
          return params;
        },
        { replace: true },
      ),
    [setSearchParams],
  );

  const isVenueMissing = venueId !== null && data === null;

  useEffect(() => {
    if (isVenueMissing) clearLinkedVenue();
  }, [isVenueMissing, clearLinkedVenue]);

  return { linkedVenue: venueId === null ? null : (data ?? null), clearLinkedVenue };
};
