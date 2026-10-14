import { useQuery } from "@tanstack/react-query";
import { queryTimes } from "@/config/tanstackQuery";
import { fetchProfiles } from "@/utils/queryFunctions/profileQueryFunctions";
import { profileKeys } from "@/utils/queryKeys/profileQueryKeys";

export const useProfilesQuery = () => {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: profileKeys.list(),
    queryFn: fetchProfiles,
    ...queryTimes.short,
  });

  return { profiles: data ?? [], isPending, isError, refetch };
};
