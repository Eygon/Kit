import { toast } from "@heroui/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import i18n from "@/i18n/i18n";
import { updateCheckin } from "@/utils/queryFunctions/checkinQueryFunctions";
import { badgeKeys } from "@/utils/queryKeys/badgeQueryKeys";
import { beerKeys } from "@/utils/queryKeys/beerQueryKeys";
import { checkinKeys } from "@/utils/queryKeys/checkinQueryKeys";
import { dexKeys } from "@/utils/queryKeys/dexQueryKeys";
import { feedKeys } from "@/utils/queryKeys/feedQueryKeys";
import { statsKeys } from "@/utils/queryKeys/statsQueryKeys";
import { venueKeys } from "@/utils/queryKeys/venueQueryKeys";

export const useUpdateCheckinMutation = () => {
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: updateCheckin,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: checkinKeys.all() });
      void queryClient.invalidateQueries({ queryKey: beerKeys.all() });
      void queryClient.invalidateQueries({ queryKey: dexKeys.all() });
      void queryClient.invalidateQueries({ queryKey: venueKeys.all() });
      void queryClient.invalidateQueries({ queryKey: statsKeys.all() });
      void queryClient.invalidateQueries({ queryKey: feedKeys.all() });
      void queryClient.invalidateQueries({ queryKey: badgeKeys.all() });
      toast.success(i18n.t("checkinSheet.edit.saved"));
    },
  });

  return { updateCheckin: mutateAsync, isUpdating: isPending };
};
