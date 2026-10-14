import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "@/i18n/i18n";
import { BeerFiltersDrawer } from "@/pages/encyclopedia/components/widgets/beerFiltersDrawer/beerFiltersDrawer";
import { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";
import { BeerFormatEnum } from "@/types/enums/beer/beerFormatEnum";
import { BeerSortEnum } from "@/types/enums/beer/beerSortEnum";
import { BeerStatusEnum } from "@/types/enums/beer/beerStatusEnum";
import { EMPTY_BEER_QUERY } from "@/types/mappers/beer/beerQueryMapper";
import type { BeerQuery } from "@/types/models/beer/beerQuery";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";

const mockPreview = vi.hoisted(() => ({ useBeerPreviewQuery: vi.fn() }));
const mockStyles = vi.hoisted(() => ({ useBeerStyleGroupsQuery: vi.fn() }));

vi.mock("@/pages/encyclopedia/hooks/useBeerPreviewQuery", () => mockPreview);
vi.mock("@/pages/encyclopedia/hooks/useBeerStyleGroupsQuery", () => mockStyles);

const CATALOG_TOTAL = 120;
const BELGIUM_TOTAL = 49;
const FACETS = {
  families: [],
  countries: [
    { value: "BE", count: 49 },
    { value: "DE", count: 12 },
  ],
  formats: [
    { value: BeerFormatEnum.BOTTLE, count: 30 },
    { value: BeerFormatEnum.CAN, count: 12 },
    { value: BeerFormatEnum.DRAFT, count: 0 },
  ],
};

const STYLE_GROUPS = [
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
];

const refetchStyles = vi.fn();

const stubStyles = (overrides: Record<string, unknown> = {}) => {
  mockStyles.useBeerStyleGroupsQuery.mockReturnValue({
    groups: STYLE_GROUPS,
    isPending: false,
    isError: false,
    refetch: refetchStyles,
    ...overrides,
  });
};

const onApply = vi.fn();

const TRAPPIST_TOTAL = 11;
const TRIPEL_TOTAL = 3;

const totalFor = (query: BeerQuery) => {
  if (query.countries.length > 0) return BELGIUM_TOTAL;
  if (query.styleIds.length > 0) return TRIPEL_TOTAL;
  if (query.family === BeerFamilyEnum.TRAPPIST) return TRAPPIST_TOTAL;
  return CATALOG_TOTAL;
};

const stubPreview = (overrides: Record<string, unknown> = {}) => {
  mockPreview.useBeerPreviewQuery.mockImplementation((query: BeerQuery) => ({
    total: totalFor(query),
    facets: FACETS,
    isError: false,
    isFetching: false,
    ...overrides,
  }));
};

const renderDrawer = (appliedQuery: BeerQuery = EMPTY_BEER_QUERY) =>
  renderWithProviders(<BeerFiltersDrawer appliedQuery={appliedQuery} onApply={onApply} />);

const lastPreviewCall = () => mockPreview.useBeerPreviewQuery.mock.calls.at(-1) as [BeerQuery, boolean];

const openDrawer = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: "Filtres" }));
  return screen.findByRole("dialog", { name: "Filtres" });
};

const getApplyButton = (name: string | RegExp) => within(screen.getByRole("dialog")).getByRole("button", { name });

