import { MapPinPlus } from "@gravity-ui/icons";
import { Button } from "@heroui/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { BeerFilterChip } from "@/pages/map/components/elements/beerFilterChip/beerFilterChip";
import { MapBanner } from "@/pages/map/components/elements/mapBanner/mapBanner";
import { ProposeVenueDrawer } from "@/pages/map/components/widgets/proposeVenueDrawer/proposeVenueDrawer";
import { MapFiltersDrawer } from "@/pages/map/components/widgets/mapFiltersDrawer/mapFiltersDrawer";
import { VenueListDrawer } from "@/pages/map/components/widgets/venueListDrawer/venueListDrawer";
import { VenueSearchSheet } from "@/pages/map/components/widgets/venueSearchSheet/venueSearchSheet";
import { VenueSheet } from "@/pages/map/components/widgets/venueSheet/venueSheet";
import { VenueMap } from "@/pages/map/components/widgets/venueMap/venueMap";
import { useLinkedVenue } from "@/pages/map/hooks/useLinkedVenue";
import { useGeolocation } from "@/pages/map/hooks/useGeolocation";
import { useMapFilters } from "@/pages/map/hooks/useMapFilters";
import { useVenuesQuery } from "@/pages/map/hooks/useVenuesQuery";
import { GeolocationStatusEnum } from "@/pages/map/types/geolocationStatusEnum";
import { MAP_TOOLBAR_CONTROL_CLASSES } from "@/pages/map/utils/mapConstants";
import { getMapBannerMessage } from "@/pages/map/utils/getMapBannerMessage";
import { EMPTY_VENUE_QUERY } from "@/types/mappers/venue/venueQueryMapper";
import type { GeoPosition } from "@/types/models/venue/geoPosition";
import type { MapBounds } from "@/types/models/venue/mapBounds";
import type { Venue } from "@/types/models/venue/venue";

