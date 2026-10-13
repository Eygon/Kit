import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import type { DemoUserIdEnum } from "@/types/enums/user/demoUserIdEnum";
import { getCurrentUserId } from "@/utils/currentUser/getCurrentUserId";
import { setCurrentUserId } from "@/utils/currentUser/setCurrentUserId";

export const useCurrentUser = () => {
  const queryClient = useQueryClient();
  const [currentUserId, setCurrentUserIdState] = useState<DemoUserIdEnum>(() => getCurrentUserId());

  const changeCurrentUser = useCallback(
    (userId: DemoUserIdEnum) => {
      setCurrentUserId(userId);
      setCurrentUserIdState(userId);
      void queryClient.invalidateQueries();
    },
    [queryClient],
  );

  return { currentUserId, changeCurrentUser };
};
