import { useQuery } from "@tanstack/react-query";
import { queryTimes } from "@/config/tanstackQuery";
import { fetchStats } from "@/utils/queryFunctions/statsQueryFunctions";
import { statsKeys } from "@/utils/queryKeys/statsQueryKeys";

export const useStatsQuery = () => {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: statsKeys.me(),
    queryFn: fetchStats,
    ...queryTimes.default,
  });

  return { stats: data ?? null, isPending, isError, refetch };
};
