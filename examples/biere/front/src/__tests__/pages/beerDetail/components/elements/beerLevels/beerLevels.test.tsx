import { screen, within } from "@testing-library/react";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import { BeerLevels } from "@/pages/beerDetail/components/elements/beerLevels/beerLevels";
import type { BeerLevelsProps } from "@/pages/beerDetail/types/beerLevels";

const NO_LEVELS: BeerLevelsProps = { bitternessLevel: null, colorLevel: null, styleColorRange: null };

const renderLevels = (props: Partial<BeerLevelsProps> = {}) => renderWithProviders(<BeerLevels {...NO_LEVELS} {...props} />);

const getRow = (name: string) => {
  const term = screen.getByText(name, { selector: "dt" });
  return term.parentElement as HTMLElement;
};

const getSwatches = (row: HTMLElement) => Array.from(row.querySelectorAll('[aria-hidden="true"]'));

describe("BeerLevels", () => {
  it("shows the bitterness label and the level out of 5", () => {
    renderLevels({ bitternessLevel: 4 });

    expect(within(getRow("Amertume")).getByText("Marquée · 4 / 5")).toBeInTheDocument();
  });

  it.each([
    [1, "Très légère · 1 / 5"],
    [2, "Légère · 2 / 5"],
    [3, "Modérée · 3 / 5"],
    [5, "Intense · 5 / 5"],
  ])("reads bitterness level %i as %s", (level, text) => {
    renderLevels({ bitternessLevel: level });

    expect(within(getRow("Amertume")).getByText(text)).toBeInTheDocument();
  });

  it("says Non renseignée when the bitterness is missing", () => {
    renderLevels({ colorLevel: 3 });

    expect(within(getRow("Amertume")).getByText("Non renseignée")).toBeInTheDocument();
    expect(screen.queryByText(/ \/ 5/)).not.toBeInTheDocument();
  });

  it("shows one decorative swatch followed by the colour label", () => {
    renderLevels({ colorLevel: 3 });
    const row = getRow("Couleur");

    const swatches = getSwatches(row);
    expect(swatches).toHaveLength(1);
    expect(swatches[0]).toHaveClass("bg-beer-3", "rounded-full", "border-mousse", "size-6");
    expect(swatches[0]).toBeEmptyDOMElement();
    expect(within(row).getByText("Ambrée")).toBeVisible();
    expect(swatches[0].compareDocumentPosition(within(row).getByText("Ambrée")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it.each([
    [1, "Pâle", "bg-beer-1"],
    [2, "Dorée", "bg-beer-2"],
    [4, "Brune", "bg-beer-4"],
    [5, "Noire", "bg-beer-5"],
  ])("maps colour level %i to %s and %s", (level, label, swatchClass) => {
    renderLevels({ colorLevel: level });
    const row = getRow("Couleur");

    expect(within(row).getByText(label)).toBeInTheDocument();
    expect(getSwatches(row)[0]).toHaveClass(swatchClass);
  });

  it("shows two swatches and the typical range when the colour is missing and the range spans two levels", () => {
    renderLevels({ styleColorRange: { min: 3, max: 4 } });
    const row = getRow("Couleur");

    const swatches = getSwatches(row);
    expect(swatches).toHaveLength(2);
    expect(swatches[0]).toHaveClass("bg-beer-3");
    expect(swatches[1]).toHaveClass("bg-beer-4");
    expect(within(row).getByText("Ambrée à brune · typique du style")).toBeInTheDocument();
  });

  it("shows a wide style range as the style range, never as the colour of the beer", () => {
    renderLevels({ styleColorRange: { min: 1, max: 5 } });
    const row = getRow("Couleur");

    const swatches = getSwatches(row);
    expect(swatches).toHaveLength(2);
    expect(swatches[0]).toHaveClass("bg-beer-1");
    expect(swatches[1]).toHaveClass("bg-beer-5");
    expect(within(row).getByText("Pâle à noire · typique du style")).toBeInTheDocument();
    expect(within(row).queryByText("Pâle")).not.toBeInTheDocument();
  });

  it("shows one swatch and the single label when the range holds one level", () => {
    renderLevels({ styleColorRange: { min: 1, max: 1 } });
    const row = getRow("Couleur");

    const swatches = getSwatches(row);
    expect(swatches).toHaveLength(1);
    expect(swatches[0]).toHaveClass("bg-beer-1");
    expect(within(row).getByText("Pâle · typique du style")).toBeInTheDocument();
  });

  it("prefers the colour of the beer over the style range", () => {
    renderLevels({ colorLevel: 5, styleColorRange: { min: 1, max: 2 } });
    const row = getRow("Couleur");

    expect(getSwatches(row)).toHaveLength(1);
    expect(within(row).getByText("Noire")).toBeInTheDocument();
    expect(within(row).queryByText(/typique du style/)).not.toBeInTheDocument();
  });

  it("says Non renseignée without a swatch when there is neither colour nor range", () => {
    renderLevels();
    const row = getRow("Couleur");

    expect(within(row).getByText("Non renseignée")).toBeInTheDocument();
    expect(getSwatches(row)).toHaveLength(0);
  });

  it("wraps its rows so they fit a narrow screen", () => {
    renderLevels({ colorLevel: 3 });

    expect(getRow("Couleur").querySelector("dd")).toHaveClass("flex-wrap", "min-w-0");
  });
});
