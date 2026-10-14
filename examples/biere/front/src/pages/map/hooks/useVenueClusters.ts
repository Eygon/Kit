import type { Map as LeafletMap } from "leaflet";
import { useEffect, useMemo, useState } from "react";
import type { VenueCluster } from "@/pages/map/types/venueCluster";
import { groupNearbyPoints } from "@/pages/map/utils/groupNearbyPoints";
import {
  CLUSTER_DISTANCE_PX,
  CLUSTER_MAX_ZOOM,
} from "@/pages/map/utils/mapConstants";
import type { Venue } from "@/types/models/venue/venue";

const average = (values: number[]): number =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

const buildCluster = (venues: Venue[]): VenueCluster => ({
  key:
    venues.length === 1
      ? `venue-${venues[0].id}`
      : `cluster-${venues.map((venue) => venue.id).join("-")}`,
  venues,
  latitude: average(venues.map((venue) => venue.latitude)),
  longitude: average(venues.map((venue) => venue.longitude)),
});

export const useVenueClusters = (
  map: LeafletMap | null,
  venues: Venue[],
): VenueCluster[] => {
  const [zoom, setZoom] = useState<number | null>(null);

  useEffect(() => {
    if (map === null) return;
    const readZoom = () => setZoom(map.getZoom());
    readZoom();
    map.on("zoomend", readZoom);
    return () => {
      map.off("zoomend", readZoom);
    };
  }, [map]);

  return useMemo(() => {
    if (map === null || zoom === null || zoom >= CLUSTER_MAX_ZOOM)
      return venues.map((venue) => buildCluster([venue]));
    const venuesById = new Map(venues.map((venue) => [venue.id, venue]));
    const points = venues.map((venue) => {
      const { x, y } = map.project([venue.latitude, venue.longitude], zoom);
      return { id: venue.id, x, y };
    });
    return groupNearbyPoints(points, CLUSTER_DISTANCE_PX).map((group) =>
      buildCluster(group.ids.map((id) => venuesById.get(id) as Venue)),
    );
  }, [map, venues, zoom]);
};
