import { toast } from "@heroui/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import i18n from "@/i18n/i18n";
import { createCheckin } from "@/utils/queryFunctions/checkinQueryFunctions";
import { beerKeys } from "@/utils/queryKeys/beerQueryKeys";
import { checkinKeys } from "@/utils/queryKeys/checkinQueryKeys";
import { dexKeys } from "@/utils/queryKeys/dexQueryKeys";
import { venueKeys } from "@/utils/queryKeys/venueQueryKeys";

export const useCreateCheckinMutation = () => {
  const queryClient = useQueryClient();

  const invalidateCheckinData = () => {
    void queryClient.invalidateQueries({ queryKey: beerKeys.all() });
    void queryClient.invalidateQueries({ queryKey: dexKeys.all() });
    void queryClient.invalidateQueries({ queryKey: checkinKeys.all() });
    void queryClient.invalidateQueries({ queryKey: venueKeys.all() });
  };

  const { mutateAsync, isPending } = useMutation({
    mutationFn: createCheckin,
    onSuccess: ({ isFirstDiscovery }) => {
      invalidateCheckinData();
      if (!isFirstDiscovery) toast.success(i18n.t("pages.beerDetail.checkin.saved"));
    },
    onError: (error) => {
      if (error instanceof DOMException && error.name === "TimeoutError") invalidateCheckinData();
    },
  });

  return { saveCheckin: mutateAsync, isSaving: isPending };
};
