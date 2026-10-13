import { toast } from "@heroui/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import i18n from "@/i18n/i18n";
import type { Beer } from "@/types/models/beer/beer";
import { addToWishlist, removeFromWishlist } from "@/utils/queryFunctions/wishlistQueryFunctions";
import { beerKeys } from "@/utils/queryKeys/beerQueryKeys";

type WishlistToggleVariables = Readonly<{ beerId: number; isInWishlist: boolean }>;

export const useWishlistToggle = (beerId: number | null) => {
  const queryClient = useQueryClient();
  const isInFlight = useRef(false);

  const { mutate, isPending } = useMutation({
    mutationFn: async ({ beerId: targetId, isInWishlist }: WishlistToggleVariables): Promise<void> => {
      if (isInWishlist) await addToWishlist(targetId);
      else await removeFromWishlist(targetId);
    },
    onMutate: async ({ beerId: targetId, isInWishlist }) => {
      const detailKey = beerKeys.detail(targetId);
      await queryClient.cancelQueries({ queryKey: detailKey });
      const previous = queryClient.getQueryData<Beer | null>(detailKey);
      queryClient.setQueryData<Beer | null>(detailKey, (current) => (current ? { ...current, inWishlist: isInWishlist } : current));
      return { previous };
    },
    onError: (_error, { beerId: targetId }, context) => {
      if (context?.previous !== undefined) queryClient.setQueryData(beerKeys.detail(targetId), context.previous);
    },
    onSuccess: (_data, { isInWishlist }) => {
      toast.success(i18n.t(isInWishlist ? "pages.beerDetail.wishlist.added" : "pages.beerDetail.wishlist.removed"));
    },
    onSettled: () => {
      isInFlight.current = false;
      void queryClient.invalidateQueries({ queryKey: beerKeys.all() });
    },
  });

  const toggleWishlist = (isInWishlist: boolean) => {
    if (beerId === null || isInFlight.current) return;
    isInFlight.current = true;
    mutate({ beerId, isInWishlist });
  };

  return { toggleWishlist, isPending };
};
