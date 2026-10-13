import { toast } from "@heroui/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { HttpError } from "@/api/httpError";
import i18n from "@/i18n/i18n";
import { HttpStatusCodeEnum } from "@/types/enums/http/httpStatusCodeEnum";
import type { VoteSenseEnum } from "@/types/enums/venue/voteSenseEnum";
import type { VenueBeer } from "@/types/models/venue/venueBeer";
import { voteVenueBeer } from "@/utils/queryFunctions/venueQueryFunctions";
import { venueKeys } from "@/utils/queryKeys/venueQueryKeys";

type VoteVariables = Readonly<{
  beerId: number;
  sense: VoteSenseEnum;
}>;

export const useVoteMutation = (venueId: number) => {
  const queryClient = useQueryClient();
  const beersKey = venueKeys.beers(venueId);

  return useMutation({
    mutationFn: ({ beerId, sense }: VoteVariables) => voteVenueBeer(venueId, beerId, sense),
    onSuccess: (votedBeer) => {
      queryClient.setQueryData<VenueBeer[]>(beersKey, (current) =>
        current?.map((beer) => (beer.beerId === votedBeer.beerId ? votedBeer : beer)),
      );
      void queryClient.invalidateQueries({ queryKey: venueKeys.lists() });
      toast.success(i18n.t("pages.map.vote.saved"));
    },
    onError: (error) => {
      if (error instanceof HttpError && error.status === HttpStatusCodeEnum.CONFLICT) {
        void queryClient.invalidateQueries({ queryKey: beersKey });
      }
    },
  });
};
