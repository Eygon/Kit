import { useTranslation } from "react-i18next";
import type { VenueVisitSummaryProps } from "@/pages/map/types/venueVisitSummary";

export const VenueVisitSummary = ({ checkinCount, lastCheckinAt }: VenueVisitSummaryProps) => {
  const { t, i18n } = useTranslation();

  if (checkinCount === 0) return null;

  return (
    <p className="min-w-0 break-words font-bold text-foreground">
      {lastCheckinAt === null
        ? t("pages.map.venue.visits.count", { count: checkinCount })
        : t("pages.map.venue.visits.countWithDate", {
            count: checkinCount,
            date: new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" }).format(lastCheckinAt),
          })}
    </p>
  );
};
