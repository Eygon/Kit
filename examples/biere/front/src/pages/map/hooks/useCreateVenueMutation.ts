import { toast } from "@heroui/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import i18n from "@/i18n/i18n";
import type { NewVenue } from "@/types/models/venue/newVenue";
import { createVenue } from "@/utils/queryFunctions/venueQueryFunctions";
import { venueKeys } from "@/utils/queryKeys/venueQueryKeys";

export const useCreateVenueMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newVenue: NewVenue) => createVenue(newVenue),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: venueKeys.lists() });
      toast.success(i18n.t("pages.map.propose.saved"));
    },
  });
};
