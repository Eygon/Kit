import { useSyncExternalStore } from "react";
import type { OnlineStatus } from "@/components/modules/offlineBanner/types/onlineStatus";

const subscribe = (onChange: () => void) => {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
};

const getSnapshot = () => navigator.onLine;

const getServerSnapshot = () => true;

export const useOnlineStatus = (): OnlineStatus => {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return { isOnline };
};
