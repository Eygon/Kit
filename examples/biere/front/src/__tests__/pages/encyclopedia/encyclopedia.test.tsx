import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLocation, useNavigate } from "react-router";
import { afterEach } from "vitest";
import i18n from "@/i18n/i18n";
import { EncyclopediaPage } from "@/pages/encyclopedia/encyclopedia";
import { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";
import { BeerFormatEnum } from "@/types/enums/beer/beerFormatEnum";
import { BeerSortEnum } from "@/types/enums/beer/beerSortEnum";
import { BeerStatusEnum } from "@/types/enums/beer/beerStatusEnum";
import { EMPTY_BEER_QUERY, isEmptyBeerQuery } from "@/types/mappers/beer/beerQueryMapper";
import type { Beer } from "@/types/models/beer/beer";
import type { BeerQuery } from "@/types/models/beer/beerQuery";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";

const mockCatalog = vi.hoisted(() => ({ useBeerCatalogQuery: vi.fn() }));

vi.mock("@/pages/encyclopedia/hooks/useBeerCatalogQuery", () => mockCatalog);

const mockDex = vi.hoisted(() => ({ useDexQuery: vi.fn() }));

vi.mock("@/hooks/dex/useDexQuery", () => mockDex);

const mockPreview = vi.hoisted(() => ({
  useBeerPreviewQuery: vi.fn<(query: BeerQuery) => Record<string, unknown>>(() => ({
    total: null,
    facets: null,
    isError: false,
    isFetching: false,
  })),
}));

vi.mock("@/pages/encyclopedia/hooks/useBeerPreviewQuery", () => mockPreview);

const SKELETON_CARD_COUNT = 8;

const buildBeer = (id: number, overrides: Partial<Beer> = {}): Beer => ({
  id,
  name: `Beer ${id}`,
  breweryName: `Brewery ${id}`,
  country: "BE",
  styleId: 1,
  styleName: "Tripel",
  family: null,
  abv: 7,
  aromas: [],
  formats: [],
  description: "",
  drunk: false,
  checkinCount: 0,
  inWishlist: false,
  bitternessLevel: null,
  colorLevel: null,
  styleColorRange: null,
  averageRating: null,
  reviewCount: 0,
  ratingDistribution: [],
  criteria: [],
  ...overrides,
});

const buildBeers = (count: number) => Array.from({ length: count }, (_, index) => buildBeer(index + 1));

const fetchNextPage = vi.fn();
const refetch = vi.fn();
const refetchDex = vi.fn();

const buildDex = (discovered: number, total: number) => ({ discovered, total, families: [], beers: [] });

const stubDex = (overrides: Record<string, unknown> = {}) => {
  mockDex.useDexQuery.mockReturnValue({
    dex: buildDex(42, 120),
    isPending: false,
    isError: false,
    refetch: refetchDex,
    ...overrides,
  });
};

beforeEach(() => {
  refetchDex.mockResolvedValue(undefined);
  stubDex();
});

const stubCatalog = (overrides: Record<string, unknown> = {}) => {
  mockCatalog.useBeerCatalogQuery.mockReturnValue({
    beers: buildBeers(20),
    total: 120,
    facets: null,
    isPending: false,
    isError: false,
    refetch,
    fetchNextPage,
    hasNextPage: true,
    isFetchingNextPage: false,
    ...overrides,
  });
};

describe("EncyclopediaPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchNextPage.mockResolvedValue(undefined);
    refetch.mockResolvedValue(undefined);
    stubCatalog();
  });

  afterEach(async () => {
    await i18n.changeLanguage("fr");
  });

  it("loads the unfiltered catalog", () => {
    renderWithProviders(<EncyclopediaPage />);

    expect(mockCatalog.useBeerCatalogQuery).toHaveBeenCalledWith(EMPTY_BEER_QUERY);
  });

  it("shows the title and one card per loaded beer, without a beer count under the title", () => {
    renderWithProviders(<EncyclopediaPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Encyclopédie" })).toBeInTheDocument();
    expect(screen.queryByText("120 bières")).not.toBeInTheDocument();
    expect(screen.queryByText(/^\d+ bières?$/)).not.toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(20);
  });

  it("asks the catalog only for the current query, never for the whole catalog on the side", () => {
    renderWithProviders(<EncyclopediaPage />);

    expect(mockCatalog.useBeerCatalogQuery).toHaveBeenCalled();
    mockCatalog.useBeerCatalogQuery.mock.calls.forEach(([query]) => expect(query).toEqual(EMPTY_BEER_QUERY));
    expect(mockCatalog.useBeerCatalogQuery).toHaveBeenCalledTimes(1);
  });

  it("writes the degree with a decimal comma and the country in full in French", () => {
    stubCatalog({ beers: [buildBeer(1, { abv: 11.3 }), buildBeer(2, { abv: 7, country: "DE" })], total: 2 });
    renderWithProviders(<EncyclopediaPage />);

    expect(screen.getByText(/^11,3\s%$/)).toBeInTheDocument();
    expect(screen.getByText(/^7\s%$/)).toBeInTheDocument();
    expect(screen.getByText("Belgique")).toBeInTheDocument();
    expect(screen.getByText("Allemagne")).toBeInTheDocument();
  });

  it("writes the country in English when the language is English", async () => {
    await i18n.changeLanguage("en");
    stubCatalog({ beers: [buildBeer(1)], total: 1 });
    renderWithProviders(<EncyclopediaPage />);

    expect(screen.getByText("Belgium")).toBeInTheDocument();
    expect(screen.queryByText("1 beer")).not.toBeInTheDocument();
  });

  it("AC1 shows 42 / 120 discovered under the title with a ring a screen reader reads as 42 out of 120", () => {
    renderWithProviders(<EncyclopediaPage />);

    expect(screen.getByText("42 / 120 découvertes")).toBeInTheDocument();
    const ring = screen.getByRole("progressbar", { name: "Progression du Pokédex" });
    expect(ring).toHaveAttribute("aria-valuenow", "42");
    expect(ring).toHaveAttribute("aria-valuemax", "120");
    expect(ring.getAttribute("aria-valuetext")).toMatch(/35/);
    const title = screen.getByRole("heading", { level: 1, name: "Encyclopédie" });
    expect(title.compareDocumentPosition(ring) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("AC1 reads the total of the progress, neither the catalog total nor a fixed one", () => {
    stubDex({ dex: buildDex(42, 130) });
    stubCatalog({ total: 500 });
    renderWithProviders(<EncyclopediaPage />);

    expect(screen.getByText("42 / 130 découvertes")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Progression du Pokédex" })).toHaveAttribute("aria-valuemax", "130");
  });

  it("AC2 replaces the ring with a skeleton while the progress loads and keeps the grid usable", () => {
    stubDex({ dex: null, isPending: true });
    const { container } = renderWithProviders(<EncyclopediaPage />);

    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.queryByText(/découvertes/)).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(container.querySelectorAll(".skeleton").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByRole("link")).toHaveLength(20);
    expect(screen.getByRole("searchbox", { name: "Rechercher une bière ou une brasserie" })).toBeEnabled();
  });

  it("AC3 shows an unavailable progress alert whose retry reads the progress again and leaves the grid alone", async () => {
    const user = userEvent.setup();
    stubDex({ dex: null, isError: true });
    renderWithProviders(<EncyclopediaPage />);

    const alert = screen.getByRole("alert");
    expect(within(alert).getByText("Progression indisponible.")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(20);
    await user.click(within(alert).getByRole("button", { name: "Réessayer" }));

    expect(refetchDex).toHaveBeenCalledTimes(1);
    expect(refetch).not.toHaveBeenCalled();
    expect(fetchNextPage).not.toHaveBeenCalled();
    expect(screen.getAllByRole("link")).toHaveLength(20);
  });

  it("AC3 keeps the progress alert apart from the catalog alert when both fail", async () => {
    const user = userEvent.setup();
    stubDex({ dex: null, isError: true });
    stubCatalog({ beers: [], total: 0, isError: true, hasNextPage: false });
    renderWithProviders(<EncyclopediaPage />);

    const alerts = screen.getAllByRole("alert");
    expect(alerts).toHaveLength(2);
    await user.click(within(screen.getByText("Progression indisponible.").closest("[role='alert']") as HTMLElement).getByRole("button", { name: "Réessayer" }));

    expect(refetchDex).toHaveBeenCalledTimes(1);
    expect(refetch).not.toHaveBeenCalled();
  });

  it("treats a progress that answered nothing as unavailable", () => {
    stubDex({ dex: null });
    renderWithProviders(<EncyclopediaPage />);

    expect(within(screen.getByRole("alert")).getByText("Progression indisponible.")).toBeInTheDocument();
  });

  it("AC4 shows 0 / 120 discovered and an empty ring", () => {
    stubDex({ dex: buildDex(0, 120) });
    renderWithProviders(<EncyclopediaPage />);

    expect(screen.getByText("0 / 120 découvertes")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Progression du Pokédex" })).toHaveAttribute("aria-valuenow", "0");
  });

  it("AC5 shows 42 / 120 discovered in English", async () => {
    await i18n.changeLanguage("en");
    renderWithProviders(<EncyclopediaPage />);

    expect(screen.getByText("42 / 120 discovered")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Pokédex progress" })).toHaveAttribute("aria-valuenow", "42");
  });

  it("links every card to its beer sheet", () => {
    stubCatalog({ beers: [buildBeer(7), buildBeer(31)], total: 2 });
    renderWithProviders(<EncyclopediaPage />);

    expect(screen.getByRole("link", { name: /Beer 7/ })).toHaveAttribute("href", "/bieres/7");
    expect(screen.getByRole("link", { name: /Beer 31/ })).toHaveAttribute("href", "/bieres/31");
  });

  it("lays the cards out on two columns on a phone, then three and four", () => {
    renderWithProviders(<EncyclopediaPage />);

    const grid = screen.getByRole("list");
    expect(grid.className).toContain("grid-cols-2");
    expect(grid.className).toContain("md:grid-cols-3");
    expect(grid.className).toContain("lg:grid-cols-4");
    expect(grid.className).toContain("gap-3");
    expect(within(grid).getAllByRole("listitem")).toHaveLength(20);
  });

  it("asks for the next page when pressing the show more button", async () => {
    const user = userEvent.setup();
    renderWithProviders(<EncyclopediaPage />);

    await user.click(screen.getByRole("button", { name: "Voir plus" }));

    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it("styles the show more button as a large secondary button", () => {
    renderWithProviders(<EncyclopediaPage />);

    const button = screen.getByRole("button", { name: "Voir plus" });
    expect(button.className).toContain("button--secondary");
    expect(button.className).toContain("button--lg");
  });

  it("lets the show more button ask for a further page once the previous one is in", async () => {
    const user = userEvent.setup();
    renderWithProviders(<EncyclopediaPage />);

    await user.click(screen.getByRole("button", { name: "Voir plus" }));
    await user.click(screen.getByRole("button", { name: "Voir plus" }));

    expect(fetchNextPage).toHaveBeenCalledTimes(2);
  });

  it("shows forty cards once the second page is in", () => {
    stubCatalog({ beers: buildBeers(40) });
    renderWithProviders(<EncyclopediaPage />);

    expect(screen.getAllByRole("link")).toHaveLength(40);
    expect(screen.getByRole("button", { name: "Voir plus" })).toBeInTheDocument();
  });

  it("hides the show more button once everything is loaded", () => {
    stubCatalog({ beers: buildBeers(120), hasNextPage: false });
    renderWithProviders(<EncyclopediaPage />);

    expect(screen.getAllByRole("link")).toHaveLength(120);
    expect(screen.queryByRole("button", { name: "Voir plus" })).not.toBeInTheDocument();
  });

  it("keeps the show more button busy and not pressable while the next page loads", async () => {
    const user = userEvent.setup();
    stubCatalog({ isFetchingNextPage: true });
    renderWithProviders(<EncyclopediaPage />);

    const button = screen.getByRole("button", { name: "Voir plus" });
    expect(button).toHaveAttribute("data-pending", "true");
    await user.click(button);

    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it("sends a single request when the show more button is pressed twice in the same tick", async () => {
    fetchNextPage.mockReturnValue(new Promise(() => undefined));
    renderWithProviders(<EncyclopediaPage />);
    const button = screen.getByRole("button", { name: "Voir plus" });

    await act(async () => {
      button.click();
      button.click();
    });

    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it("fills the grid with eight card skeletons while the request is pending", () => {
    stubCatalog({ beers: [], total: 0, isPending: true, hasNextPage: false });
    renderWithProviders(<EncyclopediaPage />);

    const grid = screen.getByRole("list");
    expect(grid).toHaveAttribute("aria-busy", "true");
    expect(within(grid).getAllByRole("listitem")).toHaveLength(SKELETON_CARD_COUNT);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("tells that no beer matches with the searching mascot panel", () => {
    stubCatalog({ beers: [], total: 0, hasNextPage: false });
    const { container } = renderWithProviders(<EncyclopediaPage />);

    expect(container.querySelector('[data-mood="searching"]')).not.toBeNull();
    expect(screen.getByRole("heading", { level: 2, name: "Aucune bière ne correspond" })).toBeInTheDocument();
    expect(screen.getByText("Essayez une autre recherche ou retirez des filtres.")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Voir plus" })).not.toBeInTheDocument();
  });

  it("shows an error alert and retries the request when there is no data", async () => {
    const user = userEvent.setup();
    stubCatalog({ beers: [], total: 0, isError: true, hasNextPage: false });
    renderWithProviders(<EncyclopediaPage />);

    const alert = screen.getByRole("alert");
    expect(within(alert).getByText("Impossible de charger les bières.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
    await user.click(within(alert).getByRole("button", { name: "Réessayer" }));

    expect(refetch).toHaveBeenCalledTimes(1);
    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it("keeps the cards and retries the next page when it fails", async () => {
    const user = userEvent.setup();
    stubCatalog({ isError: true });
    renderWithProviders(<EncyclopediaPage />);

    expect(screen.getAllByRole("link")).toHaveLength(20);
    const alert = screen.getByRole("alert");
    expect(within(alert).getByText("Impossible de charger les bières.")).toBeInTheDocument();
    await user.click(within(alert).getByRole("button", { name: "Réessayer" }));

    expect(fetchNextPage).toHaveBeenCalledTimes(1);
    expect(refetch).not.toHaveBeenCalled();
  });

  it("retries the next page after a show more press already went through", async () => {
    const user = userEvent.setup();
    stubCatalog({ isError: true });
    renderWithProviders(<EncyclopediaPage />);

    await user.click(screen.getByRole("button", { name: "Voir plus" }));
    await user.click(within(screen.getByRole("alert")).getByRole("button", { name: "Réessayer" }));

    expect(fetchNextPage).toHaveBeenCalledTimes(2);
  });

  it("shows no alert when the request succeeded", () => {
    renderWithProviders(<EncyclopediaPage />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

const PECHERESSE = buildBeer(900, { name: "Lindemans Pêcheresse", breweryName: "Lindemans" });
const TRAPPISTS = Array.from({ length: 11 }, (_, index) => buildBeer(100 + index, { name: `Trappist ${index + 1}` }));
const BELGIANS = Array.from({ length: 3 }, (_, index) => buildBeer(300 + index, { name: `Belgian ${index + 1}` }));
const LAGERS = Array.from({ length: 5 }, (_, index) => buildBeer(200 + index, { name: `Lager ${index + 1}` }));
const FACETS = {
  families: [
    { value: BeerFamilyEnum.TRAPPIST, count: 11 },
    { value: BeerFamilyEnum.LAGER, count: 5 },
  ],
  countries: [],
  formats: [],
};

const PECHERESSE_FACETS = { ...FACETS, families: [{ value: BeerFamilyEnum.FRUIT, count: 1 }] };

const facetsFor = (query: BeerQuery) => (query.search === "pecheresse" ? PECHERESSE_FACETS : FACETS);

const DRUNK_BEERS = Array.from({ length: 4 }, (_, index) => buildBeer(500 + index, { name: `Drunk ${index + 1}`, drunk: true }));

const catalogFor = (query: BeerQuery) => {
  if (query.status === BeerStatusEnum.DRUNK) return { beers: DRUNK_BEERS, total: DRUNK_BEERS.length };
  if (isEmptyBeerQuery(query)) return { beers: buildBeers(20), total: 120 };
  if (query.search === "pecheresse") return { beers: [PECHERESSE], total: 1 };
  if (query.family === BeerFamilyEnum.TRAPPIST) return { beers: TRAPPISTS, total: TRAPPISTS.length };
  if (query.family === BeerFamilyEnum.LAGER) return { beers: LAGERS, total: LAGERS.length };
  if (query.countries.includes("BE")) return { beers: BELGIANS, total: BELGIANS.length };
  return { beers: [], total: 0 };
};

const stubCatalogByQuery = () => {
  mockCatalog.useBeerCatalogQuery.mockImplementation((query: BeerQuery) => ({
    ...catalogFor(query),
    facets: facetsFor(query),
    isPending: false,
    isError: false,
    refetch,
    fetchNextPage,
    hasNextPage: false,
    isFetchingNextPage: false,
  }));
};

const LocationProbe = () => {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output aria-label="location">{location.search}</output>
      <button type="button" onClick={() => void navigate(-1)}>
        history back
      </button>
    </>
  );
};

const renderFilteredPage = (initialPath = "/") =>
  renderWithProviders(
    <>
      <EncyclopediaPage />
      <LocationProbe />
    </>,
    { initialPath },
  );

const getLocationSearch = () => screen.getByLabelText("location").textContent;
const getSearchbox = () => screen.getByRole("searchbox", { name: "Rechercher une bière ou une brasserie" });
const getChip = (name: string) => screen.getByRole("row", { name });
const gridItems = () => within(screen.getByRole("list")).getAllByRole("listitem");

describe("EncyclopediaPage search and family filters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchNextPage.mockResolvedValue(undefined);
    refetch.mockResolvedValue(undefined);
    stubCatalogByQuery();
  });

  afterEach(async () => {
    vi.useRealTimers();
    await i18n.changeLanguage("fr");
  });

  it("AC1 filters the grid after a 300 ms pause, replaces the URL entry and counts the result under the unchanged header", async () => {
    vi.useFakeTimers();
    renderFilteredPage();

    fireEvent.change(getSearchbox(), { target: { value: "pecheresse" } });
    act(() => vi.advanceTimersByTime(299));
    expect(getLocationSearch()).toBe("");
    expect(gridItems()).toHaveLength(20);

    act(() => vi.advanceTimersByTime(1));

    expect(getLocationSearch()).toBe("?q=pecheresse");
    expect(gridItems()).toHaveLength(1);
    expect(within(gridItems()[0]).getByText("Lindemans Pêcheresse")).toBeInTheDocument();
    const resultLine = screen.getByText("1 résultat");
    expect(resultLine).toHaveAttribute("aria-live", "polite");
    expect(screen.getByText("42 / 120 découvertes")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "history back" }));
    expect(getLocationSearch()).toBe("?q=pecheresse");
  });

  it("shows no result line while no filter is active", () => {
    renderFilteredPage();

    expect(screen.queryByText(/résultat/)).not.toBeInTheDocument();
    expect(screen.getByText("42 / 120 découvertes")).toBeInTheDocument();
  });

  it("writes the result line in English with the singular and the plural", async () => {
    await i18n.changeLanguage("en");
    renderFilteredPage("/?q=pecheresse");
    expect(screen.getByText("1 result")).toBeInTheDocument();
  });

  it("writes the plural result line in English", async () => {
    await i18n.changeLanguage("en");
    renderFilteredPage("/?family=trappist");

    expect(screen.getByText("11 results")).toBeInTheDocument();
  });

  it("builds the chips from the facets of the current query, not of the whole catalog", () => {
    vi.useFakeTimers();
    renderFilteredPage();
    expect(screen.getAllByRole("row").map((chip) => chip.textContent)).toEqual(["Toutes", "Trappiste (11)", "Lager (5)"]);

    fireEvent.change(getSearchbox(), { target: { value: "pecheresse" } });
    act(() => vi.advanceTimersByTime(300));

    expect(screen.getAllByRole("row").map((chip) => chip.textContent)).toEqual(["Toutes", "Fruitée (1)"]);
  });

  it("AC2 lists All and one chip per family with its count, filters on a chip and clears on All", async () => {
    const user = userEvent.setup();
    renderFilteredPage();

    expect(screen.getAllByRole("row").map((chip) => chip.textContent)).toEqual(["Toutes", "Trappiste (11)", "Lager (5)"]);
    expect(getChip("Toutes")).toHaveAttribute("aria-selected", "true");

    await user.click(getChip("Trappiste (11)"));

    expect(getLocationSearch()).toBe("?family=trappist");
    expect(getChip("Trappiste (11)")).toHaveAttribute("aria-selected", "true");
    expect(gridItems()).toHaveLength(11);
    expect(screen.getByText("11 résultats")).toBeInTheDocument();

    await user.click(getChip("Toutes"));

    expect(getLocationSearch()).toBe("");
    expect(getChip("Toutes")).toHaveAttribute("aria-selected", "true");
    expect(gridItems()).toHaveLength(20);
  });

  it("AC3 reflects a shared URL in the grid query, the search bar and the chips", () => {
    renderFilteredPage("/?q=ipa&family=trappist&style=3&country=BE&format=can&abvMin=4&abvMax=9&sort=abv");

    expect(mockCatalog.useBeerCatalogQuery).toHaveBeenCalledWith({
      search: "ipa",
      family: BeerFamilyEnum.TRAPPIST,
      styleIds: [3],
      countries: ["BE"],
      formats: [BeerFormatEnum.CAN],
      abvMin: 4,
      abvMax: 9,
      status: null,
      minRating: null,
      sort: BeerSortEnum.ABV,
    });
    expect(mockCatalog.useBeerCatalogQuery).not.toHaveBeenCalledWith(EMPTY_BEER_QUERY);
    expect(getSearchbox()).toHaveValue("ipa");
    expect(getChip("Trappiste (11)")).toHaveAttribute("aria-selected", "true");
    expect(getChip("Toutes")).toHaveAttribute("aria-selected", "false");
    expect(gridItems()).toHaveLength(11);
  });

  it("AC4 applies the first family again on browser back after choosing a second one", async () => {
    const user = userEvent.setup();
    renderFilteredPage();

    await user.click(getChip("Trappiste (11)"));
    await user.click(getChip("Lager (5)"));
    expect(getLocationSearch()).toBe("?family=lager");
    expect(gridItems()).toHaveLength(5);

    await user.click(screen.getByRole("button", { name: "history back" }));

    expect(getLocationSearch()).toBe("?family=trappist");
    expect(getChip("Trappiste (11)")).toHaveAttribute("aria-selected", "true");
    expect(gridItems()).toHaveLength(11);
  });

  it("puts the search back in the bar on browser back", async () => {
    const user = userEvent.setup();
    renderFilteredPage("/?q=orval");
    await user.click(getChip("Trappiste (11)"));

    await user.click(screen.getByRole("button", { name: "history back" }));

    expect(getLocationSearch()).toBe("?q=orval");
    expect(getSearchbox()).toHaveValue("orval");
  });

  it("replaces a search typed in the bar by the previous one on browser back", () => {
    vi.useFakeTimers();
    renderFilteredPage("/?q=orval");
    fireEvent.click(getChip("Trappiste (11)"));
    fireEvent.change(getSearchbox(), { target: { value: "pec" } });
    act(() => vi.advanceTimersByTime(300));
    expect(getLocationSearch()).toBe("?q=pec&family=trappist");

    fireEvent.click(screen.getByRole("button", { name: "history back" }));

    expect(getLocationSearch()).toBe("?q=orval");
    expect(getSearchbox()).toHaveValue("orval");
  });

  it("AC5 ignores an invalid value of the URL and applies the rest", () => {
    renderFilteredPage("/?family=unknown&abvMin=abc&q=ipa&sort=abv");

    expect(mockCatalog.useBeerCatalogQuery).toHaveBeenCalledWith({
      ...EMPTY_BEER_QUERY,
      search: "ipa",
      sort: BeerSortEnum.ABV,
    });
    expect(getSearchbox()).toHaveValue("ipa");
    expect(getChip("Toutes")).toHaveAttribute("aria-selected", "true");
  });

  it("AC6 keeps the chip of a family without any beer visible and selected, in a horizontally scrolling row", () => {
    renderFilteredPage("/?family=stout&q=zzz");

    expect(getChip("Stout (0)")).toHaveAttribute("aria-selected", "true");
    expect(getChip("Toutes")).toHaveAttribute("aria-selected", "false");
    const chipsRow = screen.getByRole("grid", { name: "Familles" });
    expect(chipsRow.className).toContain("overflow-x-auto");
    expect(chipsRow.className).toContain("max-w-full");
    expect(screen.getByRole("heading", { level: 2, name: "Aucune bière ne correspond" })).toBeInTheDocument();
  });
});

const DRAWER_FACETS = {
  families: [],
  countries: [
    { value: "BE", count: 49 },
    { value: "DE", count: 12 },
  ],
  formats: [
    { value: BeerFormatEnum.BOTTLE, count: 30 },
    { value: BeerFormatEnum.CAN, count: 12 },
  ],
};

const stubPreviewByQuery = () => {
  mockPreview.useBeerPreviewQuery.mockImplementation((query: BeerQuery) => ({
    total: query.countries.length > 0 ? 49 : 120,
    facets: DRAWER_FACETS,
    isError: false,
    isFetching: false,
  }));
};

const getFiltersButton = () => screen.getByRole("button", { name: "Filtres" });

const openFilters = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(getFiltersButton());
  return screen.findByRole("dialog", { name: "Filtres" });
};

describe("EncyclopediaPage filters drawer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchNextPage.mockResolvedValue(undefined);
    refetch.mockResolvedValue(undefined);
    stubCatalogByQuery();
    stubPreviewByQuery();
  });

  it("puts a Filters button next to the search bar and loads no preview while the drawer is closed", () => {
    renderFilteredPage();

    expect(getFiltersButton()).toBeInTheDocument();
    expect(getSearchbox()).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mockPreview.useBeerPreviewQuery).toHaveBeenLastCalledWith(EMPTY_BEER_QUERY, false);
  });

  it("hides the Filters button while the catalog is loading", () => {
    mockCatalog.useBeerCatalogQuery.mockReturnValue({
      beers: [],
      total: 0,
      facets: null,
      isPending: true,
      isError: false,
      refetch,
      fetchNextPage,
      hasNextPage: false,
      isFetchingNextPage: false,
    });
    renderFilteredPage();

    expect(screen.queryByRole("button", { name: "Filtres" })).not.toBeInTheDocument();
  });

  it("AC1 leaves the grid and the URL untouched while the draft changes", async () => {
    const user = userEvent.setup();
    renderFilteredPage();
    await openFilters(user);

    await user.click(screen.getByRole("checkbox", { name: "Belgique (49)" }));

    expect(screen.getByRole("button", { name: "Voir 49 bières" })).toBeInTheDocument();
    expect(getLocationSearch()).toBe("");
    expect(mockCatalog.useBeerCatalogQuery).not.toHaveBeenCalledWith(expect.objectContaining({ countries: ["BE"] }));
  });

  it("AC2 applies the draft to the URL and the grid in one history entry, and closes the drawer", async () => {
    const user = userEvent.setup();
    renderFilteredPage("/?q=orval");
    await openFilters(user);
    await user.click(screen.getByRole("checkbox", { name: "Belgique (49)" }));

    await user.click(screen.getByRole("button", { name: "Voir 49 bières" }));

    expect(getLocationSearch()).toBe("?q=orval&country=BE");
    expect(gridItems()).toHaveLength(3);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mockCatalog.useBeerCatalogQuery).toHaveBeenCalledWith({ ...EMPTY_BEER_QUERY, search: "orval", countries: ["BE"] });

    await user.click(screen.getByRole("button", { name: "history back" }));

    expect(getLocationSearch()).toBe("?q=orval");
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    expect(screen.getByRole("heading", { level: 2, name: "Aucune bière ne correspond" })).toBeInTheDocument();
  });

  it("AC3 changes nothing when the drawer is closed without applying", async () => {
    const user = userEvent.setup();
    renderFilteredPage();
    await openFilters(user);
    await user.click(screen.getByRole("checkbox", { name: "Belgique (49)" }));

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    expect(getLocationSearch()).toBe("");
    expect(gridItems()).toHaveLength(20);
    await openFilters(user);
    expect(screen.getByRole("checkbox", { name: "Belgique (49)" })).not.toBeChecked();
  });

  it("AC4 resets the drawer draft, search included, and applies the whole catalog", async () => {
    const user = userEvent.setup();
    renderFilteredPage("/?q=orval&country=BE");
    await openFilters(user);
    expect(screen.getByRole("checkbox", { name: "Belgique (49)" })).toBeChecked();

    await user.click(screen.getByRole("button", { name: "Réinitialiser" }));
    await user.click(screen.getByRole("button", { name: "Voir 120 bières" }));

    expect(getLocationSearch()).toBe("");
    expect(getSearchbox()).toHaveValue("");
    expect(gridItems()).toHaveLength(20);
  });

  it("AC7 sorts by degree once applied", async () => {
    const user = userEvent.setup();
    renderFilteredPage();
    const dialog = await openFilters(user);

    await user.click(within(dialog).getByRole("button", { name: /Trier par/ }));
    await user.click(screen.getByRole("option", { name: "Degré" }));
    await user.click(screen.getByRole("button", { name: /^Voir \d+ bières$/ }));

    expect(getLocationSearch()).toBe("?sort=abv");
    expect(mockCatalog.useBeerCatalogQuery).toHaveBeenCalledWith({ ...EMPTY_BEER_QUERY, sort: BeerSortEnum.ABV });
  });

  it("E8 closes the open drawer on browser back and the grid follows the previous URL", async () => {
    const user = userEvent.setup();
    renderFilteredPage();
    await openFilters(user);
    await user.click(screen.getByRole("checkbox", { name: "Belgique (49)" }));
    await user.click(screen.getByRole("button", { name: "Voir 49 bières" }));
    expect(getLocationSearch()).toBe("?country=BE");
    await openFilters(user);

    fireEvent.click(screen.getByText("history back"));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(getLocationSearch()).toBe("");
    expect(gridItems()).toHaveLength(20);
  });

  it("AC8 counts the drawer filters of the URL on the Filters button", () => {
    renderFilteredPage("/?q=orval&country=BE&format=can&sort=abv");

    expect(screen.getByText("3 filtres actifs")).toBeInTheDocument();
  });
});

const buildDexWith = (beers: { beerId: number; firstCheckinAt: string }[]) => ({
  discovered: beers.length,
  total: 120,
  families: [],
  beers: beers.map((beer) => ({ ...beer, lastCheckinAt: "2027-01-05T12:00:00.000Z" })),
});

describe("EncyclopediaPage tasting stamps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchNextPage.mockResolvedValue(undefined);
    refetch.mockResolvedValue(undefined);
    refetchDex.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await i18n.changeLanguage("fr");
  });

  const cardOf = (name: string) => screen.getByRole("link", { name: new RegExp(name) });

  it("AC1 greys out and labels with ??? the beers not drunk, and stamps the drunk one with its first tasting date", () => {
    stubCatalog({ beers: [buildBeer(1), buildBeer(2, { drunk: true }), buildBeer(3)], total: 3, hasNextPage: false });
    stubDex({ dex: buildDexWith([{ beerId: 2, firstCheckinAt: "2026-10-12T12:00:00.000Z" }]) });
    renderWithProviders(<EncyclopediaPage />);

    expect(within(cardOf("Beer 2")).getByText("Bue le 12/10/2026")).toBeInTheDocument();
    expect(within(cardOf("Beer 1")).getByText("???")).toBeInTheDocument();
    expect(cardOf("Beer 1").className).toContain("opacity-70");
    expect(cardOf("Beer 3").className).toContain("opacity-70");
    expect(cardOf("Beer 2").className).not.toContain("opacity-70");
    expect(screen.getAllByText("???")).toHaveLength(2);
  });

  it("AC2 writes the stamp date in the English format", async () => {
    await i18n.changeLanguage("en");
    stubCatalog({ beers: [buildBeer(2, { drunk: true })], total: 1, hasNextPage: false });
    stubDex({ dex: buildDexWith([{ beerId: 2, firstCheckinAt: "2026-10-12T12:00:00.000Z" }]) });
    renderWithProviders(<EncyclopediaPage />);

    expect(screen.getByText("Tasted on 10/12/26")).toBeInTheDocument();
  });

  it("AC3 says Bue without a date while the progress is loading, then dates the stamp", () => {
    stubCatalog({ beers: [buildBeer(2, { drunk: true })], total: 1, hasNextPage: false });
    stubDex({ dex: null, isPending: true });
    const { rerender } = renderWithProviders(<EncyclopediaPage />);

    expect(within(cardOf("Beer 2")).getByText("Bue")).toBeInTheDocument();
    expect(screen.queryByText(/Bue le/)).not.toBeInTheDocument();

    stubDex({ dex: buildDexWith([{ beerId: 2, firstCheckinAt: "2026-10-12T12:00:00.000Z" }]) });
    rerender(<EncyclopediaPage />);

    expect(screen.getByText("Bue le 12/10/2026")).toBeInTheDocument();
  });

  it("AC3 says Bue without a date when the progress failed or does not list the beer", () => {
    stubCatalog({ beers: [buildBeer(2, { drunk: true }), buildBeer(4, { drunk: true })], total: 2, hasNextPage: false });
    stubDex({ dex: buildDexWith([{ beerId: 4, firstCheckinAt: "2026-03-01T12:00:00.000Z" }]) });
    renderWithProviders(<EncyclopediaPage />);

    expect(within(cardOf("Beer 2")).getByText("Bue")).toBeInTheDocument();
    expect(within(cardOf("Beer 4")).getByText("Bue le 01/03/2026")).toBeInTheDocument();
  });

  it("does not stamp a beer that is not drunk even if the progress lists it", () => {
    stubCatalog({ beers: [buildBeer(5)], total: 1, hasNextPage: false });
    stubDex({ dex: buildDexWith([{ beerId: 5, firstCheckinAt: "2026-10-12T12:00:00.000Z" }]) });
    renderWithProviders(<EncyclopediaPage />);

    expect(within(cardOf("Beer 5")).getByText("???")).toBeInTheDocument();
    expect(screen.queryByText(/Bue/)).not.toBeInTheDocument();
  });
});

describe("EncyclopediaPage status filter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchNextPage.mockResolvedValue(undefined);
    refetch.mockResolvedValue(undefined);
    stubCatalogByQuery();
    stubPreviewByQuery();
  });

  it("AC4 applies Bues to the URL and the grid, adds one to the filters badge and resets to Toutes", async () => {
    const user = userEvent.setup();
    renderFilteredPage();
    expect(screen.queryByText(/filtres? actifs?/)).not.toBeInTheDocument();
    const dialog = await openFilters(user);

    await user.click(within(within(dialog).getByRole("radiogroup", { name: "Statut" })).getByRole("radio", { name: "Bues" }));
    await user.click(screen.getByRole("button", { name: /^Voir \d+ bières$/ }));

    expect(getLocationSearch()).toBe("?status=drunk");
    expect(mockCatalog.useBeerCatalogQuery).toHaveBeenCalledWith({ ...EMPTY_BEER_QUERY, status: BeerStatusEnum.DRUNK });
    expect(gridItems()).toHaveLength(4);
    gridItems().forEach((item) => expect(within(item).getByText("Bue")).toBeInTheDocument());
    expect(screen.getByText("1 filtre actif")).toBeInTheDocument();

    const reopened = await openFilters(user);
    const group = within(reopened).getByRole("radiogroup", { name: "Statut" });
    expect(within(group).getByRole("radio", { name: "Bues" })).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Réinitialiser" }));

    expect(within(group).getByRole("radio", { name: "Toutes" })).toBeChecked();
    await user.click(screen.getByRole("button", { name: /^Voir \d+ bières$/ }));
    expect(getLocationSearch()).toBe("");
    expect(gridItems()).toHaveLength(20);
  });

  it("AC4 opens on the status of a shared URL", async () => {
    const user = userEvent.setup();
    renderFilteredPage("/?status=drunk");
    const dialog = await openFilters(user);

    expect(within(within(dialog).getByRole("radiogroup", { name: "Statut" })).getByRole("radio", { name: "Bues" })).toBeChecked();
    expect(screen.getByText("1 filtre actif")).toBeInTheDocument();
  });

  it("E9 shows the empty grid state for a status that matches no beer", () => {
    renderFilteredPage("/?status=wishlist");

    expect(screen.getByRole("heading", { level: 2, name: "Aucune bière ne correspond" })).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("1 filtre actif")).toBeInTheDocument();
  });

  it("AC5 ignores an unknown status of the URL and shows Toutes", async () => {
    const user = userEvent.setup();
    renderFilteredPage("/?status=bogus");

    expect(mockCatalog.useBeerCatalogQuery).toHaveBeenCalledWith(EMPTY_BEER_QUERY);
    expect(mockCatalog.useBeerCatalogQuery).not.toHaveBeenCalledWith(expect.objectContaining({ status: "bogus" }));
    expect(screen.queryByText(/filtres? actifs?/)).not.toBeInTheDocument();
    expect(screen.queryByText(/résultat/)).not.toBeInTheDocument();
    const dialog = await openFilters(user);
    expect(within(within(dialog).getByRole("radiogroup", { name: "Statut" })).getByRole("radio", { name: "Toutes" })).toBeChecked();
  });
});

describe("EncyclopediaPage rating filter and sort", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchNextPage.mockResolvedValue(undefined);
    refetch.mockResolvedValue(undefined);
    stubCatalogByQuery();
    stubPreviewByQuery();
  });

  it("US11 AC1 applies 4+ to the URL and the grid, and adds one to the filters badge", async () => {
    const user = userEvent.setup();
    renderFilteredPage();
    expect(screen.queryByText(/filtres? actifs?/)).not.toBeInTheDocument();
    const dialog = await openFilters(user);

    await user.click(within(within(dialog).getByRole("radiogroup", { name: "Note minimale" })).getByRole("radio", { name: "4+" }));
    await user.click(screen.getByRole("button", { name: /^Voir \d+ bières$/ }));

    expect(getLocationSearch()).toBe("?minRating=4");
    expect(mockCatalog.useBeerCatalogQuery).toHaveBeenCalledWith({ ...EMPTY_BEER_QUERY, minRating: 4 });
    expect(screen.getByText("1 filtre actif")).toBeInTheDocument();
  });

  it("US11 AC2 and Independent Test put 4+ and Mieux notées in the URL and count two filters", async () => {
    const user = userEvent.setup();
    renderFilteredPage();
    const dialog = await openFilters(user);

    await user.click(within(within(dialog).getByRole("radiogroup", { name: "Note minimale" })).getByRole("radio", { name: "4+" }));
    await user.click(within(dialog).getByRole("button", { name: /Trier par/ }));
    await user.click(screen.getByRole("option", { name: "Mieux notées" }));
    await user.click(screen.getByRole("button", { name: /^Voir \d+ bières$/ }));

    expect(getLocationSearch()).toBe("?minRating=4&sort=rating");
    expect(mockCatalog.useBeerCatalogQuery).toHaveBeenCalledWith({ ...EMPTY_BEER_QUERY, minRating: 4, sort: BeerSortEnum.RATING });
    expect(screen.getByText("2 filtres actifs")).toBeInTheDocument();
  });

  it("US11 AC1 opens on the minimum rating of a shared URL", async () => {
    const user = userEvent.setup();
    renderFilteredPage("/?minRating=4&sort=rating");

    expect(mockCatalog.useBeerCatalogQuery).toHaveBeenCalledWith({ ...EMPTY_BEER_QUERY, minRating: 4, sort: BeerSortEnum.RATING });
    expect(screen.getByText("2 filtres actifs")).toBeInTheDocument();
    const dialog = await openFilters(user);
    expect(within(within(dialog).getByRole("radiogroup", { name: "Note minimale" })).getByRole("radio", { name: "4+" })).toBeChecked();
  });

  it.each(["minRating=7", "minRating=3.3", "minRating=abc"])("US11 AC3 ignores %s of the URL and shows Toutes", async (search) => {
    const user = userEvent.setup();
    renderFilteredPage(`/?${search}`);

    expect(mockCatalog.useBeerCatalogQuery).toHaveBeenCalledWith(EMPTY_BEER_QUERY);
    expect(mockCatalog.useBeerCatalogQuery).not.toHaveBeenCalledWith(expect.objectContaining({ minRating: expect.any(Number) }));
    expect(screen.queryByText(/filtres? actifs?/)).not.toBeInTheDocument();
    const dialog = await openFilters(user);
    expect(within(within(dialog).getByRole("radiogroup", { name: "Note minimale" })).getByRole("radio", { name: "Toutes" })).toBeChecked();
  });
});
