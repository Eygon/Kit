import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FamilyChips } from "@/pages/encyclopedia/components/elements/familyChips/familyChips";
import type { FamilyChipsProps } from "@/pages/encyclopedia/types/familyChips";
import { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";

const onFamilyChange = vi.fn();

const FAMILIES: FamilyChipsProps["families"] = [
  { value: BeerFamilyEnum.TRAPPIST, count: 11 },
  { value: BeerFamilyEnum.LAGER, count: 5 },
  { value: BeerFamilyEnum.IPA, count: 2 },
];

const renderChips = (props: Partial<FamilyChipsProps> = {}) =>
  renderWithProviders(
    <FamilyChips families={FAMILIES} selectedFamily={null} onFamilyChange={onFamilyChange} {...props} />,
  );

const getChip = (name: string) => screen.getByRole("row", { name });

describe("FamilyChips", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists All first then one chip per family with its count", () => {
    renderChips();

    const chips = within(screen.getByRole("grid", { name: "Familles" })).getAllByRole("row");
    expect(chips.map((chip) => chip.textContent)).toEqual(["Toutes", "Trappiste (11)", "Lager (5)", "IPA (2)"]);
  });

  it("selects All when no family is chosen", () => {
    renderChips();

    expect(getChip("Toutes")).toHaveAttribute("aria-selected", "true");
    expect(getChip("Trappiste (11)")).toHaveAttribute("aria-selected", "false");
  });

  it("selects the chip of the chosen family only", () => {
    renderChips({ selectedFamily: BeerFamilyEnum.LAGER });

    expect(getChip("Lager (5)")).toHaveAttribute("aria-selected", "true");
    expect(getChip("Toutes")).toHaveAttribute("aria-selected", "false");
    expect(getChip("Trappiste (11)")).toHaveAttribute("aria-selected", "false");
  });

  it("reports the family of the pressed chip", async () => {
    const user = userEvent.setup();
    renderChips();

    await user.click(getChip("Trappiste (11)"));

    expect(onFamilyChange).toHaveBeenCalledTimes(1);
    expect(onFamilyChange).toHaveBeenCalledWith(BeerFamilyEnum.TRAPPIST);
  });

  it("reports null when All is pressed", async () => {
    const user = userEvent.setup();
    renderChips({ selectedFamily: BeerFamilyEnum.TRAPPIST });

    await user.click(getChip("Toutes"));

    expect(onFamilyChange).toHaveBeenCalledTimes(1);
    expect(onFamilyChange).toHaveBeenCalledWith(null);
  });

  it("does not report anything when the selected chip is pressed again", async () => {
    const user = userEvent.setup();
    renderChips({ selectedFamily: BeerFamilyEnum.TRAPPIST });

    await user.click(getChip("Trappiste (11)"));

    expect(onFamilyChange).not.toHaveBeenCalled();
    expect(getChip("Trappiste (11)")).toHaveAttribute("aria-selected", "true");
  });

  it("keeps the selected family visible and selected with a count of zero when the facets lack it", () => {
    renderChips({ selectedFamily: BeerFamilyEnum.STOUT });

    expect(getChip("Stout (0)")).toHaveAttribute("aria-selected", "true");
    expect(getChip("Toutes")).toHaveAttribute("aria-selected", "false");
  });

  it("keeps a facet family whose count is zero", () => {
    renderChips({ families: [{ value: BeerFamilyEnum.STOUT, count: 0 }], selectedFamily: BeerFamilyEnum.STOUT });

    expect(screen.getAllByRole("row")).toHaveLength(2);
    expect(getChip("Stout (0)")).toHaveAttribute("aria-selected", "true");
  });

  it("shows only All when there is no facet and no family", () => {
    renderChips({ families: [] });

    expect(screen.getAllByRole("row").map((chip) => chip.textContent)).toEqual(["Toutes"]);
  });

  it("scrolls horizontally inside the page width with touch sized chips", () => {
    renderChips();

    const list = screen.getByRole("grid", { name: "Familles" });
    expect(list.className).toContain("overflow-x-auto");
    expect(list.className).toContain("flex-nowrap");
    expect(list.className).toContain("max-w-full");
    screen.getAllByRole("row").forEach((chip) => expect(chip.className).toContain("min-h-11"));
  });
});
