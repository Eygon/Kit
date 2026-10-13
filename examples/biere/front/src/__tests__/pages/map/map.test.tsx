import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { useLocation } from "react-router";
import type { ReactNode, Ref } from "react";
import { MapPage } from "@/pages/map/map";
import { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";
import { VenueTypeEnum } from "@/types/enums/venue/venueTypeEnum";
import { EMPTY_VENUE_QUERY } from "@/types/mappers/venue/venueQueryMapper";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";

const mockVenues = vi.hoisted(() => ({ useVenuesQuery: vi.fn() }));
const mockBeer = vi.hoisted(() => ({ useFilteredBeerQuery: vi.fn() }));
const mockGeolocation = vi.hoisted(() => ({ useGeolocation: vi.fn() }));
const mockVenueBeers = vi.hoisted(() => ({ useVenueBeersQuery: vi.fn() }));
const leaflet = vi.hoisted(() => ({
  bounds: { north: 48.9, south: 48.8, east: 2.4, west: 2.3 },
  fakeMap: { on: vi.fn(), off: vi.fn(), getBounds: vi.fn(), flyTo: vi.fn() },
}));

vi.mock("@/pages/map/hooks/useVenuesQuery", () => mockVenues);
vi.mock("@/pages/map/hooks/useFilteredBeerQuery", () => mockBeer);
vi.mock("@/pages/map/hooks/useGeolocation", () => mockGeolocation);
vi.mock("@/pages/map/hooks/useVenueBeersQuery", () => mockVenueBeers);
vi.mock("react-leaflet", () => ({
  MapContainer: ({ children, ref }: { children: ReactNode; ref?: Ref<unknown> }) => {
    useEffect(() => {
      if (typeof ref === "function") ref(leaflet.fakeMap);
    }, [ref]);
    return <div data-testid="map">{children}</div>;
  },
  ZoomControl: () => null,
  TileLayer: ({ eventHandlers }: { eventHandlers?: { tileerror?: () => void } }) => (
    <button type="button" onClick={() => eventHandlers?.tileerror?.()}>
      tile
    </button>
  ),
  CircleMarker: ({ center, children }: { center: number[]; children: ReactNode }) => (
    <div data-testid="user-marker" data-center={center.join(",")}>
      {children}
    </div>
  ),
  Tooltip: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  Marker: ({ title, eventHandlers }: { title: string; eventHandlers?: { click?: () => void } }) => (
    <button type="button" data-testid="marker" onClick={() => eventHandlers?.click?.()}>
      {title}
    </button>
  ),
}));

const LocationProbe = () => <output aria-label="search">{useLocation().search}</output>;

const BOUNDS = { north: 48.9, south: 48.8, east: 2.4, west: 2.3 };

const renderMap = (initialPath = "/carte") =>
  renderWithProviders(
    <>
      <MapPage />
      <LocationProbe />
    </>,
    { initialPath },
  );

const urlSearch = () => screen.getByLabelText("search").textContent;

const refetch = vi.fn();
const locate = vi.fn();

const stubGeolocation = (overrides: Record<string, unknown> = {}) => {
  mockGeolocation.useGeolocation.mockReturnValue({ position: null, status: "idle", locate, ...overrides });
};

const VENUES = [
  { id: 1, name: "Le Trappiste", type: "bar", city: "Paris", address: "12 rue de la Bière", description: "Vingt pressions.", status: "confirmed", latitude: 48.85, longitude: 2.35 },
  { id: 2, name: "La Cave", type: "shop", city: "Lyon", address: "3 quai du Houblon", description: "", status: "gone", latitude: 48.86, longitude: 2.36 },
];

const stubVenues = (overrides: Record<string, unknown> = {}) => {
  mockVenues.useVenuesQuery.mockReturnValue({ venues: VENUES, isPending: false, isError: false, refetch, ...overrides });
};

describe("MapPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    leaflet.bounds = { north: 48.9, south: 48.8, east: 2.4, west: 2.3 };
    leaflet.fakeMap.getBounds.mockImplementation(() => ({
      getNorth: () => leaflet.bounds.north,
      getSouth: () => leaflet.bounds.south,
      getEast: () => leaflet.bounds.east,
      getWest: () => leaflet.bounds.west,
    }));
    stubVenues();
    stubGeolocation();
    mockVenueBeers.useVenueBeersQuery.mockReturnValue({ beers: [], isPending: false, isError: false, refetch });
    mockBeer.useFilteredBeerQuery.mockReturnValue({ data: { id: 7, name: "Orval" }, isPending: false, isError: false });
  });

  it("renders a screen-reader only title, the map and the venue list trigger, without the page header", () => {
    renderWithProviders(<MapPage />);

    const heading = screen.getByRole("heading", { level: 1, name: "Carte" });
    expect(heading).toHaveClass("sr-only");
    expect(screen.queryByText("Bars, caves et brasseries autour de vous.")).not.toBeInTheDocument();
    expect(screen.getByTestId("map")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lieux (2)" })).toBeInTheDocument();
    expect(screen.queryByText("Aucun lieu pour l'instant")).not.toBeInTheDocument();
  });

  it("AC5 lays the map out as a fixed layer above the tab bar with no page scroll", () => {
    renderWithProviders(<MapPage />);

    const layer = screen.getByRole("heading", { level: 1 }).parentElement;
    expect(layer).toHaveClass("fixed", "inset-x-0", "top-0", "z-30");
    expect(layer?.className).toContain("bottom-[calc(5rem+env(safe-area-inset-bottom))]");
  });

  it("AC3 loads the venues for the visible bounds reported by the map", () => {
    renderWithProviders(<MapPage />);

    expect(mockVenues.useVenuesQuery).toHaveBeenLastCalledWith({
      ...EMPTY_VENUE_QUERY,
      bounds: { north: 48.9, south: 48.8, east: 2.4, west: 2.3 },
    });
  });

  it("AC3 accepts a zero-size area where north equals south and keeps every marker", () => {
    leaflet.bounds = { north: 48.85, south: 48.85, east: 2.35, west: 2.35 };

    renderWithProviders(<MapPage />);

    expect(mockVenues.useVenuesQuery).toHaveBeenLastCalledWith({
      ...EMPTY_VENUE_QUERY,
      bounds: { north: 48.85, south: 48.85, east: 2.35, west: 2.35 },
    });
    expect(screen.getAllByTestId("marker")).toHaveLength(2);
  });

  it("AC3 reads the venues again for the new area when the map stops moving", () => {
    renderWithProviders(<MapPage />);
    leaflet.bounds = { north: 49.1, south: 49.0, east: 2.6, west: 2.5 };
    const handler = leaflet.fakeMap.on.mock.calls[0][1] as () => void;

    act(() => handler());

    expect(mockVenues.useVenuesQuery).toHaveBeenLastCalledWith({
      ...EMPTY_VENUE_QUERY,
      bounds: { north: 49.1, south: 49.0, east: 2.6, west: 2.5 },
    });
  });

  it("AC1 puts one named marker per loaded venue", () => {
    renderWithProviders(<MapPage />);

    expect(screen.getAllByTestId("marker")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Le Trappiste, Bar, Confirmée" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "La Cave, Cave, Épuisée" })).toBeInTheDocument();
  });

  it("AC4 shows no banner until a tile fails", () => {
    renderWithProviders(<MapPage />);

    expect(screen.queryByText(/Fond de carte indisponible/)).not.toBeInTheDocument();
  });

  it("AC4 shows a non blocking banner when a tile fails while markers and drawer stay usable", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MapPage />);

    await user.click(screen.getByRole("button", { name: "tile" }));

    expect(screen.getByText("Fond de carte indisponible : les lieux restent utilisables.")).toBeInTheDocument();
    expect(screen.getAllByTestId("marker")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Lieux (2)" }));
    expect(await screen.findByRole("dialog", { name: "Lieux" })).toBeInTheDocument();
  });

  it("lists the loaded venues in the drawer", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MapPage />);

    await user.click(screen.getByRole("button", { name: "Lieux (2)" }));

    const dialog = await screen.findByRole("dialog", { name: "Lieux" });
    const rows = within(dialog).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(within(rows[1]).getByText("La Cave")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Épuisée")).toBeInTheDocument();
  });

  it("shows the loading blocks while the venues load", async () => {
    const user = userEvent.setup();
    stubVenues({ venues: [], isPending: true });
    renderWithProviders(<MapPage />);

    await user.click(screen.getByRole("button", { name: /^Lieux/ }));

    expect((await screen.findAllByTestId("venue-row-skeleton")).length).toBeGreaterThan(0);
  });

  it("AC6 keeps the map without any marker and shows the drawer alert with Réessayer that refetches", async () => {
    const user = userEvent.setup();
    stubVenues({ isError: true });
    renderWithProviders(<MapPage />);

    expect(screen.getByTestId("map")).toBeInTheDocument();
    expect(screen.queryAllByTestId("marker")).toHaveLength(0);
    await user.click(screen.getByRole("button", { name: /^Lieux/ }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Impossible de charger les lieux.");
    await user.click(within(alert).getByRole("button", { name: "Réessayer" }));

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("shows the no-venue mascot panel when the visible area has no venue", async () => {
    const user = userEvent.setup();
    stubVenues({ venues: [] });
    renderWithProviders(<MapPage />);

    await user.click(screen.getByRole("button", { name: "Lieux (0)" }));

    expect(await screen.findByRole("heading", { level: 2, name: "Aucun lieu ici" })).toBeInTheDocument();
    expect(screen.queryAllByTestId("marker")).toHaveLength(0);
  });

  it("shows an Autour de moi button, idle, with no position, no marker and no message", () => {
    renderWithProviders(<MapPage />);

    expect(screen.getByRole("button", { name: /Autour de moi/ })).toBeInTheDocument();
    expect(screen.queryByTestId("user-marker")).not.toBeInTheDocument();
    expect(screen.queryByText(/Position/)).not.toBeInTheDocument();
    expect(mockVenues.useVenuesQuery).toHaveBeenLastCalledWith({
      ...EMPTY_VENUE_QUERY,
      bounds: { north: 48.9, south: 48.8, east: 2.4, west: 2.3 },
      position: null,
    });
  });

  it("AC1 asks the position when the user presses Autour de moi", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MapPage />);

    await user.click(screen.getByRole("button", { name: /Autour de moi/ }));

    expect(locate).toHaveBeenCalledTimes(1);
  });

  it("AC1 centers the map on the user, marks Vous êtes ici, asks the venues around the position and lists them by distance", async () => {
    const user = userEvent.setup();
    stubGeolocation({ position: { latitude: 48.85, longitude: 2.35 }, status: "located" });
    stubVenues({ venues: [{ ...VENUES[1], distanceKm: 0.35 }, { ...VENUES[0], distanceKm: 1.2 }] });
    renderWithProviders(<MapPage />);

    expect(leaflet.fakeMap.flyTo).toHaveBeenCalledWith([48.85, 2.35], 14);
    expect(screen.getByTestId("user-marker")).toHaveTextContent("Vous êtes ici");
    expect(mockVenues.useVenuesQuery).toHaveBeenLastCalledWith({
      ...EMPTY_VENUE_QUERY,
      bounds: { north: 48.9, south: 48.8, east: 2.4, west: 2.3 },
      position: { latitude: 48.85, longitude: 2.35 },
    });
    await user.click(screen.getByRole("button", { name: "Lieux (2)" }));
    const rows = within(await screen.findByRole("dialog", { name: "Lieux" })).getAllByRole("listitem");
    expect(within(rows[0]).getByText("La Cave")).toBeInTheDocument();
    expect((rows[0].textContent ?? "").replace(/\s/g, " ")).toContain("350 m");
    expect(within(rows[1]).getByText("Le Trappiste")).toBeInTheDocument();
    expect((rows[1].textContent ?? "").replace(/\s/g, " ")).toContain("1,2 km");
  });

  it("AC2 explains how to allow the position when it is denied, and keeps the map, markers and button usable", async () => {
    const user = userEvent.setup();
    stubGeolocation({ status: "denied" });
    renderWithProviders(<MapPage />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Position refusée : autorisez la localisation dans les réglages du navigateur.");
    expect(screen.getByTestId("map")).toBeInTheDocument();
    expect(screen.getAllByTestId("marker")).toHaveLength(2);
    expect(screen.queryByTestId("user-marker")).not.toBeInTheDocument();
    expect(leaflet.fakeMap.flyTo).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /Autour de moi/ }));
    expect(locate).toHaveBeenCalledTimes(1);
  });

  it("AC3 says Position indisponible when the position cannot be found", () => {
    stubGeolocation({ status: "unavailable" });
    renderWithProviders(<MapPage />);

    expect(screen.getByRole("alert")).toHaveTextContent("Position indisponible.");
    expect(screen.queryByText(/Position refusée/)).not.toBeInTheDocument();
    expect(screen.getByTestId("map")).toBeInTheDocument();
  });

  it("AC4 puts the button on hold while locating and does not trigger a second request", async () => {
    const user = userEvent.setup();
    stubGeolocation({ status: "locating" });
    renderWithProviders(<MapPage />);

    const button = screen.getByRole("button", { name: /Autour de moi/ });
    expect(button).toHaveAttribute("data-pending", "true");
    await user.click(button);

    expect(locate).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("AC4 leaves the button ready when the position is not being looked up", () => {
    renderWithProviders(<MapPage />);

    expect(screen.getByRole("button", { name: /Autour de moi/ })).not.toHaveAttribute("data-pending", "true");
  });
  it("US12 shows the Filtres button with no badge and the venue query without filter when the address has none", () => {
    renderMap();

    expect(screen.getByRole("button", { name: "Filtres" })).toBeInTheDocument();
    expect(screen.queryByText(/filtres? actifs?/)).not.toBeInTheDocument();
    expect(mockVenues.useVenuesQuery).toHaveBeenLastCalledWith({ ...EMPTY_VENUE_QUERY, bounds: BOUNDS });
  });

  it("US12 AC4 sets the filters of the address into the venue query and the Filtres badge", () => {
    renderMap("/carte?type=shop&family=stout&beer=7&confirmed=1");

    expect(mockVenues.useVenuesQuery).toHaveBeenLastCalledWith({
      ...EMPTY_VENUE_QUERY,
      bounds: BOUNDS,
      types: [VenueTypeEnum.SHOP],
      family: BeerFamilyEnum.STOUT,
      beerId: 7,
      confirmedOnly: true,
    });
    expect(screen.getByText("4 filtres actifs")).toBeInTheDocument();
  });

  it("US12 AC4 ignores an invalid value of the address and keeps the valid ones", () => {
    renderMap("/carte?type=castle&family=wine&beer=abc&confirmed=1&radius=3");

    expect(mockVenues.useVenuesQuery).toHaveBeenLastCalledWith({ ...EMPTY_VENUE_QUERY, bounds: BOUNDS, confirmedOnly: true });
    expect(screen.getByText("1 filtre actif")).toBeInTheDocument();
  });

  it("US12 sends the radius of the address only with a position", () => {
    const position = { latitude: 48.85, longitude: 2.35 };
    stubGeolocation({ position, status: "located" });
    renderMap("/carte?radius=5");

    expect(mockVenues.useVenuesQuery).toHaveBeenLastCalledWith({ ...EMPTY_VENUE_QUERY, bounds: BOUNDS, position, radiusKm: 5 });
  });

  it("US12 does not send the radius of the address when there is no position", () => {
    renderMap("/carte?radius=5");

    expect(mockVenues.useVenuesQuery).toHaveBeenLastCalledWith({ ...EMPTY_VENUE_QUERY, bounds: BOUNDS, radiusKm: null });
  });

  it("US12 does not count the radius of the address in the Filtres badge when there is no position", () => {
    renderMap("/carte?radius=5");

    expect(screen.queryByText(/filtres? actifs?/)).not.toBeInTheDocument();
  });

  it("US12 counts the radius of the address in the Filtres badge when there is a position", () => {
    stubGeolocation({ position: { latitude: 48.85, longitude: 2.35 }, status: "located" });
    renderMap("/carte?radius=5");

    expect(screen.getByText("1 filtre actif")).toBeInTheDocument();
  });

  it("US12 AC1 reads the venues again with the applied filters and writes them into the address", async () => {
    const user = userEvent.setup();
    renderMap();
    await user.click(screen.getByRole("button", { name: "Filtres" }));
    const dialog = await screen.findByRole("dialog", { name: "Filtres" });

    await user.click(within(dialog).getByRole("checkbox", { name: "Cave" }));
    await user.click(within(dialog).getByRole("button", { name: /Famille de bière/ }));
    await user.click(screen.getByRole("option", { name: "Stout" }));
    await user.click(within(dialog).getByRole("switch", { name: "Disponibilité confirmée seulement" }));
    await user.click(within(dialog).getByRole("button", { name: "Appliquer" }));

    expect(mockVenues.useVenuesQuery).toHaveBeenLastCalledWith({
      ...EMPTY_VENUE_QUERY,
      bounds: BOUNDS,
      types: [VenueTypeEnum.SHOP],
      family: BeerFamilyEnum.STOUT,
      confirmedOnly: true,
    });
    expect(urlSearch()).toBe("?type=shop&family=stout&confirmed=1");
    expect(screen.getByText("3 filtres actifs")).toBeInTheDocument();
  });

  it("US12 AC3 removes every filter from the query and the address with Réinitialiser", async () => {
    const user = userEvent.setup();
    renderMap("/carte?type=shop&family=stout&beer=7&confirmed=1");
    await user.click(screen.getByRole("button", { name: /^Filtres/ }));
    const dialog = await screen.findByRole("dialog", { name: "Filtres" });

    await user.click(within(dialog).getByRole("button", { name: "Réinitialiser" }));
    await user.click(within(dialog).getByRole("button", { name: "Appliquer" }));

    expect(mockVenues.useVenuesQuery).toHaveBeenLastCalledWith({ ...EMPTY_VENUE_QUERY, bounds: BOUNDS });
    expect(urlSearch()).toBe("");
    expect(screen.queryByText(/filtres? actifs?/)).not.toBeInTheDocument();
  });

  it("US12 AC2 disables the radius without a position and enables it once the map has one", async () => {
    const user = userEvent.setup();
    const { unmount } = renderMap();
    await user.click(screen.getByRole("button", { name: "Filtres" }));
    expect(within(await screen.findByRole("dialog", { name: "Filtres" })).getByRole("button", { name: /Rayon/ })).toBeDisabled();
    unmount();

    stubGeolocation({ position: { latitude: 48.85, longitude: 2.35 }, status: "located" });
    renderMap();
    await user.click(screen.getByRole("button", { name: "Filtres" }));
    expect(within(await screen.findByRole("dialog", { name: "Filtres" })).getByRole("button", { name: /Rayon/ })).toBeEnabled();
  });

  it("US13 shows no beer chip when the address has no beer", () => {
    renderMap("/carte?type=shop");

    expect(screen.queryByRole("button", { name: "Retirer le filtre bière" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Où boire/)).not.toBeInTheDocument();
  });

  it("US13 AC1 shows the chip Où boire : Orval and reads the venues with the beer filter", () => {
    renderMap("/carte?beer=7");

    expect(screen.getByText("Où boire : Orval")).toBeInTheDocument();
    expect(mockBeer.useFilteredBeerQuery).toHaveBeenCalledWith(7);
    expect(mockVenues.useVenuesQuery).toHaveBeenLastCalledWith({ ...EMPTY_VENUE_QUERY, bounds: BOUNDS, beerId: 7 });
    expect(screen.getByText("1 filtre actif")).toBeInTheDocument();
  });

  it("US13 AC2 removes only the beer from the address and the venue query when the chip is removed", async () => {
    const user = userEvent.setup();
    renderMap("/carte?type=shop&beer=7");

    await user.click(screen.getByRole("button", { name: "Retirer le filtre bière" }));

    expect(urlSearch()).toBe("?type=shop");
    expect(screen.queryByText(/Où boire/)).not.toBeInTheDocument();
    expect(mockVenues.useVenuesQuery).toHaveBeenLastCalledWith({ ...EMPTY_VENUE_QUERY, bounds: BOUNDS, types: [VenueTypeEnum.SHOP] });
  });

  it("US13 AC2 leaves an empty address and every venue when the beer was the only filter", async () => {
    const user = userEvent.setup();
    renderMap("/carte?beer=7");

    await user.click(screen.getByRole("button", { name: "Retirer le filtre bière" }));

    expect(urlSearch()).toBe("");
    expect(mockVenues.useVenuesQuery).toHaveBeenLastCalledWith({ ...EMPTY_VENUE_QUERY, bounds: BOUNDS });
  });

  it("US13 AC3 says Bière inconnue for an unknown beer and the chip stays removable", async () => {
    const user = userEvent.setup();
    mockBeer.useFilteredBeerQuery.mockReturnValue({ data: null, isPending: false, isError: false });
    renderMap("/carte?beer=99");

    expect(screen.getByText("Bière inconnue")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retirer le filtre bière" }));

    expect(urlSearch()).toBe("");
  });

  it("US13 AC4 shows a loading block for the name while the filtered venues are already read", () => {
    mockBeer.useFilteredBeerQuery.mockReturnValue({ data: undefined, isPending: true, isError: false });
    renderMap("/carte?beer=7");

    expect(screen.getByTestId("beer-filter-chip-skeleton")).toBeInTheDocument();
    expect(screen.queryByText(/Où boire/)).not.toBeInTheDocument();
    expect(mockVenues.useVenuesQuery).toHaveBeenLastCalledWith({ ...EMPTY_VENUE_QUERY, bounds: BOUNDS, beerId: 7 });
    expect(screen.getAllByTestId("marker")).toHaveLength(2);
  });


  it("US14 AC2 opens the venue sheet when a marker is touched", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MapPage />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Le Trappiste, Bar, Confirmée" }));

    const sheet = await screen.findByRole("dialog", { name: "Le Trappiste" });
    expect(within(sheet).getByText("Bar")).toBeInTheDocument();
    expect(within(sheet).getByText("12 rue de la Bière")).toBeInTheDocument();
    expect(within(sheet).getByText("Paris")).toBeInTheDocument();
    expect(within(sheet).getByText("Vingt pressions.")).toBeInTheDocument();
  });

  it("US15 loads the beers of the touched venue in its sheet, without any real request", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MapPage />);

    await user.click(screen.getByRole("button", { name: "La Cave, Cave, Épuisée" }));

    const sheet = await screen.findByRole("dialog", { name: "La Cave" });
    expect(mockVenueBeers.useVenueBeersQuery).toHaveBeenLastCalledWith(2);
    expect(within(sheet).getByText("Aucune bière signalée ici")).toBeInTheDocument();
  });

  it("US14 AC1 closes the list and opens the sheet of the touched venue", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MapPage />);

    await user.click(screen.getByRole("button", { name: "Lieux (2)" }));
    const list = await screen.findByRole("dialog", { name: "Lieux" });
    await user.click(within(within(list).getAllByRole("listitem")[1]).getByRole("button"));

    const sheet = await screen.findByRole("dialog", { name: "La Cave" });
    expect(within(sheet).getByText("Cave")).toBeInTheDocument();
    expect(within(sheet).getByText("3 quai du Houblon")).toBeInTheDocument();
    expect(within(sheet).getByText("Lyon")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Lieux" })).not.toBeInTheDocument());
  });

  it("US14 AC2 closes the open list and opens the sheet when a marker is touched, one sheet at a time", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MapPage />);

    await user.click(screen.getByRole("button", { name: "Lieux (2)" }));
    await screen.findByRole("dialog", { name: "Lieux" });
    fireEvent.click(screen.getByRole("button", { name: "Le Trappiste, Bar, Confirmée", hidden: true }));

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Lieux", hidden: true })).not.toBeInTheDocument());
    expect(await screen.findByRole("dialog", { name: "Le Trappiste" })).toBeInTheDocument();
    expect(screen.getAllByRole("dialog", { hidden: true })).toHaveLength(1);
  });

  it("US14 AC3 closes the sheet with Fermer and keeps the map on the same view", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MapPage />);
    const queryCalls = mockVenues.useVenuesQuery.mock.calls.length;

    await user.click(screen.getByRole("button", { name: "Le Trappiste, Bar, Confirmée" }));
    const sheet = await screen.findByRole("dialog", { name: "Le Trappiste" });
    await user.click(within(sheet).getByRole("button", { name: "Fermer" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(leaflet.fakeMap.flyTo).not.toHaveBeenCalled();
    expect(screen.getAllByTestId("marker")).toHaveLength(2);
    expect(mockVenues.useVenuesQuery).toHaveBeenLastCalledWith({ ...EMPTY_VENUE_QUERY, bounds: BOUNDS });
    expect(mockVenues.useVenuesQuery.mock.calls.length).toBeGreaterThan(queryCalls);
  });

  it("US14 AC3 closes the sheet with Escape, then another marker opens its own sheet", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MapPage />);

    await user.click(screen.getByRole("button", { name: "Le Trappiste, Bar, Confirmée" }));
    await screen.findByRole("dialog", { name: "Le Trappiste" });
    const queryCalls = mockVenues.useVenuesQuery.mock.calls.length;
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(leaflet.fakeMap.flyTo).not.toHaveBeenCalled();
    expect(screen.getAllByTestId("marker")).toHaveLength(2);
    expect(mockVenues.useVenuesQuery).toHaveBeenLastCalledWith({ ...EMPTY_VENUE_QUERY, bounds: BOUNDS });
    expect(mockVenues.useVenuesQuery.mock.calls.length).toBeGreaterThan(queryCalls);
    await user.click(screen.getByRole("button", { name: "La Cave, Cave, Épuisée" }));

    expect(await screen.findByRole("dialog", { name: "La Cave" })).toBeInTheDocument();
  });

  it("US14 AC4 shows no empty line for a venue without city and description", async () => {
    const user = userEvent.setup();
    stubVenues({ venues: [{ ...VENUES[1], city: "", description: "" }] });
    renderWithProviders(<MapPage />);

    await user.click(screen.getByRole("button", { name: "La Cave, Cave, Épuisée" }));

    const sheet = await screen.findByRole("dialog", { name: "La Cave" });
    expect(within(sheet).queryByText("Ville")).not.toBeInTheDocument();
    expect(within(sheet).getByText("3 quai du Houblon")).toBeInTheDocument();
  });

  it("US14 E8 keeps the sheet open when the map moves and the venue leaves the loaded area", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MapPage />);

    await user.click(screen.getByRole("button", { name: "Le Trappiste, Bar, Confirmée" }));
    await screen.findByRole("dialog", { name: "Le Trappiste" });
    stubVenues({ venues: [VENUES[1]] });
    leaflet.bounds = { north: 49.1, south: 49.0, east: 2.6, west: 2.5 };
    const handler = leaflet.fakeMap.on.mock.calls[0][1] as () => void;
    act(() => handler());

    expect(mockVenues.useVenuesQuery).toHaveBeenLastCalledWith({
      ...EMPTY_VENUE_QUERY,
      bounds: { north: 49.1, south: 49.0, east: 2.6, west: 2.5 },
    });
    expect(screen.getByRole("dialog", { name: "Le Trappiste" })).toBeInTheDocument();
  });
});
