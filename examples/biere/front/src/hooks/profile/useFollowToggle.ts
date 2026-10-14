import { toast } from "@heroui/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import i18n from "@/i18n/i18n";
import type { ProfileSummary } from "@/types/models/profile/profileSummary";
import { followUser, unfollowUser } from "@/utils/queryFunctions/profileQueryFunctions";
import { feedKeys } from "@/utils/queryKeys/feedQueryKeys";
import { profileKeys } from "@/utils/queryKeys/profileQueryKeys";

export const useFollowToggle = (userId: number, displayName: string) => {
  const queryClient = useQueryClient();
  const isInFlight = useRef(false);

  const { mutate, isPending } = useMutation({
    mutationFn: async (isFollowed: boolean): Promise<void> => {
      if (isFollowed) await followUser(userId);
      else await unfollowUser(userId);
    },
    onMutate: async (isFollowed) => {
      const listKey = profileKeys.list();
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<ProfileSummary[]>(listKey);
      queryClient.setQueryData<ProfileSummary[]>(listKey, (current) =>
        current?.map((profile) => (profile.id === userId ? { ...profile, isFollowed } : profile)),
      );
      return { previous };
    },
    onError: (_error, _isFollowed, context) => {
      if (context?.previous !== undefined) queryClient.setQueryData(profileKeys.list(), context.previous);
    },
    onSuccess: (_data, isFollowed) => {
      toast.success(i18n.t(isFollowed ? "follow.followed" : "follow.unfollowed", { name: displayName }));
    },
    onSettled: () => {
      isInFlight.current = false;
      void queryClient.invalidateQueries({ queryKey: profileKeys.all() });
      void queryClient.invalidateQueries({ queryKey: feedKeys.all() });
    },
  });

  const toggleFollow = (isFollowed: boolean) => {
    if (isInFlight.current) return;
    isInFlight.current = true;
    mutate(isFollowed);
  };

  return { toggleFollow, isPending };
};
