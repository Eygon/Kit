import { useQuery } from "@tanstack/react-query";
import { queryTimes } from "@/config/tanstackQuery";
import type { Brewery } from "@/types/models/brewery/brewery";
import { fetchBreweries } from "@/utils/queryFunctions/breweryQueryFunctions";
import { breweryKeys } from "@/utils/queryKeys/breweryQueryKeys";

const NO_BREWERIES: Brewery[] = [];

export const useBreweriesQuery = (isEnabled: boolean) => {
  const { data, isPending, isError } = useQuery({
    queryKey: breweryKeys.list(),
    queryFn: fetchBreweries,
    enabled: isEnabled,
    ...queryTimes.long,
  });

  return { breweries: data ?? NO_BREWERIES, isPending, isError };
};
