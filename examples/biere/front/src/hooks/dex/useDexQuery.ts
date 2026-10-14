import { useQuery } from "@tanstack/react-query";
import { queryTimes } from "@/config/tanstackQuery";
import { fetchDex } from "@/utils/queryFunctions/dexQueryFunctions";
import { dexKeys } from "@/utils/queryKeys/dexQueryKeys";

export const useDexQuery = () => {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: dexKeys.me(),
    queryFn: fetchDex,
    ...queryTimes.short,
  });

  return { dex: data ?? null, isPending, isError, refetch };
};
