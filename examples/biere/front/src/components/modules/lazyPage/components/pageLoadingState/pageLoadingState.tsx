import { Skeleton } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { Mascot } from "@/components/elements/mascot/mascot";
import { MascotMoodEnum } from "@/types/enums/mascot/mascotMoodEnum";
import { MascotSizeEnum } from "@/types/enums/mascot/mascotSizeEnum";

export const PageLoadingState = () => {
  const { t } = useTranslation();

  return (
    <div role="status" aria-live="polite" aria-busy="true" className="flex flex-1 flex-col gap-4">
      <Skeleton className="h-9 w-48 max-w-full rounded-control" />
      <div className="flex flex-1 flex-col items-center justify-center gap-2">
        <Mascot mood={MascotMoodEnum.SEARCHING} size={MascotSizeEnum.MD} isDecorative />
        <p className="text-center text-sm text-muted">{t("lazyPage.loadingLabel")}</p>
      </div>
    </div>
  );
};
