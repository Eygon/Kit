import { toast } from "@heroui/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import i18n from "@/i18n/i18n";
import { saveReview } from "@/utils/queryFunctions/reviewQueryFunctions";
import { beerKeys } from "@/utils/queryKeys/beerQueryKeys";
import { reviewKeys } from "@/utils/queryKeys/reviewQueryKeys";

export const useSaveReviewMutation = () => {
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: saveReview,
    onSuccess: (_review, { beerId }) => {
      void queryClient.invalidateQueries({ queryKey: beerKeys.all() });
      void queryClient.invalidateQueries({ queryKey: reviewKeys.list(beerId) });
      toast.success(i18n.t("pages.beerDetail.reviews.sheet.saved"));
    },
  });

  return { saveReview: mutateAsync, isSaving: isPending };
};
