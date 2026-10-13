import { divIcon } from "leaflet";
import type { DivIcon } from "leaflet";
import { MARKER_SIZE_PX } from "@/pages/map/utils/mapConstants";
import { AVAILABILITY_STATUS_GLYPHS, AVAILABILITY_STATUS_MARKER_CLASSES } from "@/types/enums/venue/availabilityStatusEnum";
import { VENUE_TYPE_MARKER_SHAPE_CLASSES, VenueTypeEnum } from "@/types/enums/venue/venueTypeEnum";
import type { Venue } from "@/types/models/venue/venue";

const MARKER_BASE_CLASSES = "flex size-11 items-center justify-center font-bold shadow-mousse";
const UNTYPED_VENUE_SHAPE_CLASSES = VENUE_TYPE_MARKER_SHAPE_CLASSES[VenueTypeEnum.BAR];
const UPRIGHT_GLYPH_CLASSES = "-rotate-45";

export const getVenueMarkerIcon = (venue: Venue): DivIcon => {
  const shapeClasses = venue.type === null ? UNTYPED_VENUE_SHAPE_CLASSES : VENUE_TYPE_MARKER_SHAPE_CLASSES[venue.type];
  const glyphClasses = venue.type === VenueTypeEnum.BREWERY ? UPRIGHT_GLYPH_CLASSES : "";
  const markerClasses = `${MARKER_BASE_CLASSES} ${shapeClasses} ${AVAILABILITY_STATUS_MARKER_CLASSES[venue.status]}`;

  return divIcon({
    className: "",
    html: `<div class="${markerClasses}"><span class="${glyphClasses}" aria-hidden="true">${AVAILABILITY_STATUS_GLYPHS[venue.status]}</span></div>`,
    iconSize: [MARKER_SIZE_PX, MARKER_SIZE_PX],
    iconAnchor: [MARKER_SIZE_PX / 2, MARKER_SIZE_PX / 2],
  });
};
