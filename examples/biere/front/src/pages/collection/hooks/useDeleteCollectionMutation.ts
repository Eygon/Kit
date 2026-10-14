import { toast } from "@heroui/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import i18n from "@/i18n/i18n";
import { deleteCollection } from "@/utils/queryFunctions/collectionQueryFunctions";
import { collectionKeys } from "@/utils/queryKeys/collectionQueryKeys";

export const useDeleteCollectionMutation = () => {
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: deleteCollection,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: collectionKeys.all(), refetchType: "none" });
      toast.success(i18n.t("pages.collection.deleteSuccess"));
    },
  });

  return { removeCollection: mutateAsync, isRemoving: isPending };
};
