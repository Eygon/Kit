import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import type { CollectionSummary } from "@/types/models/collection/collectionSummary";
import { renameCollection } from "@/utils/queryFunctions/collectionQueryFunctions";
import { collectionKeys } from "@/utils/queryKeys/collectionQueryKeys";

type RenameVariables = Readonly<{ collectionId: number; name: string }>;

export const useRenameCollectionMutation = () => {
  const queryClient = useQueryClient();
  const isInFlight = useRef(false);

  const { mutateAsync, isPending } = useMutation({
    mutationFn: ({ collectionId, name }: RenameVariables) => renameCollection(collectionId, name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: collectionKeys.all() });
    },
  });

  const rename = async (collectionId: number, name: string): Promise<CollectionSummary | null> => {
    if (isInFlight.current) return null;
    isInFlight.current = true;
    try {
      return await mutateAsync({ collectionId, name });
    } finally {
      isInFlight.current = false;
    }
  };

  return { renameCollection: rename, isPending };
};
