import { Alert, Button, Drawer, Skeleton } from "@heroui/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AvailabilityBadge } from "@/components/elements/availabilityBadge/availabilityBadge";
import { EmptyStatePanel } from "@/components/elements/emptyStatePanel/emptyStatePanel";
import { formatDistance } from "@/pages/map/utils/formatDistance";
import type { VenueListDrawerProps } from "@/pages/map/types/venueListDrawer";
import type { Venue } from "@/types/models/venue/venue";
import { MascotMoodEnum } from "@/types/enums/mascot/mascotMoodEnum";
import { VENUE_TYPE_LABEL_KEYS } from "@/types/enums/venue/venueTypeEnum";

const SKELETON_ROW_COUNT = 5;
const SKELETON_ROW_KEYS = Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => index);

export const VenueListDrawer = ({
  venues,
  isPending,
  isError,
  onRetry,
  onSelectVenue,
  isOpen: controlledIsOpen,
  onOpenChange,
}: VenueListDrawerProps) => {
  const { t, i18n } = useTranslation();
  const [ownIsOpen, setOwnIsOpen] = useState(false);
  const isOpen = controlledIsOpen ?? ownIsOpen;

  const handleOpenChange = (nextIsOpen: boolean) => {
    setOwnIsOpen(nextIsOpen);
    onOpenChange?.(nextIsOpen);
  };

  const handleSelect = (venue: Venue) => {
    handleOpenChange(false);
    onSelectVenue(venue);
  };

  const renderContent = () => {
    if (isPending)
      return (
        <div className="flex min-w-0 flex-col gap-3" aria-busy="true">
          {SKELETON_ROW_KEYS.map((key) => (
            <div
              key={key}
              data-testid="venue-row-skeleton"
              className="flex flex-col gap-2 rounded-mousse border-mousse bg-surface p-3"
            >
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      );
    if (isError)
      return (
        <Alert status="danger" role="alert">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t("pages.map.list.errorTitle")}</Alert.Title>
          </Alert.Content>
          <Button size="lg" variant="danger-soft" onPress={onRetry}>
            {t("common.retry")}
          </Button>
        </Alert>
      );
    if (venues.length === 0)
      return (
        <EmptyStatePanel
          mood={MascotMoodEnum.SEARCHING}
          title={t("pages.map.list.emptyTitle")}
          description={t("pages.map.list.emptyDescription")}
        />
      );
    return (
      <ul className="flex min-w-0 flex-col gap-3">
        {venues.map((venue) => (
          <li key={venue.id} className="min-w-0">
            <Button
              variant="ghost"
              className="h-auto min-h-11 w-full min-w-0 flex-col items-start justify-start gap-1 p-3 text-left"
              onPress={() => handleSelect(venue)}
            >
              <span className="min-w-0 font-bold break-words text-foreground">{venue.name}</span>
              <span className="flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-sm text-muted">
                {venue.type !== null && <span>{t(VENUE_TYPE_LABEL_KEYS[venue.type])}</span>}
                {venue.city !== "" && <span className="min-w-0 break-words">{venue.city}</span>}
                {venue.distanceKm !== null && <span>{formatDistance(venue.distanceKm, i18n.language)}</span>}
              </span>
              <AvailabilityBadge status={venue.status} />
            </Button>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <Drawer isOpen={isOpen} onOpenChange={handleOpenChange}>
      <Button variant="secondary" size="lg" className="self-start">
        {t("pages.map.list.trigger", { count: venues.length })}
      </Button>
      <Drawer.Backdrop>
        <Drawer.Content placement="bottom">
          <Drawer.Dialog>
            <Drawer.Handle />
            <Drawer.Header>
              <Drawer.Heading>{t("pages.map.list.title")}</Drawer.Heading>
            </Drawer.Header>
            <Drawer.Body className="flex max-h-[60dvh] min-w-0 flex-col gap-3 overflow-y-auto p-1">
              {renderContent()}
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
};
