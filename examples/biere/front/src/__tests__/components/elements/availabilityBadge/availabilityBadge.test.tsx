import { screen } from "@testing-library/react";
import { AvailabilityBadge } from "@/components/elements/availabilityBadge/availabilityBadge";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import * as availabilityStatusEnum from "@/types/enums/venue/availabilityStatusEnum";
import { AvailabilityStatusEnum } from "@/types/enums/venue/availabilityStatusEnum";

const renderBadge = async (status: AvailabilityStatusEnum) => {
  return renderWithProviders(<AvailabilityBadge status={status} />);
};

describe("AVAILABILITY_STATUS_CHIP_PROPS", () => {
  it("maps each status to a chip color and variant, never warning", () => {
    expect(availabilityStatusEnum.AVAILABILITY_STATUS_CHIP_PROPS).toEqual({
      [AvailabilityStatusEnum.CONFIRMED]: { color: "accent", variant: "primary" },
      [AvailabilityStatusEnum.MAYBE_GONE]: { color: "default", variant: "secondary" },
      [AvailabilityStatusEnum.GONE]: { color: "default", variant: "tertiary" },
      [AvailabilityStatusEnum.UNKNOWN]: { color: "default", variant: "soft" },
    });
  });
});

describe("AvailabilityBadge", () => {
  it.each([
    [AvailabilityStatusEnum.CONFIRMED, "Confirmée", "✓"],
    [AvailabilityStatusEnum.MAYBE_GONE, "Peut-être épuisée", "?"],
    [AvailabilityStatusEnum.GONE, "Épuisée", "✕"],
    [AvailabilityStatusEnum.UNKNOWN, "Inconnue", "–"],
  ])("shows %s as its translated label with a decorative glyph", async (status, label, glyph) => {
    await renderBadge(status);

    expect(screen.getByText(label)).toBeInTheDocument();
    const glyphNode = screen.getByText(glyph);
    expect(glyphNode).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText(label)).not.toBe(glyphNode);
  });

  it("renders a small chip", async () => {
    const { container } = await renderBadge(AvailabilityStatusEnum.CONFIRMED);

    expect(container.querySelector(".chip--sm")).not.toBeNull();
  });

  it("uses a different chip look for confirmed and gone", async () => {
    const confirmed = await renderBadge(AvailabilityStatusEnum.CONFIRMED);
    const confirmedClass = confirmed.container.querySelector(".chip")?.className;
    confirmed.unmount();
    const gone = await renderBadge(AvailabilityStatusEnum.GONE);
    const goneClass = gone.container.querySelector(".chip")?.className;

    expect(confirmedClass).toContain("chip--accent");
    expect(goneClass).not.toContain("chip--accent");
    expect(goneClass).not.toContain("chip--warning");
  });
});
