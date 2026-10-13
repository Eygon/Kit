import { render } from "@testing-library/react";
import { MascotMoodStandIn } from "@/components/elements/mascot/components/mascotMoodStandIn/mascotMoodStandIn";
import { MascotMoodEnum } from "@/types/enums/mascot/mascotMoodEnum";

describe("MascotMoodStandIn", () => {
  it.each([
    [MascotMoodEnum.SEARCHING, 2],
    [MascotMoodEnum.CAPTURED, 3],
    [MascotMoodEnum.CONFUSED, 2],
    [MascotMoodEnum.LOADED, 3],
  ])("renders the %s stand-in as %i decorative pieces", (mood, count) => {
    const { container } = render(<MascotMoodStandIn mood={mood} />);

    const pieces = container.querySelectorAll('[data-slot="mascot-mood-stand-in"]');
    expect(pieces).toHaveLength(count);
    pieces.forEach((piece) => {
      expect(piece).toHaveAttribute("aria-hidden", "true");
      expect(piece).toBeEmptyDOMElement();
    });
  });
});
