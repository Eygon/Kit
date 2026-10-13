import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap } from "leaflet";
import { useEffect, useState } from "react";
import { CircleMarker, MapContainer, Marker, TileLayer, Tooltip, ZoomControl } from "react-leaflet";
import { useTranslation } from "react-i18next";
import { getVenueMarkerIcon } from "@/pages/map/components/widgets/venueMap/utils/getVenueMarkerIcon";
import type { VenueMapProps } from "@/pages/map/types/venueMap";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  LOCATED_ZOOM,
  OSM_ATTRIBUTION,
  OSM_TILE_URL,
  USER_MARKER_RADIUS,
  ZOOM_CONTROL_POSITION,
} from "@/pages/map/utils/mapConstants";
import { AVAILABILITY_STATUS_LABEL_KEYS } from "@/types/enums/venue/availabilityStatusEnum";
import { VENUE_TYPE_LABEL_KEYS } from "@/types/enums/venue/venueTypeEnum";

export const VenueMap = ({ venues, userPosition, onBoundsChange, onTilesUnavailable, onSelectVenue }: VenueMapProps) => {
  const { t } = useTranslation();
  const [map, setMap] = useState<LeafletMap | null>(null);

  useEffect(() => {
    if (map === null) return;
    const reportBounds = () => {
      const bounds = map.getBounds();
      onBoundsChange({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      });
    };
    map.on("moveend", reportBounds);
    reportBounds();
    return () => {
      map.off("moveend", reportBounds);
    };
  }, [map, onBoundsChange]);

  useEffect(() => {
    if (map === null || userPosition === null) return;
    map.flyTo([userPosition.latitude, userPosition.longitude], LOCATED_ZOOM);
  }, [map, userPosition]);

  return (
    <MapContainer className="size-full" center={DEFAULT_MAP_CENTER} zoom={DEFAULT_MAP_ZOOM} zoomControl={false} ref={setMap}>
      <ZoomControl position={ZOOM_CONTROL_POSITION} />
      <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} eventHandlers={{ tileerror: () => onTilesUnavailable() }} />
      {venues.map((venue) => (
        <Marker
          key={venue.id}
          position={[venue.latitude, venue.longitude]}
          icon={getVenueMarkerIcon(venue)}
          title={t("pages.map.markerLabel", {
            name: venue.name,
            type: venue.type === null ? "" : t(VENUE_TYPE_LABEL_KEYS[venue.type]),
            status: t(AVAILABILITY_STATUS_LABEL_KEYS[venue.status]),
          })}
          keyboard
          eventHandlers={{ click: () => onSelectVenue(venue) }}
        />
      ))}
      {userPosition !== null && (
        <CircleMarker
          center={[userPosition.latitude, userPosition.longitude]}
          radius={USER_MARKER_RADIUS}
          className="fill-accent stroke-foreground"
        >
          <Tooltip>{t("pages.map.youAreHere")}</Tooltip>
        </CircleMarker>
      )}
    </MapContainer>
  );
};
