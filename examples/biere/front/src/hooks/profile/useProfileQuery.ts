import { skipToken, useQuery } from "@tanstack/react-query";
import { queryTimes } from "@/config/tanstackQuery";
import { fetchProfile } from "@/utils/queryFunctions/profileQueryFunctions";
import { profileKeys } from "@/utils/queryKeys/profileQueryKeys";

export const useProfileQuery = (userId: number | null) => {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: profileKeys.detail(userId ?? 0),
    queryFn: userId === null ? skipToken : () => fetchProfile(userId),
    enabled: userId !== null,
    ...queryTimes.short,
  });

  return { profile: data ?? null, isPending, isError, refetch };
};
