import { divIcon } from "leaflet";
import type { DivIcon } from "leaflet";
import { CLUSTER_COUNT_DISPLAY_MAX, MARKER_SIZE_PX } from "@/pages/map/utils/mapConstants";

const CLUSTER_CLASSES =
  "flex size-11 items-center justify-center rounded-full border-mousse bg-secondary font-display text-sm text-secondary-foreground shadow-mousse";

export const getVenueClusterIcon = (count: number): DivIcon => {
  const displayedCount = count > CLUSTER_COUNT_DISPLAY_MAX ? `${CLUSTER_COUNT_DISPLAY_MAX}+` : String(count);

  return divIcon({
    className: "",
    html: `<div class="${CLUSTER_CLASSES}"><span aria-hidden="true">${displayedCount}</span></div>`,
    iconSize: [MARKER_SIZE_PX, MARKER_SIZE_PX],
    iconAnchor: [MARKER_SIZE_PX / 2, MARKER_SIZE_PX / 2],
  });
};
