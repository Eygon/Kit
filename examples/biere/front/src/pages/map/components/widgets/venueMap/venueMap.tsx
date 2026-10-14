import "leaflet/dist/leaflet.css";
import { divIcon, latLngBounds } from "leaflet";
import type {
  LeafletMouseEvent,
  Map as LeafletMap,
  Marker as LeafletMarker,
} from "leaflet";
import { useEffect, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  TileLayer,
  Tooltip,
  ZoomControl,
} from "react-leaflet";
import { useTranslation } from "react-i18next";
import { getVenueClusterIcon } from "@/pages/map/components/widgets/venueMap/utils/getVenueClusterIcon";
import { getVenueMarkerIcon } from "@/pages/map/components/widgets/venueMap/utils/getVenueMarkerIcon";
import { useVenueClusters } from "@/pages/map/hooks/useVenueClusters";
import type { VenueMapProps } from "@/pages/map/types/venueMap";
import {
  CLUSTER_MAX_ZOOM,
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  FOCUSED_VENUE_ZOOM,
  LOCATED_ZOOM,
  MARKER_SIZE_PX,
  OSM_ATTRIBUTION,
  OSM_TILE_URL,
  USER_MARKER_RADIUS,
  ZOOM_CONTROL_POSITION,
} from "@/pages/map/utils/mapConstants";
import { AVAILABILITY_STATUS_LABEL_KEYS } from "@/types/enums/venue/availabilityStatusEnum";
import { VENUE_TYPE_LABEL_KEYS } from "@/types/enums/venue/venueTypeEnum";

const LONG_PRESS_MS = 600;
const PRESS_CANCEL_EVENTS = ["movestart", "dragstart", "zoomstart"];
const PICKED_POINT_MARKER_CLASSES =
  "flex size-11 items-center justify-center rounded-full border-mousse bg-secondary font-bold text-secondary-foreground shadow-mousse";
const PICKED_POINT_ICON = divIcon({
  className: "",
  html: `<div class="${PICKED_POINT_MARKER_CLASSES}"><span aria-hidden="true">+</span></div>`,
  iconSize: [MARKER_SIZE_PX, MARKER_SIZE_PX],
  iconAnchor: [MARKER_SIZE_PX / 2, MARKER_SIZE_PX / 2],
});

export const VenueMap = ({
  venues,
  userPosition,
  focusedPosition,
  pickedPoint,
  isPickingPoint,
  onBoundsChange,
  onTilesUnavailable,
  onSelectVenue,
  onPickPoint,
}: VenueMapProps) => {
  const { t } = useTranslation();
  const [map, setMap] = useState<LeafletMap | null>(null);
  const clusters = useVenueClusters(map, venues);

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
    if (map === null) return;
    let pressTimer: ReturnType<typeof setTimeout> | null = null;
    let hasTimerPickedPoint = false;
    const cancelPress = () => {
      if (pressTimer === null) return;
      clearTimeout(pressTimer);
      pressTimer = null;
    };
    const pickPoint = ({ latlng }: LeafletMouseEvent) => {
      const { lat, lng } = latlng.wrap();
      onPickPoint({ latitude: lat, longitude: lng });
    };
    const startPress = (event: LeafletMouseEvent) => {
      cancelPress();
      hasTimerPickedPoint = false;
      pressTimer = setTimeout(() => {
        pressTimer = null;
        hasTimerPickedPoint = true;
        pickPoint(event);
      }, LONG_PRESS_MS);
    };
    const endPress = () => {
      cancelPress();
      hasTimerPickedPoint = false;
    };
    const pickNow = (event: LeafletMouseEvent) => {
      cancelPress();
      if (hasTimerPickedPoint) return;
      pickPoint(event);
    };
    map.on("mousedown", startPress);
    map.on("mouseup", endPress);
    map.on("contextmenu", pickNow);
    if (isPickingPoint) map.on("click", pickPoint);
    PRESS_CANCEL_EVENTS.forEach((eventName) => map.on(eventName, cancelPress));
    return () => {
      cancelPress();
      map.off("mousedown", startPress);
      map.off("mouseup", endPress);
      map.off("contextmenu", pickNow);
      map.off("click", pickPoint);
      PRESS_CANCEL_EVENTS.forEach((eventName) =>
        map.off(eventName, cancelPress),
      );
    };
  }, [map, onPickPoint, isPickingPoint]);

  useEffect(() => {
    if (map === null || userPosition === null) return;
    map.flyTo([userPosition.latitude, userPosition.longitude], LOCATED_ZOOM);
  }, [map, userPosition]);

  useEffect(() => {
    if (map === null || focusedPosition === null) return;
    map.flyTo(
      [focusedPosition.latitude, focusedPosition.longitude],
      FOCUSED_VENUE_ZOOM,
    );
  }, [map, focusedPosition]);

  return (
    <MapContainer
      className="size-full"
      center={DEFAULT_MAP_CENTER}
      zoom={DEFAULT_MAP_ZOOM}
      zoomControl={false}
      ref={setMap}
    >
      <ZoomControl position={ZOOM_CONTROL_POSITION} />
      <TileLayer
        url={OSM_TILE_URL}
        attribution={OSM_ATTRIBUTION}
        eventHandlers={{ tileerror: () => onTilesUnavailable() }}
      />
      {clusters.map((cluster) => {
        if (cluster.venues.length === 1) {
          const [venue] = cluster.venues;
          return (
            <Marker
              key={venue.id}
              position={[venue.latitude, venue.longitude]}
              icon={getVenueMarkerIcon(venue)}
              title={t("pages.map.markerLabel", {
                name: venue.name,
                type:
                  venue.type === null
                    ? ""
                    : t(VENUE_TYPE_LABEL_KEYS[venue.type]),
                status: t(AVAILABILITY_STATUS_LABEL_KEYS[venue.status]),
              })}
              keyboard
              eventHandlers={{ click: () => onSelectVenue(venue) }}
            />
          );
        }
        return (
          <Marker
            key={cluster.key}
            position={[cluster.latitude, cluster.longitude]}
            icon={getVenueClusterIcon(cluster.venues.length)}
            title={t("pages.map.clusterLabel", {
              count: cluster.venues.length,
            })}
            keyboard
            eventHandlers={{
              click: () =>
                map?.fitBounds(
                  latLngBounds(
                    cluster.venues.map((venue) => [
                      venue.latitude,
                      venue.longitude,
                    ]),
                  ),
                  {
                    padding: [MARKER_SIZE_PX, MARKER_SIZE_PX],
                    maxZoom: CLUSTER_MAX_ZOOM,
                  },
                ),
            }}
          />
        );
      })}
      {pickedPoint !== null && (
        <Marker
          position={[pickedPoint.latitude, pickedPoint.longitude]}
          icon={PICKED_POINT_ICON}
          title={t("pages.map.propose.pointMarker")}
          keyboard
          draggable
          eventHandlers={{
            dragend: (event) => {
              const { lat, lng } = (event.target as LeafletMarker)
                .getLatLng()
                .wrap();
              onPickPoint({ latitude: lat, longitude: lng });
            },
          }}
        />
      )}
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
