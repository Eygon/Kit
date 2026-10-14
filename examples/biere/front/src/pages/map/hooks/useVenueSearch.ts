import { skipToken, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { queryTimes } from "@/config/tanstackQuery";
import { VENUE_SEARCH_DEBOUNCE_MS } from "@/pages/map/utils/mapConstants";
import type { VenueQuery } from "@/types/models/venue/venueQuery";
import { fetchVenues } from "@/utils/queryFunctions/venueQueryFunctions";
import { venueKeys } from "@/utils/queryKeys/venueQueryKeys";

export const useVenueSearch = (filterQuery: VenueQuery) => {
  const [searchText, setSearchText] = useState("");
  const [term, setTerm] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setTerm(searchText.trim()), VENUE_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchText]);

  const query = useMemo<VenueQuery>(() => ({ ...filterQuery, bounds: null, q: term }), [filterQuery, term]);
  const isIdle = term === "";

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: venueKeys.list(query),
    queryFn: isIdle ? skipToken : () => fetchVenues(query),
    ...queryTimes.long,
  });

  return {
    searchText,
    setSearchText,
    term,
    venues: data ?? [],
    isIdle,
    isPending: !isIdle && isPending,
    isError,
    refetch,
  };
};
