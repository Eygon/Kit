import { toast } from "@heroui/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import i18n from "@/i18n/i18n";
import type { NewCorrection } from "@/types/models/correction/newCorrection";
import { proposeCorrection } from "@/utils/queryFunctions/correctionQueryFunctions";
import { correctionKeys } from "@/utils/queryKeys/correctionQueryKeys";

export const useProposeCorrectionMutation = (beerId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newCorrection: NewCorrection) => proposeCorrection(beerId, newCorrection),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: correctionKeys.all() });
      toast.success(i18n.t("corrections.propose.saved"));
    },
  });
};
