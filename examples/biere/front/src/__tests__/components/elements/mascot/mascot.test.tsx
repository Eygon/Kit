import { screen } from "@testing-library/react";
import { Mascot } from "@/components/elements/mascot/mascot";
import fr from "@/i18n/locales/fr.json";
import { MascotMoodEnum } from "@/types/enums/mascot/mascotMoodEnum";
import { MascotSizeEnum } from "@/types/enums/mascot/mascotSizeEnum";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";

describe("Mascot", () => {
  it.each([
    [MascotMoodEnum.SEARCHING, fr.mascot.alt.searching],
    [MascotMoodEnum.CAPTURED, fr.mascot.alt.captured],
    [MascotMoodEnum.CONFUSED, fr.mascot.alt.confused],
    [MascotMoodEnum.LOADED, fr.mascot.alt.loaded],
  ])("describes the %s mood with a translated alternative text", (mood, alt) => {
    renderWithProviders(<Mascot mood={mood} />);

    expect(screen.getByRole("img", { name: alt })).toBeInTheDocument();
  });

  it("searches by default, at the medium size", () => {
    const { container } = renderWithProviders(<Mascot />);

    const mascot = container.querySelector('[data-slot="mascot"]');
    expect(mascot).toHaveAttribute("data-mood", MascotMoodEnum.SEARCHING);
    expect(mascot?.className).toContain("size-36");
    expect(screen.getByRole("img", { name: fr.mascot.alt.searching })).toBeInTheDocument();
  });

  it("hides itself from assistive technologies when decorative", () => {
    const { container } = renderWithProviders(<Mascot isDecorative />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container.querySelector('[data-slot="mascot"]')).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("img")).toHaveAttribute("alt", "");
  });

  it("keeps the single illustration square and undistorted, with both resolutions", () => {
    renderWithProviders(<Mascot size={MascotSizeEnum.LG} />);

    const image = screen.getByRole("img");
    expect(image).toHaveAttribute("width", "512");
    expect(image).toHaveAttribute("height", "512");
    expect(image).toHaveAttribute("sizes", "12rem");
    expect(image.getAttribute("srcset")).toMatch(/256w, .+ 512w$/);
    expect(image.className).toContain("object-contain");
  });

  it("dresses the illustration with the CSS stand-in of its mood", () => {
    const { container } = renderWithProviders(<Mascot mood={MascotMoodEnum.CAPTURED} />);

    expect(container.querySelectorAll('[data-slot="mascot-mood-stand-in"]')).toHaveLength(3);
    expect(screen.getByRole("img").className).toContain("-rotate-6");
  });
});
