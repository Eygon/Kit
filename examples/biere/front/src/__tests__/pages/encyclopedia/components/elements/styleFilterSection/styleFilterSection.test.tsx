import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import i18n from "@/i18n/i18n";
import { StyleFilterSection } from "@/pages/encyclopedia/components/elements/styleFilterSection/styleFilterSection";
import { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";

const mockStyles = vi.hoisted(() => ({ useBeerStyleGroupsQuery: vi.fn() }));

vi.mock("@/pages/encyclopedia/hooks/useBeerStyleGroupsQuery", () => mockStyles);

const GROUPS = [
  {
    family: BeerFamilyEnum.TRAPPIST,
    styles: [
      { id: 1, name: "Dubbel", description: "" },
      { id: 2, name: "Tripel", description: "" },
      { id: 3, name: "Quadrupel", description: "" },
      { id: 4, name: "Blond trappiste", description: "" },
    ],
  },
  { family: BeerFamilyEnum.IPA, styles: [{ id: 9, name: "Double IPA", description: "" }] },
  { family: BeerFamilyEnum.STOUT, styles: [] },
];

const FRENCH_FAMILY_LABELS = [
  "Toutes",
  "Lager",
  "Pilsner",
  "Pale Ale",
  "IPA",
  "Blonde",
  "Ambrée",
  "Brune",
  "Stout",
  "Porter",
  "Blanche",
  "Weizen",
  "Saison",
  "Trappiste",
  "Abbaye",
  "Forte belge",
  "Sour / Lambic",
  "Fruitée",
  "Sans alcool",
];

const ENGLISH_FAMILY_LABELS = [
  "Lager",
  "Pilsner",
  "Pale Ale",
  "IPA",
  "Blonde",
  "Amber",
  "Brown",
  "Stout",
  "Porter",
  "Witbier",
  "Weizen",
  "Saison",
  "Trappist",
  "Abbey",
  "Sour / Lambic",
  "Non-alcoholic",
];

const refetch = vi.fn();
const onFamilyChange = vi.fn();
const onStyleIdsChange = vi.fn();

const stubStyles = (overrides: Record<string, unknown> = {}) => {
  mockStyles.useBeerStyleGroupsQuery.mockReturnValue({
    groups: GROUPS,
    isPending: false,
    isError: false,
    refetch,
    ...overrides,
  });
};

const renderSection = (family: BeerFamilyEnum | null = null, styleIds: number[] = []) =>
  renderWithProviders(
    <StyleFilterSection
      family={family}
      styleIds={styleIds}
      onFamilyChange={onFamilyChange}
      onStyleIdsChange={onStyleIdsChange}
    />,
  );

describe("StyleFilterSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubStyles();
  });

  afterEach(async () => {
    await i18n.changeLanguage("fr");
  });

  it("offers All and the 18 translated families in a radio group named Famille, All selected by default", () => {
    renderSection();

    const group = screen.getByRole("radiogroup", { name: "Famille" });
    const radios = within(group).getAllByRole("radio");
    expect(radios).toHaveLength(19);
    expect(radios[0]).toBeChecked();
    expect(within(group).getByRole("radio", { name: "Toutes" })).toBeChecked();
    expect(within(group).getByRole("radio", { name: "Trappiste" })).not.toBeChecked();
    expect(within(group).getByRole("radio", { name: "Sans alcool" })).toBeInTheDocument();
    expect(within(group).getByRole("radio", { name: "Sour / Lambic" })).toBeInTheDocument();
  });

  it("writes every family radio with its French label and not with its key", () => {
    renderSection();

    const radios = within(screen.getByRole("radiogroup", { name: "Famille" })).getAllByRole("radio");
    expect(radios.map((radio) => radio.closest("label")?.textContent)).toEqual(FRENCH_FAMILY_LABELS);
  });

  it("writes the family radios with their English labels", async () => {
    await i18n.changeLanguage("en");
    renderSection();

    const radios = within(screen.getByRole("radiogroup", { name: "Family" })).getAllByRole("radio");
    const labels = radios.map((radio) => radio.closest("label")?.textContent);
    expect(labels).toHaveLength(19);
    expect(labels).toEqual(expect.arrayContaining(ENGLISH_FAMILY_LABELS));
    expect(labels.some((label) => label?.startsWith("beer."))).toBe(false);
  });

  it("writes the family labels in English", async () => {
    await i18n.changeLanguage("en");
    renderSection();

    const group = screen.getByRole("radiogroup", { name: "Family" });
    expect(within(group).getByRole("radio", { name: "All" })).toBeChecked();
    expect(within(group).getByRole("radio", { name: "Trappist" })).toBeInTheDocument();
    expect(within(group).getByRole("radio", { name: "Non-alcoholic" })).toBeInTheDocument();
  });

  it("selects the family it is given", () => {
    renderSection(BeerFamilyEnum.IPA);

    expect(screen.getByRole("radio", { name: "IPA" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Toutes" })).not.toBeChecked();
  });

  it("gives every family radio a touch target of at least 44 px", () => {
    renderSection();

    for (const radio of screen.getAllByRole("radio")) {
      expect(radio.closest("label")?.className).toContain("min-h-11");
    }
  });

  it("keeps the control and the label of every family radio in one chip, never stacked", () => {
    renderSection();

    for (const radio of screen.getAllByRole("radio")) {
      const field = radio.closest('[data-slot="radio"]');
      expect(field?.children).toHaveLength(1);
      expect(field?.firstElementChild?.tagName).toBe("LABEL");
    }
  });

  it("draws the family radios as wrapping ink-bordered chips filled green once selected", () => {
    renderSection(BeerFamilyEnum.IPA);

    const selected = screen.getByRole("radio", { name: "IPA" }).closest("label");
    const other = screen.getByRole("radio", { name: "Lager" }).closest("label");
    expect(selected).toHaveAttribute("data-selected", "true");
    expect(other).not.toHaveAttribute("data-selected", "true");
    for (const chip of [selected, other]) {
      expect(chip?.className).toContain("border-mousse");
      expect(chip?.className).toContain("rounded-control");
      expect(chip?.className).toContain("whitespace-nowrap");
      expect(chip?.className).toContain("data-[selected=true]:bg-accent");
      expect(chip?.className).toContain("data-[selected=true]:text-accent-foreground");
      expect(chip?.className).toContain("data-[focus-visible=true]:focus-ring");
    }
    expect(screen.getByRole("radiogroup", { name: "Famille" }).querySelector(".flex-wrap")).not.toBeNull();
    expect(selected?.closest('[data-slot="radio"]')?.className).toContain("mt-0");
  });

  it("moves the family with the arrow keys", async () => {
    const user = userEvent.setup();
    renderSection();

    await user.tab();
    await user.keyboard("{ArrowRight}");

    expect(onFamilyChange).toHaveBeenCalledTimes(1);
  });

  it("draws the style checkboxes as wrapping chips whose control sits in the label", () => {
    renderSection(BeerFamilyEnum.TRAPPIST, [2]);

    const selected = screen.getByRole("checkbox", { name: "Tripel" }).closest("label");
    expect(selected).toHaveAttribute("data-selected", "true");
    expect(selected?.className).toContain("data-[selected=true]:bg-accent");
    expect(selected?.className).toContain("border-mousse");
    for (const box of screen.getAllByRole("checkbox")) {
      expect(box.closest('[data-slot="checkbox"]')?.children).toHaveLength(1);
    }
    expect(screen.getByRole("group", { name: "Styles" }).querySelector(".flex-wrap")).not.toBeNull();
  });

  it("shows no style while no family is chosen", () => {
    renderSection();

    expect(screen.queryByRole("group", { name: "Styles" })).not.toBeInTheDocument();
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });

  it("AC1 lists the 4 styles of the chosen family as checkboxes named by the data, none of another family", () => {
    renderSection(BeerFamilyEnum.TRAPPIST);

    const group = screen.getByRole("group", { name: "Styles" });
    const boxes = within(group).getAllByRole("checkbox");
    expect(boxes.map((box) => box.closest("label")?.textContent)).toEqual([
      "Dubbel",
      "Tripel",
      "Quadrupel",
      "Blond trappiste",
    ]);
    expect(screen.queryByRole("checkbox", { name: "Double IPA" })).not.toBeInTheDocument();
  });

  it("keeps the style names as the data gives them in English", async () => {
    await i18n.changeLanguage("en");
    renderSection(BeerFamilyEnum.TRAPPIST);

    expect(screen.getByRole("group", { name: "Styles" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Dubbel" })).toBeInTheDocument();
  });

  it("checks the given style ids", () => {
    renderSection(BeerFamilyEnum.TRAPPIST, [2, 4]);

    expect(screen.getByRole("checkbox", { name: "Dubbel" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Tripel" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Blond trappiste" })).toBeChecked();
  });

  it("reports the checked style ids as numbers, keeping the others", async () => {
    const user = userEvent.setup();
    renderSection(BeerFamilyEnum.TRAPPIST, [2]);

    await user.click(screen.getByRole("checkbox", { name: "Quadrupel" }));

    expect(onStyleIdsChange).toHaveBeenCalledTimes(1);
    expect(onStyleIdsChange).toHaveBeenCalledWith([2, 3]);
  });

  it("reports the remaining ids when a style is unchecked", async () => {
    const user = userEvent.setup();
    renderSection(BeerFamilyEnum.TRAPPIST, [2, 3]);

    await user.click(screen.getByRole("checkbox", { name: "Tripel" }));

    expect(onStyleIdsChange).toHaveBeenCalledWith([3]);
  });

  it("gives every style checkbox a touch target of at least 44 px", () => {
    renderSection(BeerFamilyEnum.TRAPPIST);

    for (const box of screen.getAllByRole("checkbox")) {
      expect(box.closest("label")?.className).toContain("min-h-11");
    }
  });

  it("AC2 reports the new family when another family is chosen", async () => {
    const user = userEvent.setup();
    renderSection(BeerFamilyEnum.TRAPPIST, [1, 2]);

    await user.click(screen.getByRole("radio", { name: "IPA" }));

    expect(onFamilyChange).toHaveBeenCalledTimes(1);
    expect(onFamilyChange).toHaveBeenCalledWith(BeerFamilyEnum.IPA);
    expect(onStyleIdsChange).not.toHaveBeenCalled();
  });

  it("AC2 reports no family when All is chosen again", async () => {
    const user = userEvent.setup();
    renderSection(BeerFamilyEnum.TRAPPIST, [1]);

    await user.click(screen.getByRole("radio", { name: "Toutes" }));

    expect(onFamilyChange).toHaveBeenCalledTimes(1);
    expect(onFamilyChange).toHaveBeenCalledWith(null);
  });

  it("does not report a family when the selected one is chosen again", async () => {
    const user = userEvent.setup();
    renderSection(BeerFamilyEnum.IPA);

    await user.click(screen.getByRole("radio", { name: "IPA" }));

    expect(onFamilyChange).not.toHaveBeenCalled();
  });

  it("shows no style list for a family without style", () => {
    renderSection(BeerFamilyEnum.STOUT);

    expect(screen.queryByRole("group", { name: "Styles" })).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows a busy skeleton instead of the styles while they load for a chosen family", () => {
    stubStyles({ groups: [], isPending: true });
    const { container } = renderSection(BeerFamilyEnum.TRAPPIST);

    expect(container.querySelector("[aria-busy='true']")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Styles" })).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Famille" })).toBeInTheDocument();
  });

  it("shows no skeleton while loading when no family is chosen", () => {
    stubStyles({ groups: [], isPending: true });
    const { container } = renderSection();

    expect(container.querySelector("[aria-busy='true']")).not.toBeInTheDocument();
  });

  it("AC3 shows an alert with a Réessayer button on error, and keeps the family radios usable", async () => {
    const user = userEvent.setup();
    stubStyles({ groups: [], isError: true });
    renderSection();

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Impossible de charger les styles.");
    expect(screen.queryByRole("group", { name: "Styles" })).not.toBeInTheDocument();
    await user.click(within(alert).getByRole("button", { name: "Réessayer" }));
    expect(refetch).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("radio", { name: "Trappiste" }));
    expect(onFamilyChange).toHaveBeenCalledWith(BeerFamilyEnum.TRAPPIST);
  });

  it("AC3 writes the error in English", async () => {
    await i18n.changeLanguage("en");
    stubStyles({ groups: [], isError: true });
    renderSection(BeerFamilyEnum.TRAPPIST);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Could not load the styles.");
    expect(within(alert).getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});
