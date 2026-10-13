import { Alert, Button } from "@heroui/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BeerFilterChip } from "@/pages/map/components/elements/beerFilterChip/beerFilterChip";
import { MapFiltersDrawer } from "@/pages/map/components/widgets/mapFiltersDrawer/mapFiltersDrawer";
import { VenueListDrawer } from "@/pages/map/components/widgets/venueListDrawer/venueListDrawer";
import { VenueSheet } from "@/pages/map/components/widgets/venueSheet/venueSheet";
import { VenueMap } from "@/pages/map/components/widgets/venueMap/venueMap";
import { useGeolocation } from "@/pages/map/hooks/useGeolocation";
import { useMapFilters } from "@/pages/map/hooks/useMapFilters";
import { useVenuesQuery } from "@/pages/map/hooks/useVenuesQuery";
import { GeolocationStatusEnum } from "@/pages/map/types/geolocationStatusEnum";
import { EMPTY_VENUE_QUERY } from "@/types/mappers/venue/venueQueryMapper";
import type { MapBounds } from "@/types/models/venue/mapBounds";
import type { Venue } from "@/types/models/venue/venue";

export const MapPage = () => {
  const { t } = useTranslation();
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [tilesUnavailable, setTilesUnavailable] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [isListOpen, setIsListOpen] = useState(false);
  const { position, status, locate } = useGeolocation();
  const { filters, applyFilters } = useMapFilters();
  const { venues, isPending, isError, refetch } = useVenuesQuery({
    ...EMPTY_VENUE_QUERY,
    bounds,
    position,
    types: filters.types,
    family: filters.family,
    beerId: filters.beerId,
    confirmedOnly: filters.confirmedOnly,
    radiusKm: position === null ? null : filters.radiusKm,
  });
  const selectVenue = (venue: Venue) => {
    setIsListOpen(false);
    setSelectedVenue(venue);
  };
  const locateErrorKey =
    status === GeolocationStatusEnum.DENIED
      ? "pages.map.locate.denied"
      : status === GeolocationStatusEnum.UNAVAILABLE
        ? "pages.map.locate.unavailable"
        : null;

  return (
    <div className="fixed inset-x-0 top-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30">
      <h1 className="sr-only">{t("pages.map.title")}</h1>
      <div className="absolute inset-0 z-0">
        <VenueMap
          venues={isError ? [] : venues}
          userPosition={position}
          onBoundsChange={setBounds}
          onTilesUnavailable={() => setTilesUnavailable(true)}
          onSelectVenue={selectVenue}
        />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-2 p-4">
        <div className="pointer-events-auto flex flex-wrap gap-2 self-start">
          <VenueListDrawer
            venues={venues}
            isPending={isPending}
            isError={isError}
            onRetry={() => void refetch()}
            onSelectVenue={selectVenue}
            isOpen={isListOpen}
            onOpenChange={setIsListOpen}
          />
          <MapFiltersDrawer appliedFilters={filters} hasPosition={position !== null} onApply={applyFilters} />
          <Button
            variant="primary"
            size="lg"
            isPending={status === GeolocationStatusEnum.LOCATING}
            onPress={locate}
          >
            {t("pages.map.locate.action")}
          </Button>
        </div>
        {filters.beerId !== null && (
          <div className="pointer-events-auto flex min-w-0 self-start p-1">
            <BeerFilterChip beerId={filters.beerId} onRemove={() => applyFilters({ ...filters, beerId: null })} />
          </div>
        )}
        {locateErrorKey !== null && (
          <Alert status="danger" role="alert" className="pointer-events-auto">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>{t(locateErrorKey)}</Alert.Title>
            </Alert.Content>
          </Alert>
        )}
        {tilesUnavailable && (
          <Alert status="default">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>{t("pages.map.tilesUnavailable")}</Alert.Title>
            </Alert.Content>
          </Alert>
        )}
      </div>
      <VenueSheet venue={selectedVenue} onClose={() => setSelectedVenue(null)} />
    </div>
  );
};
