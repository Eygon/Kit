import { skipToken, useQuery } from "@tanstack/react-query";
import { queryTimes } from "@/config/tanstackQuery";
import { fetchMyCollections } from "@/utils/queryFunctions/collectionQueryFunctions";
import { collectionKeys } from "@/utils/queryKeys/collectionQueryKeys";

export const useMyCollectionsQuery = (beerId: number | null, isEnabled: boolean) => {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: collectionKeys.mine(beerId),
    queryFn: beerId === null ? skipToken : () => fetchMyCollections(beerId),
    enabled: isEnabled && beerId !== null,
    retry: false,
    ...queryTimes.default,
  });

  return { collections: data ?? [], isPending, isError, refetch };
};
