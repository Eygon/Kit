import { ProgressCircle } from "@heroui/react";
import { useTranslation } from "react-i18next";
import type { DiscoveryProgressProps } from "@/pages/encyclopedia/types/discoveryProgress";

export const DiscoveryProgress = ({ discovered, total }: DiscoveryProgressProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-4">
      <ProgressCircle
        aria-label={t("pages.encyclopedia.progress.ringLabel")}
        value={discovered}
        maxValue={total}
        color="accent"
        size="lg"
      >
        <ProgressCircle.Track>
          <ProgressCircle.TrackCircle />
          <ProgressCircle.FillCircle />
        </ProgressCircle.Track>
      </ProgressCircle>
      <p className="font-display text-2xl">{t("pages.encyclopedia.progress.label", { discovered, total })}</p>
    </div>
  );
};
