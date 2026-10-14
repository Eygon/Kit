import { Alert } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { useOnlineStatus } from "@/components/modules/offlineBanner/hooks/useOnlineStatus";

export const OfflineBanner = () => {
  const { t } = useTranslation();
  const { isOnline } = useOnlineStatus();

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 mx-auto flex w-full max-w-xl justify-center px-4"
    >
      {!isOnline && (
        <Alert status="default">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t("pwa.offline")}</Alert.Title>
          </Alert.Content>
        </Alert>
      )}
    </div>
  );
};
