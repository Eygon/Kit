import { toast } from "@heroui/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import i18n from "@/i18n/i18n";
import type { CorrectionVoteSenseEnum } from "@/types/enums/correction/correctionVoteSenseEnum";
import { voteCorrection } from "@/utils/queryFunctions/correctionQueryFunctions";
import { beerKeys } from "@/utils/queryKeys/beerQueryKeys";
import { correctionKeys } from "@/utils/queryKeys/correctionQueryKeys";

type VoteVariables = Readonly<{
  correctionId: number;
  sense: CorrectionVoteSenseEnum;
}>;

export const useVoteCorrectionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ correctionId, sense }: VoteVariables) => voteCorrection(correctionId, sense),
    onSuccess: () => {
      toast.success(i18n.t("corrections.vote.saved"));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: correctionKeys.all() });
      void queryClient.invalidateQueries({ queryKey: beerKeys.all() });
    },
  });
};
