import { useQuery } from "@tanstack/react-query";
import { queryTimes } from "@/config/tanstackQuery";
import { fetchWishlist } from "@/utils/queryFunctions/wishlistQueryFunctions";
import { wishlistKeys } from "@/utils/queryKeys/wishlistQueryKeys";

export const useWishlistQuery = () => {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: wishlistKeys.me(),
    queryFn: fetchWishlist,
    ...queryTimes.default,
  });

  return { items: data ?? [], isPending, isError, refetch };
};
