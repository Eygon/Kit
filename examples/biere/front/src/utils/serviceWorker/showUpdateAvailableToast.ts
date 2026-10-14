import { toast } from "@heroui/react";
import i18n from "@/i18n/i18n";

export const showUpdateAvailableToast = (onRefresh: () => void): string =>
  toast(i18n.t("pwa.updateAvailable"), {
    timeout: 0,
    actionProps: { children: i18n.t("pwa.refresh"), variant: "primary", size: "lg", onPress: onRefresh },
  });
