import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WhereToDrinkSection } from "@/pages/beerDetail/components/widgets/whereToDrinkSection/whereToDrinkSection";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import i18n from "@/i18n/i18n";
import { AvailabilityStatusEnum } from "@/types/enums/venue/availabilityStatusEnum";
import { VenueTypeEnum } from "@/types/enums/venue/venueTypeEnum";
import type { BeerVenue } from "@/types/models/venue/beerVenue";

const mockQuery = vi.hoisted(() => ({ useBeerVenuesQuery: vi.fn() }));

vi.mock("@/pages/beerDetail/hooks/useBeerVenuesQuery", () => mockQuery);

const NOW = new Date("2026-10-13T12:00:00.000Z");

const makeVenue = (overrides: Partial<BeerVenue> = {}): BeerVenue => ({
  venueId: 1,
  venueName: "Le Trappiste",
  venueType: VenueTypeEnum.BAR,
  city: "Paris",
  address: "1 rue de la Bière",
  latitude: 48.85,
  longitude: 2.35,
  status: AvailabilityStatusEnum.CONFIRMED,
  lastConfirmedAt: new Date("2026-10-11T12:00:00.000Z"),
  recentVoterCount: 3,
  distanceKm: null,
  ...overrides,
});

const FIVE_VENUES: BeerVenue[] = [
  makeVenue({ venueId: 1, venueName: "Le Trappiste" }),
  makeVenue({
    venueId: 2,
    venueName: "La Cave à Bulles",
    venueType: VenueTypeEnum.SHOP,
    city: "Lyon",
    status: AvailabilityStatusEnum.MAYBE_GONE,
    lastConfirmedAt: new Date("2026-10-13T08:00:00.000Z"),
    recentVoterCount: 1,
  }),
  makeVenue({
    venueId: 3,
    venueName: "Brasserie du Coin",
    venueType: VenueTypeEnum.BREWERY,
    city: "Lille",
    status: AvailabilityStatusEnum.UNKNOWN,
    lastConfirmedAt: null,
    recentVoterCount: 0,
  }),
  makeVenue({ venueId: 4, venueName: "Quatrième lieu", city: "Nantes" }),
  makeVenue({ venueId: 5, venueName: "Cinquième lieu", city: "Brest" }),
];

const refetch = vi.fn();

const stubQuery = (overrides: Record<string, unknown> = {}) => {
  mockQuery.useBeerVenuesQuery.mockReturnValue({
    venues: FIVE_VENUES,
    isPending: false,
    isError: false,
    refetch,
    ...overrides,
  });
};

const renderSection = (beerId = 7) => renderWithProviders(<WhereToDrinkSection beerId={beerId} />);

