import { Chip } from "@heroui/react";
import { useTranslation } from "react-i18next";
import type { VenueBeerStampProps } from "@/pages/map/types/venueBeerStamp";

export const VenueBeerStamp = ({ drunk, checkinCount, lastCheckinAt }: VenueBeerStampProps) => {
  const { t, i18n } = useTranslation();

  if (!drunk) {
    return (
      <Chip color="default" variant="secondary">
        {t("pages.map.venueBeers.stamp.undiscovered")}
      </Chip>
    );
  }

  return (
    <div className="flex min-w-0 flex-col items-start gap-1">
      <Chip color="accent" variant="primary" className="-rotate-3">
        {t("pages.map.venueBeers.stamp.drunk")}
      </Chip>
      <span className="min-w-0 text-sm break-words text-muted">
        {lastCheckinAt === null
          ? t("pages.map.venueBeers.stamp.count", { count: checkinCount })
          : t("pages.map.venueBeers.stamp.countWithDate", {
              count: checkinCount,
              date: new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" }).format(lastCheckinAt),
            })}
      </span>
    </div>
  );
};