export const MapPage = () => {
  const { t } = useTranslation();
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [tilesUnavailable, setTilesUnavailable] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [focusedPosition, setFocusedPosition] = useState<GeoPosition | null>(
    null,
  );
  const [isListOpen, setIsListOpen] = useState(false);
  const [isPickingPoint, setIsPickingPoint] = useState(false);
  const [pickedPoint, setPickedPoint] = useState<GeoPosition | null>(null);
  const [isProposeOpen, setIsProposeOpen] = useState(false);
  const { position, status, locate } = useGeolocation();
  const { filters, applyFilters, activeCount } = useMapFilters();
  const radiusKm = position === null ? null : filters.radiusKm;
  const filterQuery = useMemo(
    () => ({
      ...EMPTY_VENUE_QUERY,
      position,
      types: filters.types,
      family: filters.family,
      beerId: filters.beerId,
      confirmedOnly: filters.confirmedOnly,
      undiscovered: filters.undiscovered,
      visited: filters.visited,
      radiusKm,
    }),
    [
      position,
      filters.types,
      filters.family,
      filters.beerId,
      filters.confirmedOnly,
      filters.undiscovered,
      filters.visited,
      radiusKm,
    ],
  );
  const { venues, isPending, isError, refetch } = useVenuesQuery({
    ...filterQuery,
    bounds,
  });
  const { linkedVenue, clearLinkedVenue } = useLinkedVenue();
  const selectVenue = useCallback((venue: Venue) => {
    setIsListOpen(false);
    setSelectedVenue(venue);
  }, []);
  const selectSearchedVenue = useCallback(
    (venue: Venue) => {
      setFocusedPosition({
        latitude: venue.latitude,
        longitude: venue.longitude,
      });
      selectVenue(venue);
    },
    [selectVenue],
  );
  const closeVenueSheet = () => {
    setSelectedVenue(null);
    clearLinkedVenue();
  };

  useEffect(() => {
    if (linkedVenue !== null) selectSearchedVenue(linkedVenue);
  }, [linkedVenue, selectSearchedVenue]);

  const hasPointPrompt = isPickingPoint || pickedPoint !== null;
  const cancelPointPicking = () => {
    setIsPickingPoint(false);
    setPickedPoint(null);
  };
  const locateErrorKey =
    status === GeolocationStatusEnum.DENIED
      ? "pages.map.locate.denied"
      : status === GeolocationStatusEnum.UNAVAILABLE
        ? "pages.map.locate.unavailable"
        : null;
  const banner = getMapBannerMessage({
    locateErrorKey,
    tilesUnavailable,
    hasPointPrompt,
    isPointPicked: pickedPoint !== null,
  });

  return (
    <div className="fixed inset-x-0 top-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30">
      <h1 className="sr-only">{t("pages.map.title")}</h1>
      <div className="absolute inset-0 z-0">
        <VenueMap
          venues={isError ? [] : venues}
          userPosition={position}
          focusedPosition={focusedPosition}
          onBoundsChange={setBounds}
          onTilesUnavailable={() => setTilesUnavailable(true)}
          onSelectVenue={selectVenue}
          pickedPoint={pickedPoint}
          isPickingPoint={isPickingPoint}
          onPickPoint={setPickedPoint}
        />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-2 p-4">
        <div
          role="group"
          aria-label={t("pages.map.toolbar.label")}
          className="pointer-events-auto flex w-full max-w-md flex-col gap-2 self-start"
        >
          <div className="flex gap-2">
            <VenueSearchSheet
              filterQuery={filterQuery}
              activeFilterCount={activeCount}
              onSelectVenue={selectSearchedVenue}
            />
            <Button
              isIconOnly
              variant="secondary"
              size="lg"
              aria-label={t("pages.map.propose.action")}
              className="min-h-11 shrink-0"
              onPress={() => setIsPickingPoint(true)}
            >
              <MapPinPlus aria-hidden="true" />
            </Button>
          </div>
          <div className="flex gap-2">
            <VenueListDrawer
              venues={venues}
              isPending={isPending}
              isError={isError}
              onRetry={() => void refetch()}
              onSelectVenue={selectVenue}
              isOpen={isListOpen}
              onOpenChange={setIsListOpen}
            />
            <MapFiltersDrawer
              appliedFilters={filters}
              hasPosition={position !== null}
              onApply={applyFilters}
            />
            <Button
              variant="primary"
              size="lg"
              className={`${MAP_TOOLBAR_CONTROL_CLASSES} grow`}
              isPending={status === GeolocationStatusEnum.LOCATING}
              onPress={locate}
            >
              {t("pages.map.locate.action")}
            </Button>
          </div>
        </div>
        {filters.beerId !== null && (
          <div className="pointer-events-auto flex min-w-0 self-start p-1">
            <BeerFilterChip
              beerId={filters.beerId}
              onRemove={() => applyFilters({ ...filters, beerId: null })}
            />
          </div>
        )}
        {banner !== null && (
          <MapBanner message={banner}>
            {hasPointPrompt && (
              <div className="flex flex-wrap gap-2">
                {pickedPoint !== null && (
                  <Button
                    variant="primary"
                    size="lg"
                    onPress={() => setIsProposeOpen(true)}
                  >
                    {t("pages.map.propose.confirmPoint")}
                  </Button>
                )}
                <Button
                  variant="tertiary"
                  size="lg"
                  onPress={cancelPointPicking}
                >
                  {t("pages.map.propose.cancel")}
                </Button>
              </div>
            )}
          </MapBanner>
        )}
      </div>
      <VenueSheet
        venue={selectedVenue}
        onClose={closeVenueSheet}
      />
      <ProposeVenueDrawer
        position={pickedPoint}
        isOpen={isProposeOpen}
        onOpenChange={setIsProposeOpen}
        onCreated={cancelPointPicking}
      />
    </div>
  );
};
