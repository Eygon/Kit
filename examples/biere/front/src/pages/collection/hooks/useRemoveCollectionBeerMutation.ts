import { toast } from "@heroui/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import i18n from "@/i18n/i18n";
import { removeCollectionBeer } from "@/utils/queryFunctions/collectionQueryFunctions";
import { removeFromWishlist } from "@/utils/queryFunctions/wishlistQueryFunctions";
import { beerKeys } from "@/utils/queryKeys/beerQueryKeys";
import { collectionKeys } from "@/utils/queryKeys/collectionQueryKeys";
import { wishlistKeys } from "@/utils/queryKeys/wishlistQueryKeys";

type RemoveBeerVariables = Readonly<{ collectionId: number | null; beerId: number }>;

export const useRemoveCollectionBeerMutation = () => {
  const queryClient = useQueryClient();
  const inFlightBeerIds = useRef(new Set<number>());
  const [removingBeerIds, setRemovingBeerIds] = useState<number[]>([]);

  const { mutateAsync } = useMutation({
    mutationFn: ({ collectionId, beerId }: RemoveBeerVariables) =>
      collectionId === null ? removeFromWishlist(beerId) : removeCollectionBeer(collectionId, beerId),
    onSuccess: (_data, { collectionId }) => {
      void queryClient.invalidateQueries({ queryKey: collectionKeys.all() });
      if (collectionId === null) {
        void queryClient.invalidateQueries({ queryKey: wishlistKeys.all() });
        void queryClient.invalidateQueries({ queryKey: beerKeys.all() });
      }
      toast.success(i18n.t("pages.collection.removeSuccess"));
    },
  });

  const removeBeer = async (collectionId: number | null, beerId: number): Promise<void> => {
    if (inFlightBeerIds.current.has(beerId)) return;
    inFlightBeerIds.current.add(beerId);
    setRemovingBeerIds((current) => [...current, beerId]);
    try {
      await mutateAsync({ collectionId, beerId });
    } finally {
      inFlightBeerIds.current.delete(beerId);
      setRemovingBeerIds((current) => current.filter((id) => id !== beerId));
    }
  };

  return { removeBeer, removingBeerIds };
};
