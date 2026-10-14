import { useQuery } from "@tanstack/react-query";
import { queryTimes } from "@/config/tanstackQuery";
import { fetchBadges } from "@/utils/queryFunctions/badgeQueryFunctions";
import { badgeKeys } from "@/utils/queryKeys/badgeQueryKeys";

export const useBadgesQuery = () => {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: badgeKeys.me(),
    queryFn: fetchBadges,
    ...queryTimes.default,
  });

  return { badges: data ?? [], isPending, isError, refetch };
};
