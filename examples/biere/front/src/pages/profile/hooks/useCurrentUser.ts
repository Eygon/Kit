import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import type { DemoUserIdEnum } from "@/types/enums/user/demoUserIdEnum";
import { getCurrentUserId } from "@/utils/currentUser/getCurrentUserId";
import { setCurrentUserId } from "@/utils/currentUser/setCurrentUserId";
import { clearApiCache } from "@/utils/serviceWorker/clearApiCache";

export const useCurrentUser = () => {
  const queryClient = useQueryClient();
  const [currentUserId, setCurrentUserIdState] = useState<DemoUserIdEnum>(() => getCurrentUserId());

  const changeCurrentUser = useCallback(
    (userId: DemoUserIdEnum) => {
      setCurrentUserId(userId);
      setCurrentUserIdState(userId);
      // resetQueries (et non invalidateQueries) : les cles de requete ne dependent pas de l'utilisateur, et hors ligne le refetch echoue :
      // invalidateQueries laisserait alors a Bob les donnees d'Alice.
      void clearApiCache().then(() => queryClient.resetQueries());
    },
    [queryClient],
  );

  return { currentUserId, changeCurrentUser };
};
