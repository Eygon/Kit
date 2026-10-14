import type { MapBannerInput, MapBannerMessage } from "@/pages/map/types/mapBannerMessage";

export const getMapBannerMessage = ({
  locateErrorKey,
  tilesUnavailable,
  hasPointPrompt,
  isPointPicked,
}: MapBannerInput): MapBannerMessage | null => {
  if (locateErrorKey !== null) return { key: locateErrorKey, isError: true };
  if (tilesUnavailable) return { key: "pages.map.tilesUnavailable", isError: false };
  if (hasPointPrompt)
    return {
      key: isPointPicked ? "pages.map.propose.pickedHint" : "pages.map.propose.pickHint",
      isError: false,
    };
  return null;
};
