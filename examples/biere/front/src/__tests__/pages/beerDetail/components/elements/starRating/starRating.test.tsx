import { StarRating } from "@/pages/beerDetail/components/elements/starRating/starRating";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";

const renderStars = (props: { value: number; label?: string }) => {
  return renderWithProviders(<StarRating {...props} />);
};

const readStates = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("[data-state]")).map((star) => star.getAttribute("data-state"));

describe("StarRating", () => {
  it("shows three full stars, a half star and an empty one for 3.5", () => {
    const { container } = renderStars({ value: 3.5 });

    expect(readStates(container)).toEqual(["full", "full", "full", "half", "empty"]);
  });

  it("shows five empty stars for 0 and five full stars for 5", () => {
    const empty = renderStars({ value: 0 });
    expect(readStates(empty.container)).toEqual(["empty", "empty", "empty", "empty", "empty"]);
    empty.unmount();

    const full = renderStars({ value: 5 });
    expect(readStates(full.container)).toEqual(["full", "full", "full", "full", "full"]);
  });

  it("shows a lone half star for 0.5 and four full stars with a half for 4.5", () => {
    const low = renderStars({ value: 0.5 });
    expect(readStates(low.container)).toEqual(["half", "empty", "empty", "empty", "empty"]);
    low.unmount();

    const high = renderStars({ value: 4.5 });
    expect(readStates(high.container)).toEqual(["full", "full", "full", "full", "half"]);
  });

  it("rounds an average to the nearest half star", () => {
    const down = renderStars({ value: 3.7 });
    expect(readStates(down.container)).toEqual(["full", "full", "full", "half", "empty"]);
    down.unmount();

    const up = renderStars({ value: 3.8 });
    expect(readStates(up.container)).toEqual(["full", "full", "full", "full", "empty"]);
  });

  it("hides every star from assistive technology", () => {
    const { container } = renderStars({ value: 3.5 });

    const stars = Array.from(container.querySelectorAll("[data-state]"));
    expect(stars).toHaveLength(5);
    stars.forEach((star) => expect(star).toHaveAttribute("aria-hidden", "true"));
  });

  it("reads the label as screen reader text when it is given", () => {
    const { container } = renderStars({ value: 3.5, label: "3,5 sur 5" });

    const label = container.querySelector(".sr-only");
    expect(label).toHaveTextContent("3,5 sur 5");
  });

  it("renders no screen reader text without a label", () => {
    const { container } = renderStars({ value: 3.5 });

    expect(container.querySelector(".sr-only")).toBeNull();
  });
});
