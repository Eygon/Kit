import { useQuery } from "@tanstack/react-query";
import { queryTimes } from "@/config/tanstackQuery";
import { fetchUserCollections } from "@/utils/queryFunctions/collectionQueryFunctions";
import { collectionKeys } from "@/utils/queryKeys/collectionQueryKeys";

export const useUserCollectionsQuery = (userId: number, isEnabled: boolean) => {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: collectionKeys.list(userId),
    queryFn: () => fetchUserCollections(userId),
    enabled: isEnabled,
    ...queryTimes.short,
  });

  return { collections: data ?? [], isPending, isError, refetch };
};
