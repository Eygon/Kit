import { toast } from "@heroui/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import i18n from "@/i18n/i18n";
import type { Profile } from "@/types/models/profile/profile";
import type { ProfileChanges } from "@/types/models/profile/profileChanges";
import { updateMyProfile } from "@/utils/queryFunctions/profileQueryFunctions";
import { feedKeys } from "@/utils/queryKeys/feedQueryKeys";
import { profileKeys } from "@/utils/queryKeys/profileQueryKeys";

export const useUpdateProfileMutation = () => {
  const queryClient = useQueryClient();
  const isInFlight = useRef(false);

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (changes: ProfileChanges) => updateMyProfile(changes),
    onSuccess: (profile) => {
      queryClient.setQueryData<Profile | null>(profileKeys.detail(profile.id), profile);
      void queryClient.invalidateQueries({ queryKey: profileKeys.all() });
      void queryClient.invalidateQueries({ queryKey: feedKeys.all() });
      toast.success(i18n.t("pages.profile.edit.saved"));
    },
  });

  const saveProfile = async (changes: ProfileChanges): Promise<Profile | null> => {
    if (isInFlight.current) return null;
    isInFlight.current = true;
    try {
      return await mutateAsync(changes);
    } finally {
      isInFlight.current = false;
    }
  };

  return { saveProfile, isPending };
};
