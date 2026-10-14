import { Label, Switch } from "@heroui/react";
import { useTranslation } from "react-i18next";
import type { VenueDiscoverySummaryProps } from "@/pages/map/types/venueDiscoverySummary";

export const VenueDiscoverySummary = ({ undiscoveredCount, isUndrunkOnly, onUndrunkOnlyChange }: VenueDiscoverySummaryProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p aria-live="polite" className="min-w-0 font-bold break-words text-foreground">
        {undiscoveredCount > 0
          ? t("pages.map.venueBeers.discovery.count", { count: undiscoveredCount })
          : t("pages.map.venueBeers.discovery.allTasted")}
      </p>
      <Switch isSelected={isUndrunkOnly} onChange={onUndrunkOnlyChange} className="w-full">
        <Switch.Content className="min-h-11 w-full flex-row gap-3">
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          <Label className="min-w-0 break-words">{t("pages.map.venueBeers.discovery.undrunkOnly")}</Label>
        </Switch.Content>
      </Switch>
    </div>
  );
};
