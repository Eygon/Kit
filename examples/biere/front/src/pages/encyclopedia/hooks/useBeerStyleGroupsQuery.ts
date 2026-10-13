import { useQuery } from "@tanstack/react-query";
import { queryTimes } from "@/config/tanstackQuery";
import type { BeerStyleGroup } from "@/types/models/beerStyle/beerStyleGroup";
import { fetchBeerStyleGroups } from "@/utils/queryFunctions/beerStyleQueryFunctions";
import { beerStyleKeys } from "@/utils/queryKeys/beerStyleQueryKeys";

const NO_GROUPS: BeerStyleGroup[] = [];

export const useBeerStyleGroupsQuery = () => {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: beerStyleKeys.groups(),
    queryFn: fetchBeerStyleGroups,
    ...queryTimes.infinite,
  });

  return { groups: data ?? NO_GROUPS, isPending, isError, refetch };
};