describe("WhereToDrinkSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    refetch.mockResolvedValue(undefined);
    stubQuery();
  });

  afterEach(async () => {
    vi.useRealTimers();
    await i18n.changeLanguage("fr");
  });

  it("asks for the venues of the beer", () => {
    renderSection(42);

    expect(mockQuery.useBeerVenuesQuery).toHaveBeenCalledWith(42);
  });

  it("lists the first three of five venues with name, type, city, status and detail, in the received order", () => {
    renderSection();

    expect(screen.getByRole("heading", { level: 2, name: "Où en boire" })).toBeInTheDocument();
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items.map((item) => within(item).getByText(/Le Trappiste|La Cave à Bulles|Brasserie du Coin/).textContent)).toEqual([
      "Le Trappiste",
      "La Cave à Bulles",
      "Brasserie du Coin",
    ]);
    expect(screen.queryByText("Quatrième lieu")).not.toBeInTheDocument();
    expect(screen.queryByText("Cinquième lieu")).not.toBeInTheDocument();

    expect(items[0]).toHaveTextContent("Bar");
    expect(items[0]).toHaveTextContent("Paris");
    expect(items[0]).toHaveTextContent("Confirmée");
    expect(items[0]).toHaveTextContent("Confirmée il y a 2 jours par 3 personnes");
    expect(items[1]).toHaveTextContent("Cave");
    expect(items[1]).toHaveTextContent("Lyon");
    expect(items[1]).toHaveTextContent("Peut-être épuisée");
    expect(items[1]).toHaveTextContent("Confirmée aujourd'hui par 1 personne");
    expect(items[2]).toHaveTextContent("Brasserie");
    expect(items[2]).toHaveTextContent("Lille");
    expect(items[2]).toHaveTextContent("Inconnue");
    expect(items[2]).toHaveTextContent("Jamais confirmée");
  });

  it("shows the type and the city of each venue on one line of their own, apart from the venue name", () => {
    renderSection();

    const items = screen.getAllByRole("listitem");
    expect(within(items[0]).getByText("Bar · Paris")).toBeInTheDocument();
    expect(within(items[1]).getByText("Cave · Lyon")).toBeInTheDocument();
    expect(within(items[2]).getByText("Brasserie · Lille")).toBeInTheDocument();
  });

  it("shows the availability badge of each venue on its own, apart from the detail", () => {
    renderSection();

    const items = screen.getAllByRole("listitem");
    expect(within(items[0]).getByText("Confirmée", { exact: true })).toBeInTheDocument();
    expect(within(items[1]).getByText("Peut-être épuisée", { exact: true })).toBeInTheDocument();
    expect(within(items[2]).getByText("Inconnue", { exact: true })).toBeInTheDocument();
  });

  it("lists every venue when the beer has fewer than three", () => {
    stubQuery({ venues: FIVE_VENUES.slice(0, 2) });

    renderSection();

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("omits the type of a venue whose type is unknown and keeps the rest of its row", () => {
    stubQuery({ venues: [makeVenue({ venueType: null, city: "Paris" })] });

    renderSection();

    const item = screen.getByRole("listitem");
    expect(item).toHaveTextContent("Le Trappiste");
    expect(item).toHaveTextContent("Paris");
    expect(item).not.toHaveTextContent(/Bar|Cave|Brasserie/);
  });

  it("wraps a long unbroken venue name inside a shrinkable row", () => {
    const longName = "Brasserie-Artisanale-du-Mont-Blanc-".repeat(4);
    stubQuery({ venues: [makeVenue({ venueName: longName })] });

    renderSection();

    const name = screen.getByText(longName);
    expect(name.className).toContain("break-words");
    expect(name.closest("li")?.className).toContain("min-w-0");
  });

  it("links to the map filtered on the beer when venues are listed", () => {
    renderSection(7);

    const link = screen.getByRole("link", { name: "Voir sur la carte" });
    expect(link).toHaveAttribute("href", "/carte?beer=7");
  });

  it("says no venue is known yet and still links to the map when the beer has none", () => {
    stubQuery({ venues: [] });

    renderSection(7);

    expect(screen.getByText("Pas encore de lieu connu")).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir sur la carte" })).toHaveAttribute("href", "/carte?beer=7");
  });

  it("shows the searching mascot in the empty state and no mascot when venues are listed, loading or failed", () => {
    stubQuery({ venues: [] });
    const empty = renderSection();
    expect(empty.container.querySelector('[data-slot="mascot"]')?.getAttribute("data-mood")).toBe("searching");
    empty.unmount();

    stubQuery();
    const listed = renderSection();
    expect(listed.container.querySelector('[data-slot="mascot"]')).toBeNull();
    listed.unmount();

    stubQuery({ venues: [], isPending: true });
    const loading = renderSection();
    expect(loading.container.querySelector('[data-slot="mascot"]')).toBeNull();
    loading.unmount();

    stubQuery({ venues: [], isError: true });
    const failed = renderSection();
    expect(failed.container.querySelector('[data-slot="mascot"]')).toBeNull();
  });

  it("shows loading blocks and no list, no empty message and no map link while pending", () => {
    stubQuery({ venues: [], isPending: true });

    const { container } = renderSection();

    expect(container.querySelector("[aria-busy='true']")).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Où en boire" })).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
    expect(screen.queryByText("Pas encore de lieu connu")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Voir sur la carte" })).not.toBeInTheDocument();
  });

  it("shows an alert with Réessayer that refetches, and neither the empty message nor the list, on error", async () => {
    stubQuery({ venues: [], isError: true });
    const user = userEvent.setup();

    renderSection();

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Impossible de charger les lieux.");
    expect(screen.queryByText("Pas encore de lieu connu")).not.toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
    await user.click(within(alert).getByRole("button", { name: "Réessayer" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("renders in English", async () => {
    await i18n.changeLanguage("en");
    stubQuery({ venues: [] });

    renderSection();

    expect(screen.getByRole("heading", { name: "Where to drink it" })).toBeInTheDocument();
    expect(screen.getByText("No known place yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See on the map" })).toBeInTheDocument();
  });
});
