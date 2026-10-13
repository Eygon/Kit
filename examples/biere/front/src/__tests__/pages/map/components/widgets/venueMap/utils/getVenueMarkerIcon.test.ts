import { getVenueMarkerIcon } from "@/pages/map/components/widgets/venueMap/utils/getVenueMarkerIcon";
import type { Venue } from "@/types/models/venue/venue";
import * as availabilityStatusEnum from "@/types/enums/venue/availabilityStatusEnum";
import { AvailabilityStatusEnum } from "@/types/enums/venue/availabilityStatusEnum";
import * as venueTypeEnum from "@/types/enums/venue/venueTypeEnum";
import { VenueTypeEnum } from "@/types/enums/venue/venueTypeEnum";

const buildVenue = (type: VenueTypeEnum | null, status: AvailabilityStatusEnum): Venue => ({
  id: 1,
  name: "Le Trappiste",
  type,
  city: "Paris",
  address: "1 rue de la Bière",
  latitude: 48.85,
  longitude: 2.35,
  description: "",
  distanceKm: null,
  status,
});

const getHtml = (venue: Venue): string => {
  return getVenueMarkerIcon(venue).options.html as string;
};

describe("marker enums", () => {
  it("maps each venue type to a marker shape", () => {
    expect(venueTypeEnum.VENUE_TYPE_MARKER_SHAPE_CLASSES).toEqual({
      [VenueTypeEnum.BAR]: "rounded-full",
      [VenueTypeEnum.SHOP]: "rounded-control",
      [VenueTypeEnum.BREWERY]: "rotate-45 rounded-control",
    });
  });

  it("maps each status to a distinct glyph", () => {
    expect(availabilityStatusEnum.AVAILABILITY_STATUS_GLYPHS).toEqual({
      [AvailabilityStatusEnum.CONFIRMED]: "✓",
      [AvailabilityStatusEnum.MAYBE_GONE]: "?",
      [AvailabilityStatusEnum.GONE]: "✕",
      [AvailabilityStatusEnum.UNKNOWN]: "–",
    });
  });

  it("maps each status to marker classes with the ink border", () => {
    const classes = availabilityStatusEnum.AVAILABILITY_STATUS_MARKER_CLASSES;

    expect(classes[AvailabilityStatusEnum.CONFIRMED]).toBe("bg-accent text-accent-foreground border-mousse");
    expect(classes[AvailabilityStatusEnum.MAYBE_GONE]).toBe("bg-secondary text-secondary-foreground border-mousse");
    expect(classes[AvailabilityStatusEnum.GONE]).toBe("bg-surface text-muted line-through border-mousse");
    expect(classes[AvailabilityStatusEnum.UNKNOWN]).toBe("bg-surface text-foreground border-mousse");
  });
});

describe("getVenueMarkerIcon", () => {
  it("AC2 draws a confirmed bar round on a hop green fill with a check", () => {
    const html = getHtml(buildVenue(VenueTypeEnum.BAR, AvailabilityStatusEnum.CONFIRMED));

    expect(html).toContain("rounded-full");
    expect(html).toContain("bg-accent");
    expect(html).toContain("text-accent-foreground");
    expect(html).toContain("border-mousse");
    expect(html).toContain("✓");
    expect(html).not.toContain("rounded-control");
  });

  it("AC2 draws a gone shop square on a cream fill with a cross", () => {
    const html = getHtml(buildVenue(VenueTypeEnum.SHOP, AvailabilityStatusEnum.GONE));

    expect(html).toContain("rounded-control");
    expect(html).toContain("bg-surface");
    expect(html).toContain("✕");
    expect(html).not.toContain("rounded-full");
    expect(html).not.toContain("bg-accent");
  });

  it("draws a brewery as a rotated square whose glyph stays upright", () => {
    const html = getHtml(buildVenue(VenueTypeEnum.BREWERY, AvailabilityStatusEnum.MAYBE_GONE));

    expect(html).toContain("rotate-45 rounded-control");
    expect(html).toContain("-rotate-45");
    expect(html).toContain("bg-secondary");
    expect(html).toContain("?");
  });

  it("keeps a venue without type readable with a default shape and the status glyph", () => {
    const html = getHtml(buildVenue(null, AvailabilityStatusEnum.UNKNOWN));

    expect(html).toContain("rounded-full");
    expect(html).toContain("–");
    expect(html).not.toContain("rotate-45");
  });

  it("AC2 never uses amber and tells the four states apart by glyph and not by color alone", () => {
    const glyphs = new Set<string>();
    for (const type of Object.values(VenueTypeEnum)) {
      for (const status of Object.values(AvailabilityStatusEnum)) {
        const html = getHtml(buildVenue(type, status));
        expect(html).not.toContain("bg-highlight");
        expect(html).not.toContain("warning");
        expect(html).not.toContain("amber");
        glyphs.add(availabilityStatusEnum.AVAILABILITY_STATUS_GLYPHS[status]);
      }
    }

    expect(glyphs.size).toBe(Object.values(AvailabilityStatusEnum).length);
  });

  it("sizes the icon from the marker size and centers its anchor", () => {
    const icon = getVenueMarkerIcon(buildVenue(VenueTypeEnum.BAR, AvailabilityStatusEnum.CONFIRMED));

    expect(icon.options.iconSize).toEqual([44, 44]);
    expect(icon.options.iconAnchor).toEqual([22, 22]);
  });

  it("renders the marker body at the same 44 pixel size as the icon", () => {
    const html = getHtml(buildVenue(VenueTypeEnum.BAR, AvailabilityStatusEnum.CONFIRMED));

    expect(html).toContain("size-11");
    expect(html).not.toContain("size-9");
  });
});
