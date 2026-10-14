import { getVenueClusterIcon } from "@/pages/map/components/widgets/venueMap/utils/getVenueClusterIcon";

const htmlOf = (count: number): string =>
  getVenueClusterIcon(count).options.html as string;

describe("getVenueClusterIcon", () => {
  it("AC5 draws the leather brown round badge with ink border and hard shadow", () => {
    const html = htmlOf(3);

    expect(html).toContain("rounded-full");
    expect(html).toContain("border-mousse");
    expect(html).toContain("bg-secondary");
    expect(html).toContain("text-secondary-foreground");
    expect(html).toContain("shadow-mousse");
    expect(html).toContain("font-display");
    expect(html).toContain("size-11");
  });

  it("AC5 shows the bare count, hidden from assistive technology", () => {
    expect(htmlOf(3)).toContain('<span aria-hidden="true">3</span>');
  });

  it("AC5 carries no state class, glyph or color", () => {
    const html = htmlOf(3);

    expect(html).not.toContain("bg-accent");
    expect(html).not.toContain("bg-surface");
    expect(html).not.toContain("line-through");
    expect(html).not.toContain("bg-highlight");
    ["✓", "?", "✕", "–"].forEach((glyph) => expect(html).not.toContain(glyph));
  });

  it("shows the exact count up to 99", () => {
    expect(htmlOf(99)).toContain(">99<");
    expect(htmlOf(99)).not.toContain("99+");
  });

  it("AC6 caps the displayed count at 99+", () => {
    expect(htmlOf(100)).toContain(">99+<");
    expect(htmlOf(120)).toContain(">99+<");
    expect(htmlOf(120)).not.toContain("120");
  });

  it("sizes the icon from the marker size and centers its anchor", () => {
    const icon = getVenueClusterIcon(3);

    expect(icon.options.className).toBe("");
    expect(icon.options.iconSize).toEqual([44, 44]);
    expect(icon.options.iconAnchor).toEqual([22, 22]);
  });
});
