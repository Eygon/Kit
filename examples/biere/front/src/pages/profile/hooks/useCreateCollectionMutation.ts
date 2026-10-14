import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import type { CollectionSummary } from "@/types/models/collection/collectionSummary";
import { isConflictError } from "@/utils/httpError/isConflictError";
import { createCollection } from "@/utils/queryFunctions/collectionQueryFunctions";
import { collectionKeys } from "@/utils/queryKeys/collectionQueryKeys";

export const useCreateCollectionMutation = () => {
  const queryClient = useQueryClient();
  const isInFlight = useRef(false);

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (name: string) => createCollection(name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: collectionKeys.all() });
    },
    onError: (error) => {
      if (isConflictError(error))
        void queryClient.invalidateQueries({ queryKey: collectionKeys.all() });
    },
  });

  const create = async (name: string): Promise<CollectionSummary | null> => {
    if (isInFlight.current) return null;
    isInFlight.current = true;
    try {
      return await mutateAsync(name);
    } finally {
      isInFlight.current = false;
    }
  };

  return { createCollection: create, isPending };
};
