import { Alert } from "@heroui/react";
import { useTranslation } from "react-i18next";
import type { MapBannerProps } from "@/pages/map/types/mapBanner";

export const MapBanner = ({ message, children }: MapBannerProps) => {
  const { t } = useTranslation();

  return (
    <Alert
      status={message.isError ? "danger" : "default"}
      role={message.isError ? "alert" : undefined}
      className="pointer-events-auto"
    >
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{t(message.key)}</Alert.Title>
      </Alert.Content>
      {children}
    </Alert>
  );
};
