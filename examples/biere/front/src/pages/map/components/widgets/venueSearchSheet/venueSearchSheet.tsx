import { Magnifier } from "@gravity-ui/icons";
import { Alert, Button, Drawer, SearchField, Skeleton } from "@heroui/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { EmptyStatePanel } from "@/components/elements/emptyStatePanel/emptyStatePanel";
import { useVenueSearch } from "@/pages/map/hooks/useVenueSearch";
import type { VenueSearchSheetProps } from "@/pages/map/types/venueSearchSheet";
import { formatDistance } from "@/pages/map/utils/formatDistance";
import {
  MAP_TOOLBAR_CONTROL_CLASSES,
  VENUE_SEARCH_MAX_LENGTH,
} from "@/pages/map/utils/mapConstants";
import { MascotMoodEnum } from "@/types/enums/mascot/mascotMoodEnum";
import { VENUE_TYPE_LABEL_KEYS } from "@/types/enums/venue/venueTypeEnum";
import type { Venue } from "@/types/models/venue/venue";

const SKELETON_ROW_COUNT = 5;
const SKELETON_ROW_KEYS = Array.from(
  { length: SKELETON_ROW_COUNT },
  (_, index) => index,
);

export const VenueSearchSheet = ({
  filterQuery,
  activeFilterCount,
  onSelectVenue,
}: VenueSearchSheetProps) => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const {
    searchText,
    setSearchText,
    venues,
    isIdle,
    isPending,
    isError,
    refetch,
  } = useVenueSearch(filterQuery);

  const handleSelect = (venue: Venue) => {
    setIsOpen(false);
    onSelectVenue(venue);
  };

  const renderContent = () => {
    if (isIdle)
      return <p className="text-muted">{t("pages.map.search.hint")}</p>;
    if (isPending)
      return (
        <div className="flex min-w-0 flex-col gap-3" aria-busy="true">
          {SKELETON_ROW_KEYS.map((key) => (
            <div
              key={key}
              data-testid="venue-search-row-skeleton"
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
            <Alert.Title>{t("pages.map.search.errorTitle")}</Alert.Title>
          </Alert.Content>
          <Button
            size="lg"
            variant="danger-soft"
            onPress={() => void refetch()}
          >
            {t("common.retry")}
          </Button>
        </Alert>
      );
    if (venues.length === 0)
      return (
        <EmptyStatePanel
          mood={MascotMoodEnum.SEARCHING}
          title={t("pages.map.search.emptyTitle")}
          description={t(
            activeFilterCount > 0
              ? "pages.map.search.emptyWithFilters"
              : "pages.map.search.emptyDescription",
          )}
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
              <span className="min-w-0 font-bold break-words text-foreground">
                {venue.name}
              </span>
              <span className="flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-sm text-muted">
                {venue.type !== null && (
                  <span>{t(VENUE_TYPE_LABEL_KEYS[venue.type])}</span>
                )}
                {venue.city !== "" && (
                  <span className="min-w-0 break-words">{venue.city}</span>
                )}
                {venue.distanceKm !== null && (
                  <span>{formatDistance(venue.distanceKm, i18n.language)}</span>
                )}
              </span>
            </Button>
          </li>
        ))}
      </ul>
    );
  };

  const label = t("pages.map.search.label");

  return (
    <Drawer isOpen={isOpen} onOpenChange={setIsOpen}>
      <Button
        variant="secondary"
        size="lg"
        className={`${MAP_TOOLBAR_CONTROL_CLASSES} grow`}
      >
        <Magnifier aria-hidden="true" />
        {t("pages.map.search.trigger")}
      </Button>
      <Drawer.Backdrop>
        <Drawer.Content placement="bottom" className="h-dvh md:h-auto">
          <Drawer.Dialog>
            <Drawer.Handle />
            <Drawer.Header>
              <Drawer.Heading>{t("pages.map.search.title")}</Drawer.Heading>
            </Drawer.Header>
            <Drawer.Body className="flex max-h-[calc(100dvh-8rem)] min-w-0 flex-col gap-3 overflow-y-auto p-1 md:max-h-[60dvh]">
              <SearchField
                fullWidth
                autoFocus
                aria-label={label}
                value={searchText}
                onChange={setSearchText}
              >
                <SearchField.Group>
                  <SearchField.SearchIcon />
                  <SearchField.Input
                    className="min-h-11"
                    maxLength={VENUE_SEARCH_MAX_LENGTH}
                    placeholder={label}
                  />
                  {searchText !== "" && (
                    <SearchField.ClearButton
                      aria-label={t("pages.map.search.clear")}
                      className="min-h-11 min-w-11"
                    />
                  )}
                </SearchField.Group>
              </SearchField>
              {renderContent()}
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
};
