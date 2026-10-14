import { toast } from "@heroui/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { HttpError } from "@/api/httpError";
import i18n from "@/i18n/i18n";
import { HttpStatusCodeEnum } from "@/types/enums/http/httpStatusCodeEnum";
import { reportVenueBeer } from "@/utils/queryFunctions/venueQueryFunctions";
import { venueKeys } from "@/utils/queryKeys/venueQueryKeys";

export const useReportBeerMutation = (venueId: number) => {
  const queryClient = useQueryClient();
  const beersKey = venueKeys.beers(venueId);

  return useMutation({
    mutationFn: (beerId: number) => reportVenueBeer(venueId, beerId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: beersKey });
      toast.success(i18n.t("pages.map.report.saved"));
    },
    onError: (error) => {
      if (error instanceof HttpError && error.status === HttpStatusCodeEnum.CONFLICT) {
        void queryClient.invalidateQueries({ queryKey: beersKey });
      }
    },
  });
};
