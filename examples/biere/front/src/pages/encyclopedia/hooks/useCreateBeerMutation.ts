import { toast } from "@heroui/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import i18n from "@/i18n/i18n";
import type { NewBeer } from "@/types/models/beer/newBeer";
import { createBeer } from "@/utils/queryFunctions/beerQueryFunctions";
import { beerKeys } from "@/utils/queryKeys/beerQueryKeys";

export const useCreateBeerMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newBeer: NewBeer) => createBeer(newBeer),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: beerKeys.all() });
      toast.success(i18n.t("pages.encyclopedia.propose.saved"));
    },
  });
};
