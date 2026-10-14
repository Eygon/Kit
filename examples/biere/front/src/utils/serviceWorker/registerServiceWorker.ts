import type { RegisterServiceWorkerOptions } from "@/types/serviceWorker/registerServiceWorkerOptions";
import { showUpdateAvailableToast } from "@/utils/serviceWorker/showUpdateAvailableToast";

export const registerServiceWorker = async ({ isEnabled, loadRegisterSW }: RegisterServiceWorkerOptions): Promise<void> => {
  if (!isEnabled) {
    return;
  }
  try {
    const { registerSW } = await loadRegisterSW();
    let isPromptShown = false;
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh: () => {
        if (isPromptShown) {
          return;
        }
        isPromptShown = true;
        showUpdateAvailableToast(() => void updateSW(true));
      },
    });
  } catch {
    return;
  }
};
