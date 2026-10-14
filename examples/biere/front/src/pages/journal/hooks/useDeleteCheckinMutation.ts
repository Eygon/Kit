import { toast } from "@heroui/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import i18n from "@/i18n/i18n";
import { deleteCheckin } from "@/utils/queryFunctions/checkinQueryFunctions";
import { beerKeys } from "@/utils/queryKeys/beerQueryKeys";
import { checkinKeys } from "@/utils/queryKeys/checkinQueryKeys";
import { dexKeys } from "@/utils/queryKeys/dexQueryKeys";
import { venueKeys } from "@/utils/queryKeys/venueQueryKeys";

export const useDeleteCheckinMutation = () => {
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: deleteCheckin,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: checkinKeys.all() });
      void queryClient.invalidateQueries({ queryKey: beerKeys.all() });
      void queryClient.invalidateQueries({ queryKey: dexKeys.all() });
      void queryClient.invalidateQueries({ queryKey: venueKeys.all() });
      toast.success(i18n.t("pages.journal.delete.done"));
    },
  });

  return { removeCheckin: mutateAsync, isRemoving: isPending };
};
