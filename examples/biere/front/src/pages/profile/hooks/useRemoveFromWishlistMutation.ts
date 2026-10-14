import { toast } from "@heroui/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import i18n from "@/i18n/i18n";
import type { WishlistItem } from "@/types/models/wishlist/wishlistItem";
import { removeFromWishlist } from "@/utils/queryFunctions/wishlistQueryFunctions";
import { beerKeys } from "@/utils/queryKeys/beerQueryKeys";
import { wishlistKeys } from "@/utils/queryKeys/wishlistQueryKeys";

export const useRemoveFromWishlistMutation = () => {
  const queryClient = useQueryClient();
  const isInFlight = useRef(false);

  const { mutate, isPending, variables } = useMutation({
    mutationFn: (beerId: number) => removeFromWishlist(beerId),
    onSuccess: (_data, beerId) => {
      queryClient.setQueryData<WishlistItem[]>(wishlistKeys.me(), (current) => current?.filter((item) => item.beerId !== beerId));
      toast.success(i18n.t("pages.profile.wishlist.removed"));
    },
    onSettled: () => {
      isInFlight.current = false;
      void queryClient.invalidateQueries({ queryKey: wishlistKeys.all() });
      void queryClient.invalidateQueries({ queryKey: beerKeys.all() });
    },
  });

  const removeItem = (beerId: number) => {
    if (isInFlight.current) return;
    isInFlight.current = true;
    mutate(beerId);
  };

  return { removeItem, pendingBeerId: isPending ? variables : null };
};
