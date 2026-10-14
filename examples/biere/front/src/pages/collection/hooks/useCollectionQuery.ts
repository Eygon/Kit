import { useQuery } from "@tanstack/react-query";
import { queryTimes } from "@/config/tanstackQuery";
import { fetchUserCollection, fetchUserWishlist } from "@/utils/queryFunctions/collectionQueryFunctions";
import { collectionKeys } from "@/utils/queryKeys/collectionQueryKeys";

export const useCollectionQuery = (userId: number | null, collectionId: number | null) => {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: collectionId === null ? collectionKeys.wishlist(userId ?? 0) : collectionKeys.detail(userId ?? 0, collectionId),
    queryFn: () => (collectionId === null ? fetchUserWishlist(userId ?? 0) : fetchUserCollection(userId ?? 0, collectionId)),
    enabled: userId !== null,
    ...queryTimes.short,
  });

  return { collection: data ?? null, isPending, isError, refetch };
};
