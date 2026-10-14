import { useQuery } from "@tanstack/react-query";
import { queryTimes } from "@/config/tanstackQuery";
import type { FollowListKindEnum } from "@/types/enums/user/followListKindEnum";
import { fetchFollowList } from "@/utils/queryFunctions/profileQueryFunctions";
import { profileKeys } from "@/utils/queryKeys/profileQueryKeys";

export const useFollowListQuery = (userId: number, kind: FollowListKindEnum, isEnabled: boolean) => {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: profileKeys.followList(userId, kind),
    queryFn: () => fetchFollowList(userId, kind),
    enabled: isEnabled,
    ...queryTimes.short,
  });

  return { profiles: data ?? [], isPending, isError, refetch };
};