describe("BeerFiltersDrawer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubPreview();
    stubStyles();
  });

  afterEach(async () => {
    await i18n.changeLanguage("fr");
  });

  it("shows a closed Filters button and loads no preview while closed", () => {
    renderDrawer();

    expect(screen.getByRole("button", { name: "Filtres" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(lastPreviewCall()[1]).toBe(false);
  });

  it("opens a bottom sheet titled Filters that loads the preview of the applied query", async () => {
    const user = userEvent.setup();
    renderDrawer({ ...EMPTY_BEER_QUERY, countries: ["BE"] });

    const dialog = await openDrawer(user);

    expect(within(dialog).getByRole("heading", { name: "Filtres" })).toBeInTheDocument();
    expect(dialog.closest('[data-placement="bottom"]')).not.toBeNull();
    expect(lastPreviewCall()[1]).toBe(true);
    expect(lastPreviewCall()[0]).toEqual({ ...EMPTY_BEER_QUERY, countries: ["BE"] });
  });

  it("AC8 shows no count badge when no drawer filter is set, and the search does not count", () => {
    renderDrawer({ ...EMPTY_BEER_QUERY, search: "orval" });

    expect(screen.queryByText(/filtres? actifs?/)).not.toBeInTheDocument();
  });

  it("AC8 shows the number of drawer filters set on the Filters button", () => {
    renderDrawer({
      ...EMPTY_BEER_QUERY,
      family: BeerFamilyEnum.TRAPPIST,
      countries: ["BE", "DE"],
      abvMin: 4,
      sort: BeerSortEnum.ABV,
    });

    expect(screen.getByText("5 filtres actifs")).toBeInTheDocument();
    expect(screen.getByText("5", { selector: "[aria-hidden='true']" })).toBeInTheDocument();
  });

  it("AC8 writes the count in the singular and in English", async () => {
    await i18n.changeLanguage("en");
    renderDrawer({ ...EMPTY_BEER_QUERY, formats: [BeerFormatEnum.CAN] });

    expect(screen.getByText("1 active filter")).toBeInTheDocument();
  });

  it("AC1 updates the counter on a draft country without applying anything", async () => {
    const user = userEvent.setup();
    renderDrawer();
    await openDrawer(user);
    expect(getApplyButton("Voir 120 bières")).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "Belgique (49)" }));

    expect(getApplyButton("Voir 49 bières")).toBeInTheDocument();
    expect(lastPreviewCall()[0]).toEqual({ ...EMPTY_BEER_QUERY, countries: ["BE"] });
    expect(onApply).not.toHaveBeenCalled();
  });

  it("writes the counter in the singular for one beer", async () => {
    const user = userEvent.setup();
    stubPreview({ total: 1 });
    renderDrawer();
    await openDrawer(user);

    expect(getApplyButton("Voir 1 bière")).toBeInTheDocument();
  });

  it("AC2 applies the draft, closes the drawer and applies it once", async () => {
    const user = userEvent.setup();
    renderDrawer();
    await openDrawer(user);
    await user.click(screen.getByRole("checkbox", { name: "Belgique (49)" }));
    await user.click(screen.getByRole("checkbox", { name: "Canette (12)" }));

    await user.click(getApplyButton("Voir 49 bières"));

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith({
      ...EMPTY_BEER_QUERY,
      countries: ["BE"],
      formats: [BeerFormatEnum.CAN],
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("AC3 changes nothing when the drawer is closed without applying, and reopens on the applied filters", async () => {
    const user = userEvent.setup();
    renderDrawer({ ...EMPTY_BEER_QUERY, countries: ["DE"] });
    await openDrawer(user);
    await user.click(screen.getByRole("checkbox", { name: "Belgique (49)" }));
    await user.click(screen.getByRole("checkbox", { name: "Allemagne (12)" }));
    expect(screen.getByRole("checkbox", { name: "Belgique (49)" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Allemagne (12)" })).not.toBeChecked();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(onApply).not.toHaveBeenCalled();
    await openDrawer(user);

    expect(screen.getByRole("checkbox", { name: "Belgique (49)" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Allemagne (12)" })).toBeChecked();
    expect(lastPreviewCall()[0]).toEqual({ ...EMPTY_BEER_QUERY, countries: ["DE"] });
  });

  it("AC4 resets the draft to no filter, search included, and shows the catalog total", async () => {
    const user = userEvent.setup();
    const applied: BeerQuery = {
      ...EMPTY_BEER_QUERY,
      search: "orval",
      family: BeerFamilyEnum.TRAPPIST,
      countries: ["BE"],
      formats: [BeerFormatEnum.CAN],
      abvMin: 4,
      sort: BeerSortEnum.BREWERY,
    };
    renderDrawer(applied);
    await openDrawer(user);
    expect(getApplyButton("Voir 49 bières")).toBeInTheDocument();

    await user.click(getApplyButton("Réinitialiser"));

    expect(lastPreviewCall()[0]).toEqual(EMPTY_BEER_QUERY);
    expect(getApplyButton("Voir 120 bières")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Belgique (49)" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Canette (12)" })).not.toBeChecked();
    expect(onApply).not.toHaveBeenCalled();

    await user.click(getApplyButton("Voir 120 bières"));

    expect(onApply).toHaveBeenCalledWith(EMPTY_BEER_QUERY);
  });

  it("AC4 resets the checked styles of the draft with the family", async () => {
    const user = userEvent.setup();
    renderDrawer({ ...EMPTY_BEER_QUERY, family: BeerFamilyEnum.TRAPPIST, styleIds: [1, 2] });
    const dialog = await openDrawer(user);
    expect(within(dialog).getByRole("checkbox", { name: "Dubbel" })).toBeChecked();
    expect(within(dialog).getByRole("checkbox", { name: "Tripel" })).toBeChecked();

    await user.click(getApplyButton("Réinitialiser"));

    expect(lastPreviewCall()[0]).toEqual(EMPTY_BEER_QUERY);
    expect(within(within(dialog).getByRole("radiogroup", { name: "Famille" })).getByRole("radio", { name: "Toutes" })).toBeChecked();
    expect(within(dialog).queryByRole("checkbox", { name: "Dubbel" })).not.toBeInTheDocument();
    await user.click(getApplyButton("Voir 120 bières"));
    expect(onApply).toHaveBeenCalledWith(EMPTY_BEER_QUERY);
  });

  it("AC5 lists the countries and formats of the facets with their counts and translated labels", async () => {
    const user = userEvent.setup();
    renderDrawer();
    const dialog = await openDrawer(user);

    const countries = within(within(dialog).getByRole("group", { name: "Pays" })).getAllByRole("checkbox");
    expect(countries.map((box) => box.closest("label")?.textContent)).toEqual(["Belgique (49)", "Allemagne (12)"]);
    const formats = within(within(dialog).getByRole("group", { name: "Format" })).getAllByRole("checkbox");
    expect(formats.map((box) => box.closest("label")?.textContent)).toEqual([
      "Bouteille (30)",
      "Canette (12)",
      "Pression (0)",
    ]);
  });

  it("AC5 writes the labels in English", async () => {
    await i18n.changeLanguage("en");
    const user = userEvent.setup();
    renderDrawer();
    await user.click(screen.getByRole("button", { name: "Filters" }));
    const dialog = await screen.findByRole("dialog", { name: "Filters" });

    expect(within(dialog).getByRole("checkbox", { name: "Belgium (49)" })).toBeInTheDocument();
    expect(within(dialog).getByRole("checkbox", { name: "Bottle (30)" })).toBeInTheDocument();
    expect(within(dialog).getByRole("checkbox", { name: "Can (12)" })).toBeInTheDocument();
    expect(within(dialog).getByRole("checkbox", { name: "Draft (0)" })).toBeInTheDocument();
    expect(getApplyButton("Show 120 beers")).toBeInTheDocument();
  });

  it("AC5 keeps a checked country and a checked format at a count of zero", async () => {
    const user = userEvent.setup();
    stubPreview({ facets: { ...FACETS, formats: FACETS.formats.slice(0, 2) } });
    renderDrawer({ ...EMPTY_BEER_QUERY, countries: ["NL"], formats: [BeerFormatEnum.DRAFT] });
    await openDrawer(user);

    expect(screen.getByRole("checkbox", { name: "Pays-Bas (0)" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Pression (0)" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Belgique (49)" })).not.toBeChecked();
  });

  it("AC5 still shows the checked options while the facets are not loaded", async () => {
    const user = userEvent.setup();
    stubPreview({ facets: null, total: null });
    renderDrawer({ ...EMPTY_BEER_QUERY, countries: ["BE"] });
    await openDrawer(user);

    expect(screen.getByRole("checkbox", { name: "Belgique (0)" })).toBeChecked();
    expect(screen.getAllByRole("checkbox")).toHaveLength(1);
  });

  it("AC6 offers a degree slider from 0 to 14 by steps of 0.5 and shows its bounds", async () => {
    const user = userEvent.setup();
    renderDrawer();
    const dialog = await openDrawer(user);

    const [minThumb, maxThumb] = within(dialog).getAllByRole("slider");
    expect(minThumb).toHaveAttribute("min", "0");
    expect(minThumb).toHaveAttribute("max", "14");
    expect(minThumb).toHaveAttribute("step", "0.5");
    expect(minThumb).toHaveValue("0");
    expect(maxThumb).toHaveValue("14");
    expect(within(dialog).getByText(/^0 à 14\s%$/)).toBeInTheDocument();
    expect(within(dialog).getByRole("group", { name: "Degré" })).toBeInTheDocument();
  });

  it("AC6 moves the bounds by half a degree and sends no bound at the extremes", async () => {
    const user = userEvent.setup();
    renderDrawer();
    const dialog = await openDrawer(user);
    const [minThumb, maxThumb] = within(dialog).getAllByRole("slider");

    await user.click(minThumb);
    await user.keyboard("{ArrowRight}");
    expect(lastPreviewCall()[0]).toEqual({ ...EMPTY_BEER_QUERY, abvMin: 0.5, abvMax: null });
    expect(within(dialog).getByText(/^0,5 à 14\s%$/)).toBeInTheDocument();

    await user.keyboard("{ArrowLeft}");
    expect(lastPreviewCall()[0]).toEqual(EMPTY_BEER_QUERY);

    await user.click(maxThumb);
    await user.keyboard("{ArrowLeft}");
    expect(lastPreviewCall()[0]).toEqual({ ...EMPTY_BEER_QUERY, abvMin: null, abvMax: 13.5 });
    expect(within(dialog).getByText(/^0 à 13,5\s%$/)).toBeInTheDocument();

    await user.keyboard("{ArrowRight}");
    expect(lastPreviewCall()[0]).toEqual(EMPTY_BEER_QUERY);
  });

  it("AC6 starts the slider on the applied degree range", async () => {
    const user = userEvent.setup();
    renderDrawer({ ...EMPTY_BEER_QUERY, abvMin: 4, abvMax: 9.5 });
    const dialog = await openDrawer(user);

    const [minThumb, maxThumb] = within(dialog).getAllByRole("slider");
    expect(minThumb).toHaveValue("4");
    expect(maxThumb).toHaveValue("9.5");
    expect(within(dialog).getByText(/^4 à 9,5\s%$/)).toBeInTheDocument();
  });

  it("AC7 sorts by degree once chosen and applied", async () => {
    const user = userEvent.setup();
    renderDrawer();
    const dialog = await openDrawer(user);
    expect(within(dialog).getByRole("button", { name: /Trier par/ })).toHaveTextContent("Nom");

    await user.click(within(dialog).getByRole("button", { name: /Trier par/ }));
    await user.click(screen.getByRole("option", { name: "Degré" }));
    expect(lastPreviewCall()[0]).toEqual({ ...EMPTY_BEER_QUERY, sort: BeerSortEnum.ABV });
    await user.click(getApplyButton(/^Voir \d+ bières$/));

    expect(onApply).toHaveBeenCalledWith({ ...EMPTY_BEER_QUERY, sort: BeerSortEnum.ABV });
  });

  it("offers the four sorts with a touch target of at least 44 px", async () => {
    const user = userEvent.setup();
    renderDrawer({ ...EMPTY_BEER_QUERY, sort: BeerSortEnum.BREWERY });
    const dialog = await openDrawer(user);
    const trigger = within(dialog).getByRole("button", { name: /Trier par/ });
    expect(trigger).toHaveTextContent("Brasserie");
    expect(trigger.className).toContain("min-h-11");

    await user.click(trigger);

    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual(["Nom", "Degré", "Brasserie", "Mieux notées"]);
  });

  it("AC9 says the number is unavailable when the preview failed, and still applies", async () => {
    const user = userEvent.setup();
    stubPreview({ total: null, facets: null, isError: true });
    renderDrawer();
    await openDrawer(user);

    const button = getApplyButton("Voir les bières");
    expect(button).toBeEnabled();
    await user.click(button);

    expect(onApply).toHaveBeenCalledWith(EMPTY_BEER_QUERY);
  });

  it("says the number is unavailable while the first count is loading", async () => {
    const user = userEvent.setup();
    stubPreview({ total: null, facets: null, isFetching: true });
    renderDrawer();
    await openDrawer(user);

    expect(getApplyButton("Voir les bières")).toBeEnabled();
  });

  it("AC9 writes the unavailable counter in English", async () => {
    await i18n.changeLanguage("en");
    const user = userEvent.setup();
    stubPreview({ total: null, facets: null, isError: true });
    renderDrawer();
    await user.click(screen.getByRole("button", { name: "Filters" }));
    await screen.findByRole("dialog", { name: "Filters" });

    expect(getApplyButton("Show beers")).toBeInTheDocument();
  });

  it("closes when the applied query changes, as on browser back", async () => {
    const user = userEvent.setup();
    const { rerender } = renderDrawer();
    await openDrawer(user);

    rerender(<BeerFiltersDrawer appliedQuery={{ ...EMPTY_BEER_QUERY, countries: ["BE"] }} onApply={onApply} />);

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("stays open when it is rendered again with an equal applied query", async () => {
    const user = userEvent.setup();
    const { rerender } = renderDrawer(EMPTY_BEER_QUERY);
    await openDrawer(user);

    await act(async () => rerender(<BeerFiltersDrawer appliedQuery={EMPTY_BEER_QUERY} onApply={onApply} />));

    expect(screen.getByRole("dialog", { name: "Filtres" })).toBeInTheDocument();
  });

  it("stays open when the applied query is replaced by a distinct object of the same value", async () => {
    const user = userEvent.setup();
    const { rerender } = renderDrawer({ ...EMPTY_BEER_QUERY, countries: ["BE"] });
    await openDrawer(user);

    await act(async () =>
      rerender(<BeerFiltersDrawer appliedQuery={{ ...EMPTY_BEER_QUERY, countries: ["BE"] }} onApply={onApply} />),
    );

    expect(screen.getByRole("dialog", { name: "Filtres" })).toBeInTheDocument();
  });

  it("AC1 shows the 4 styles of Trappiste once chosen and the counter follows the draft", async () => {
    const user = userEvent.setup();
    renderDrawer();
    const dialog = await openDrawer(user);
    expect(within(within(dialog).getByRole("radiogroup", { name: "Famille" })).getByRole("radio", { name: "Toutes" })).toBeChecked();
    expect(within(dialog).queryByRole("group", { name: "Styles" })).not.toBeInTheDocument();

    await user.click(within(dialog).getByRole("radio", { name: "Trappiste" }));

    const styles = within(within(dialog).getByRole("group", { name: "Styles" })).getAllByRole("checkbox");
    expect(styles.map((box) => box.closest("label")?.textContent)).toEqual([
      "Dubbel",
      "Tripel",
      "Quadrupel",
      "Blond trappiste",
    ]);
    expect(lastPreviewCall()[0]).toEqual({ ...EMPTY_BEER_QUERY, family: BeerFamilyEnum.TRAPPIST });
    expect(getApplyButton("Voir 11 bières")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("checkbox", { name: "Tripel" }));

    expect(lastPreviewCall()[0]).toEqual({ ...EMPTY_BEER_QUERY, family: BeerFamilyEnum.TRAPPIST, styleIds: [2] });
    expect(getApplyButton("Voir 3 bières")).toBeInTheDocument();
    expect(onApply).not.toHaveBeenCalled();
  });

  it("AC1 applies the chosen family with its checked styles", async () => {
    const user = userEvent.setup();
    renderDrawer();
    const dialog = await openDrawer(user);
    await user.click(within(dialog).getByRole("radio", { name: "Trappiste" }));
    await user.click(within(dialog).getByRole("checkbox", { name: "Tripel" }));
    await user.click(within(dialog).getByRole("checkbox", { name: "Dubbel" }));

    await user.click(getApplyButton("Voir 3 bières"));

    expect(onApply).toHaveBeenCalledWith({ ...EMPTY_BEER_QUERY, family: BeerFamilyEnum.TRAPPIST, styleIds: [2, 1] });
  });

  it("AC2 removes the checked styles when another family is chosen", async () => {
    const user = userEvent.setup();
    renderDrawer({ ...EMPTY_BEER_QUERY, family: BeerFamilyEnum.TRAPPIST, styleIds: [1, 2] });
    const dialog = await openDrawer(user);
    expect(within(dialog).getByRole("checkbox", { name: "Dubbel" })).toBeChecked();

    await user.click(within(dialog).getByRole("radio", { name: "IPA" }));

    expect(lastPreviewCall()[0]).toEqual({ ...EMPTY_BEER_QUERY, family: BeerFamilyEnum.IPA, styleIds: [] });
    expect(within(dialog).getByRole("checkbox", { name: "Double IPA" })).not.toBeChecked();

    await user.click(within(dialog).getByRole("radio", { name: "Trappiste" }));

    expect(within(dialog).getByRole("checkbox", { name: "Dubbel" })).not.toBeChecked();
    expect(within(dialog).getByRole("checkbox", { name: "Tripel" })).not.toBeChecked();
  });

  it("AC2 removes the checked styles when back to All", async () => {
    const user = userEvent.setup();
    renderDrawer({ ...EMPTY_BEER_QUERY, family: BeerFamilyEnum.TRAPPIST, styleIds: [1, 2] });
    const dialog = await openDrawer(user);

    await user.click(within(within(dialog).getByRole("radiogroup", { name: "Famille" })).getByRole("radio", { name: "Toutes" }));

    expect(lastPreviewCall()[0]).toEqual({ ...EMPTY_BEER_QUERY, family: null, styleIds: [] });
    expect(within(dialog).queryByRole("group", { name: "Styles" })).not.toBeInTheDocument();
    await user.click(getApplyButton("Voir 120 bières"));
    expect(onApply).toHaveBeenCalledWith(EMPTY_BEER_QUERY);
  });

  it("AC2 keeps the other drawer filters when the family changes", async () => {
    const user = userEvent.setup();
    renderDrawer({ ...EMPTY_BEER_QUERY, family: BeerFamilyEnum.TRAPPIST, styleIds: [1], countries: ["BE"], abvMin: 4 });
    const dialog = await openDrawer(user);

    await user.click(within(dialog).getByRole("radio", { name: "IPA" }));

    expect(lastPreviewCall()[0]).toEqual({
      ...EMPTY_BEER_QUERY,
      family: BeerFamilyEnum.IPA,
      styleIds: [],
      countries: ["BE"],
      abvMin: 4,
    });
  });

  it("E6 opens on a family combined with the styles of another family without any alert and applies it unchanged", async () => {
    const user = userEvent.setup();
    renderDrawer({ ...EMPTY_BEER_QUERY, family: BeerFamilyEnum.TRAPPIST, styleIds: [9] });
    const dialog = await openDrawer(user);

    expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
    expect(within(dialog).getByRole("radio", { name: "Trappiste" })).toBeChecked();
    expect(lastPreviewCall()[0]).toEqual({ ...EMPTY_BEER_QUERY, family: BeerFamilyEnum.TRAPPIST, styleIds: [9] });
    await user.click(getApplyButton(/^Voir \d+ bières$/));

    expect(onApply).toHaveBeenCalledWith({ ...EMPTY_BEER_QUERY, family: BeerFamilyEnum.TRAPPIST, styleIds: [9] });
  });

  it("AC3 shows the alert with Réessayer in the styles section while the rest of the drawer stays usable", async () => {
    const user = userEvent.setup();
    stubStyles({ groups: [], isError: true });
    renderDrawer();
    const dialog = await openDrawer(user);

    const alert = within(dialog).getByRole("alert");
    expect(alert).toHaveTextContent("Impossible de charger les styles.");
    await user.click(within(alert).getByRole("button", { name: "Réessayer" }));
    expect(refetchStyles).toHaveBeenCalledTimes(1);

    await user.click(within(dialog).getByRole("checkbox", { name: "Belgique (49)" }));
    expect(getApplyButton("Voir 49 bières")).toBeInTheDocument();
    await user.click(getApplyButton("Voir 49 bières"));
    expect(onApply).toHaveBeenCalledWith({ ...EMPTY_BEER_QUERY, countries: ["BE"] });
  });

  it("AC4 opens with the family chosen by a chip already selected and its styles listed", async () => {
    const user = userEvent.setup();
    renderDrawer({ ...EMPTY_BEER_QUERY, family: BeerFamilyEnum.TRAPPIST });
    const dialog = await openDrawer(user);

    expect(within(dialog).getByRole("radio", { name: "Trappiste" })).toBeChecked();
    expect(within(within(dialog).getByRole("radiogroup", { name: "Famille" })).getByRole("radio", { name: "Toutes" })).not.toBeChecked();
    expect(within(dialog).getAllByRole("checkbox", { name: /Dubbel|Tripel|Quadrupel|Blond trappiste/ })).toHaveLength(4);
  });

  it("AC4 reopens on the applied family after a draft family was abandoned", async () => {
    const user = userEvent.setup();
    renderDrawer({ ...EMPTY_BEER_QUERY, family: BeerFamilyEnum.TRAPPIST });
    const dialog = await openDrawer(user);
    await user.click(within(dialog).getByRole("radio", { name: "IPA" }));

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const reopened = await openDrawer(user);

    expect(within(reopened).getByRole("radio", { name: "Trappiste" })).toBeChecked();
  });

  it("mounts the family and styles section first in the drawer body", async () => {
    const user = userEvent.setup();
    renderDrawer();
    const dialog = await openDrawer(user);

    const familyGroup = within(dialog).getByRole("radiogroup", { name: "Famille" });
    const slider = within(dialog).getByRole("group", { name: "Degré" });
    const countries = within(dialog).getByRole("group", { name: "Pays" });
    const formats = within(dialog).getByRole("group", { name: "Format" });
    expect(familyGroup.compareDocumentPosition(slider) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(familyGroup.compareDocumentPosition(countries) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(familyGroup.compareDocumentPosition(formats) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe("BeerFiltersDrawer status section", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubPreview();
    stubStyles();
  });

  afterEach(async () => {
    await i18n.changeLanguage("fr");
  });

  const getStatusGroup = (dialog: HTMLElement) => within(dialog).getByRole("radiogroup", { name: "Statut" });

  it("AC4 puts a Status section before the family with All checked and the three statuses as chips", async () => {
    const user = userEvent.setup();
    renderDrawer();
    const dialog = await openDrawer(user);

    const statusGroup = getStatusGroup(dialog);
    const familyGroup = within(dialog).getByRole("radiogroup", { name: "Famille" });
    expect(statusGroup.compareDocumentPosition(familyGroup) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(statusGroup).getAllByRole("radio").map((radio) => radio.closest("label")?.textContent)).toEqual([
      "Toutes",
      "Bues",
      "À goûter",
      "Jamais goûtées",
    ]);
    expect(within(statusGroup).getByRole("radio", { name: "Toutes" })).toBeChecked();
  });

  it("AC4 applies the chosen status and counts it in the preview of the draft", async () => {
    const user = userEvent.setup();
    renderDrawer();
    const dialog = await openDrawer(user);

    await user.click(within(getStatusGroup(dialog)).getByRole("radio", { name: "Bues" }));

    expect(lastPreviewCall()[0]).toEqual({ ...EMPTY_BEER_QUERY, status: BeerStatusEnum.DRUNK });
    expect(onApply).not.toHaveBeenCalled();
    await user.click(getApplyButton(/^Voir \d+ bières$/));

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith({ ...EMPTY_BEER_QUERY, status: BeerStatusEnum.DRUNK });
  });

  it("AC4 applies each of the other statuses", async () => {
    const user = userEvent.setup();
    renderDrawer();
    const dialog = await openDrawer(user);

    await user.click(within(getStatusGroup(dialog)).getByRole("radio", { name: "À goûter" }));
    await user.click(getApplyButton(/^Voir \d+ bières$/));
    expect(onApply).toHaveBeenLastCalledWith({ ...EMPTY_BEER_QUERY, status: BeerStatusEnum.WISHLIST });

    const reopened = await openDrawer(user);
    await user.click(within(getStatusGroup(reopened)).getByRole("radio", { name: "Jamais goûtées" }));
    await user.click(getApplyButton(/^Voir \d+ bières$/));
    expect(onApply).toHaveBeenLastCalledWith({ ...EMPTY_BEER_QUERY, status: BeerStatusEnum.UNTASTED });
  });

  it("AC4 goes back to no status when All is chosen again", async () => {
    const user = userEvent.setup();
    renderDrawer({ ...EMPTY_BEER_QUERY, status: BeerStatusEnum.WISHLIST });
    const dialog = await openDrawer(user);
    expect(within(getStatusGroup(dialog)).getByRole("radio", { name: "À goûter" })).toBeChecked();

    await user.click(within(getStatusGroup(dialog)).getByRole("radio", { name: "Toutes" }));
    await user.click(getApplyButton(/^Voir \d+ bières$/));

    expect(onApply).toHaveBeenCalledWith({ ...EMPTY_BEER_QUERY, status: null });
  });

  it("AC4 shows the status as one more active filter on the button", () => {
    renderDrawer({ ...EMPTY_BEER_QUERY, family: BeerFamilyEnum.IPA, status: BeerStatusEnum.DRUNK });

    expect(screen.getByText("2 filtres actifs")).toBeInTheDocument();
  });

  it("AC4 puts All back on Réinitialiser", async () => {
    const user = userEvent.setup();
    renderDrawer({ ...EMPTY_BEER_QUERY, status: BeerStatusEnum.DRUNK });
    const dialog = await openDrawer(user);
    expect(within(getStatusGroup(dialog)).getByRole("radio", { name: "Bues" })).toBeChecked();

    await user.click(getApplyButton("Réinitialiser"));

    expect(within(getStatusGroup(dialog)).getByRole("radio", { name: "Toutes" })).toBeChecked();
    expect(within(getStatusGroup(dialog)).getByRole("radio", { name: "Bues" })).not.toBeChecked();
    expect(lastPreviewCall()[0]).toEqual(EMPTY_BEER_QUERY);
  });

  it("writes the statuses in English", async () => {
    const user = userEvent.setup();
    await i18n.changeLanguage("en");
    renderDrawer();
    await user.click(screen.getByRole("button", { name: "Filters" }));
    const dialog = await screen.findByRole("dialog", { name: "Filters" });

    const group = within(dialog).getByRole("radiogroup", { name: "Status" });
    ["All", "Tasted", "To taste", "Never tasted"].forEach((name) =>
      expect(within(group).getByRole("radio", { name })).toBeInTheDocument(),
    );
  });
});

describe("BeerFiltersDrawer minimum rating section", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubPreview();
    stubStyles();
  });

  afterEach(async () => {
    await i18n.changeLanguage("fr");
  });

  const getRatingGroup = (dialog: HTMLElement) => within(dialog).getByRole("radiogroup", { name: "Note minimale" });

  it("puts a Minimum rating section after the status with All checked and the four options as chips", async () => {
    const user = userEvent.setup();
    renderDrawer();
    const dialog = await openDrawer(user);

    const ratingGroup = getRatingGroup(dialog);
    const statusGroup = within(dialog).getByRole("radiogroup", { name: "Statut" });
    expect(statusGroup.compareDocumentPosition(ratingGroup) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(ratingGroup).getAllByRole("radio").map((radio) => radio.closest("label")?.textContent)).toEqual([
      "Toutes",
      "3+",
      "3,5+",
      "4+",
      "4,5+",
    ]);
    expect(within(ratingGroup).getByRole("radio", { name: "Toutes" })).toBeChecked();
  });

  it("AC1 applies the chosen minimum rating, counts it in the preview and on the button", async () => {
    const user = userEvent.setup();
    renderDrawer();
    const dialog = await openDrawer(user);

    await user.click(within(getRatingGroup(dialog)).getByRole("radio", { name: "4+" }));

    expect(lastPreviewCall()[0]).toEqual({ ...EMPTY_BEER_QUERY, minRating: 4 });
    expect(onApply).not.toHaveBeenCalled();
    await user.click(getApplyButton(/^Voir \d+ bières$/));

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith({ ...EMPTY_BEER_QUERY, minRating: 4 });
  });

  it("AC1 shows the minimum rating as one more active filter on the button", () => {
    renderDrawer({ ...EMPTY_BEER_QUERY, minRating: 4 });

    expect(screen.getByText("1 filtre actif")).toBeInTheDocument();
  });

  it("AC1 applies a half-point option", async () => {
    const user = userEvent.setup();
    renderDrawer();
    const dialog = await openDrawer(user);

    await user.click(within(getRatingGroup(dialog)).getByRole("radio", { name: "3,5+" }));
    await user.click(getApplyButton(/^Voir \d+ bières$/));

    expect(onApply).toHaveBeenCalledWith({ ...EMPTY_BEER_QUERY, minRating: 3.5 });
  });

  it("starts on the applied minimum rating and goes back to none when All is chosen", async () => {
    const user = userEvent.setup();
    renderDrawer({ ...EMPTY_BEER_QUERY, minRating: 4.5 });
    const dialog = await openDrawer(user);
    expect(within(getRatingGroup(dialog)).getByRole("radio", { name: "4,5+" })).toBeChecked();

    await user.click(within(getRatingGroup(dialog)).getByRole("radio", { name: "Toutes" }));
    await user.click(getApplyButton(/^Voir \d+ bières$/));

    expect(onApply).toHaveBeenCalledWith({ ...EMPTY_BEER_QUERY, minRating: null });
  });

  it("AC2 sorts by rating once chosen and applied", async () => {
    const user = userEvent.setup();
    renderDrawer();
    const dialog = await openDrawer(user);

    await user.click(within(dialog).getByRole("button", { name: /Trier par/ }));
    await user.click(screen.getByRole("option", { name: "Mieux notées" }));
    expect(lastPreviewCall()[0]).toEqual({ ...EMPTY_BEER_QUERY, sort: BeerSortEnum.RATING });
    await user.click(getApplyButton(/^Voir \d+ bières$/));

    expect(onApply).toHaveBeenCalledWith({ ...EMPTY_BEER_QUERY, sort: BeerSortEnum.RATING });
  });

  it("AC4 puts All back on Réinitialiser", async () => {
    const user = userEvent.setup();
    renderDrawer({ ...EMPTY_BEER_QUERY, minRating: 3 });
    const dialog = await openDrawer(user);
    expect(within(getRatingGroup(dialog)).getByRole("radio", { name: "3+" })).toBeChecked();

    await user.click(getApplyButton("Réinitialiser"));

    expect(within(getRatingGroup(dialog)).getByRole("radio", { name: "Toutes" })).toBeChecked();
    expect(within(getRatingGroup(dialog)).getByRole("radio", { name: "3+" })).not.toBeChecked();
    expect(lastPreviewCall()[0]).toEqual(EMPTY_BEER_QUERY);
  });

  it("writes the minimum rating section in English", async () => {
    const user = userEvent.setup();
    await i18n.changeLanguage("en");
    renderDrawer();
    await user.click(screen.getByRole("button", { name: "Filters" }));
    const dialog = await screen.findByRole("dialog", { name: "Filters" });

    const group = within(dialog).getByRole("radiogroup", { name: "Minimum rating" });
    ["All", "3+", "3.5+", "4+", "4.5+"].forEach((name) => expect(within(group).getByRole("radio", { name })).toBeInTheDocument());
    await user.click(within(dialog).getByRole("button", { name: /Sort by/ }));
    expect(screen.getByRole("option", { name: "Top rated" })).toBeInTheDocument();
  });
});
