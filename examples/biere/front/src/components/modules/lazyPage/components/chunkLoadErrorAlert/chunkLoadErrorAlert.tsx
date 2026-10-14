import { Alert, Button } from "@heroui/react";
import { useTranslation } from "react-i18next";
import type { ChunkLoadErrorAlertProps } from "@/components/modules/lazyPage/types/chunkLoadErrorAlert";

export const ChunkLoadErrorAlert = ({ onRetry }: ChunkLoadErrorAlertProps) => {
  const { t } = useTranslation();

  return (
    <Alert status="danger" role="alert">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{t("lazyPage.errorTitle")}</Alert.Title>
        <Alert.Description>{t("lazyPage.errorDescription")}</Alert.Description>
      </Alert.Content>
      <Button size="lg" variant="danger-soft" onPress={onRetry}>
        {t("common.retry")}
      </Button>
    </Alert>
  );
};
