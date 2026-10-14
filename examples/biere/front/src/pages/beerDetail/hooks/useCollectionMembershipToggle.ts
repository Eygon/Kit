import { toast } from "@heroui/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import i18n from "@/i18n/i18n";
import type { MyCollection } from "@/types/mappers/collection/myCollectionMapper";
import type { Beer } from "@/types/models/beer/beer";
import { addCollectionBeer, removeCollectionBeer } from "@/utils/queryFunctions/collectionQueryFunctions";
import { addToWishlist, removeFromWishlist } from "@/utils/queryFunctions/wishlistQueryFunctions";
import { beerKeys } from "@/utils/queryKeys/beerQueryKeys";
import { collectionKeys } from "@/utils/queryKeys/collectionQueryKeys";

type MembershipVariables = Readonly<{ beerId: number; collection: MyCollection; isMember: boolean }>;

const getMembershipKey = (collection: MyCollection): string => String(collection.id ?? collection.kind);

const isWishlist = (collection: MyCollection): boolean => collection.id === null;

export const useCollectionMembershipToggle = (beerId: number | null) => {
  const queryClient = useQueryClient();
  const inFlightKeys = useRef(new Set<string>());
  const [pendingKeys, setPendingKeys] = useState<readonly string[]>([]);

  const { mutateAsync } = useMutation({
    mutationFn: async ({ beerId: targetId, collection, isMember }: MembershipVariables): Promise<void> => {
      if (collection.id === null) {
        if (isMember) await addToWishlist(targetId);
        else await removeFromWishlist(targetId);
        return;
      }
      if (isMember) await addCollectionBeer(collection.id, targetId);
      else await removeCollectionBeer(collection.id, targetId);
    },
    onSuccess: (_data, { collection, isMember }) => {
      queryClient.setQueryData<MyCollection[]>(collectionKeys.mine(beerId), (current) =>
        current?.map((entry) => (getMembershipKey(entry) === getMembershipKey(collection) ? { ...entry, containsBeer: isMember } : entry)),
      );
      if (isWishlist(collection)) {
        queryClient.setQueryData<Beer | null>(beerKeys.detail(beerId), (current) => (current ? { ...current, inWishlist: isMember } : current));
        toast.success(i18n.t(isMember ? "pages.beerDetail.wishlist.added" : "pages.beerDetail.wishlist.removed"));
      } else {
        toast.success(i18n.t(isMember ? "pages.beerDetail.collections.added" : "pages.beerDetail.collections.removed", { name: collection.name }));
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: collectionKeys.all() });
      void queryClient.invalidateQueries({ queryKey: beerKeys.all() });
    },
  });

  const toggleMembership = async (collection: MyCollection, isMember: boolean): Promise<void> => {
    const key = getMembershipKey(collection);
    if (beerId === null || inFlightKeys.current.has(key)) return;
    inFlightKeys.current.add(key);
    setPendingKeys((current) => [...current, key]);
    try {
      await mutateAsync({ beerId, collection, isMember });
    } catch {
      return;
    } finally {
      inFlightKeys.current.delete(key);
      setPendingKeys((current) => current.filter((pendingKey) => pendingKey !== key));
    }
  };

  const isTogglePending = (collection: MyCollection): boolean => pendingKeys.includes(getMembershipKey(collection));

  return { toggleMembership, isTogglePending };
};
