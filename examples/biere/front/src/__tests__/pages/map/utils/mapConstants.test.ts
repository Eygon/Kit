import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  MARKER_SIZE_PX,
  OSM_ATTRIBUTION,
  OSM_TILE_URL,
} from "@/pages/map/utils/mapConstants";

describe("mapConstants", () => {
  it("centers the map on Paris at zoom 12", () => {
    expect(DEFAULT_MAP_CENTER).toEqual([48.8566, 2.3522]);
    expect(DEFAULT_MAP_ZOOM).toBe(12);
  });

  it("uses the OpenStreetMap tile server with its attribution", () => {
    expect(OSM_TILE_URL).toBe("https://tile.openstreetmap.org/{z}/{x}/{y}.png");
    expect(OSM_ATTRIBUTION).toBe("&copy; OpenStreetMap contributors");
  });

  it("sizes the markers at the 44 pixel minimum touch target", () => {
    expect(MARKER_SIZE_PX).toBe(44);
  });
});
