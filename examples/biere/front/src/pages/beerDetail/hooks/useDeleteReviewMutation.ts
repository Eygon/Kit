import { toast } from "@heroui/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import i18n from "@/i18n/i18n";
import { deleteReview } from "@/utils/queryFunctions/reviewQueryFunctions";
import { beerKeys } from "@/utils/queryKeys/beerQueryKeys";
import { reviewKeys } from "@/utils/queryKeys/reviewQueryKeys";

export const useDeleteReviewMutation = () => {
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: deleteReview,
    onSuccess: (_data, beerId) => {
      void queryClient.invalidateQueries({ queryKey: beerKeys.all() });
      void queryClient.invalidateQueries({ queryKey: reviewKeys.list(beerId) });
      toast.success(i18n.t("pages.beerDetail.reviews.delete.done"));
    },
  });

  return { removeReview: mutateAsync, isRemoving: isPending };
};
