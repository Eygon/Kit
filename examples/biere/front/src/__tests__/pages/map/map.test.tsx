import { toast } from "@heroui/react";
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import type { ReactNode, Ref } from "react";
import { MapPage } from "@/pages/map/map";
import { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";
import { AvailabilityStatusEnum } from "@/types/enums/venue/availabilityStatusEnum";
import { VenueTypeEnum } from "@/types/enums/venue/venueTypeEnum";
import { EMPTY_VENUE_QUERY } from "@/types/mappers/venue/venueQueryMapper";
import {
  createTestQueryClient,
  renderWithProviders,
} from "@/__tests__/utils/renderWithProviders";
import { API_BASE_URL } from "@/config/apiConfig";
import { venueKeys } from "@/utils/queryKeys/venueQueryKeys";

const mockVenues = vi.hoisted(() => ({ useVenuesQuery: vi.fn() }));
const mockBeer = vi.hoisted(() => ({ useFilteredBeerQuery: vi.fn() }));
const mockGeolocation = vi.hoisted(() => ({ useGeolocation: vi.fn() }));
const mockVenueBeers = vi.hoisted(() => ({ useVenueBeersQuery: vi.fn() }));
const mockSearch = vi.hoisted(() => ({ useVenueSearch: vi.fn() }));
const leaflet = vi.hoisted(() => ({
  dragEnd: undefined as
    | undefined
    | ((event: {
        target: {
          getLatLng: () => {
            lat: number;
            lng: number;
            wrap: () => { lat: number; lng: number };
          };
        };
      }) => void),
  bounds: { north: 48.9, south: 48.8, east: 2.4, west: 2.3 },
  fakeMap: {
    on: vi.fn(),
    off: vi.fn(),
    getBounds: vi.fn(),
    flyTo: vi.fn(),
    getZoom: vi.fn(() => 16),
    project: vi.fn(),
    fitBounds: vi.fn(),
  },
}));

vi.mock("@heroui/react", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  toast: { success: vi.fn(), danger: vi.fn() },
}));
vi.mock("@/pages/map/hooks/useVenuesQuery", () => mockVenues);
vi.mock("@/pages/map/hooks/useFilteredBeerQuery", () => mockBeer);
vi.mock("@/pages/map/hooks/useGeolocation", () => mockGeolocation);
vi.mock("@/pages/map/hooks/useVenueBeersQuery", () => mockVenueBeers);
vi.mock("@/pages/map/hooks/useVenueSearch", () => mockSearch);
vi.mock("react-leaflet", () => ({
  MapContainer: ({
    children,
    ref,
  }: {
    children: ReactNode;
    ref?: Ref<unknown>;
  }) => {
    useEffect(() => {
      if (typeof ref === "function") ref(leaflet.fakeMap);
    }, [ref]);
    return <div data-testid="map">{children}</div>;
  },
  ZoomControl: () => null,
  TileLayer: ({
    eventHandlers,
  }: {
    eventHandlers?: { tileerror?: () => void };
  }) => (
    <button type="button" onClick={() => eventHandlers?.tileerror?.()}>
      tile
    </button>
  ),
  CircleMarker: ({
    center,
    children,
  }: {
    center: number[];
    children: ReactNode;
  }) => (
    <div data-testid="user-marker" data-center={center.join(",")}>
      {children}
    </div>
  ),
  Tooltip: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  Marker: ({
    title,
    draggable,
    eventHandlers,
  }: {
    title: string;
    draggable?: boolean;
    eventHandlers?: { click?: () => void; dragend?: typeof leaflet.dragEnd };
  }) => {
    if (draggable) leaflet.dragEnd = eventHandlers?.dragend;
    return (
      <button
        type="button"
        data-testid="marker"
        onClick={() => eventHandlers?.click?.()}
      >
        {title}
      </button>
    );
  },
}));

const LocationProbe = () => (
  <output aria-label="search">{useLocation().search}</output>
);

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
  mockGeolocation.useGeolocation.mockReturnValue({
    position: null,
    status: "idle",
    locate,
    ...overrides,
  });
};

const VENUES = [
  {
    id: 1,
    name: "Le Trappiste",
    type: "bar",
    city: "Paris",
    address: "12 rue de la Bière",
    description: "Vingt pressions.",
    status: "confirmed",
    latitude: 48.85,
    longitude: 2.35,
  },
  {
    id: 2,
    name: "La Cave",
    type: "shop",
    city: "Lyon",
    address: "3 quai du Houblon",
    description: "",
    status: "gone",
    latitude: 48.86,
    longitude: 2.36,
  },
];

const stubVenues = (overrides: Record<string, unknown> = {}) => {
  mockVenues.useVenuesQuery.mockReturnValue({
    venues: VENUES,
    isPending: false,
    isError: false,
    refetch,
    ...overrides,
  });
};

const SEARCH_RESULT = {
  ...VENUES[1],
  latitude: 45.76,
  longitude: 4.83,
  distanceKm: null,
};

const stubbedSearch = (overrides: Record<string, unknown> = {}) => ({
  searchText: "cave",
  setSearchText: vi.fn(),
  term: "cave",
  venues: [SEARCH_RESULT],
  isIdle: false,
  isPending: false,
  isError: false,
  refetch,
  ...overrides,
});

const stubSearch = (overrides: Record<string, unknown> = {}) => {
  mockSearch.useVenueSearch.mockReturnValue(stubbedSearch(overrides));
};

const chooseSearchResult = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: "Rechercher un lieu" }));
  const search = await screen.findByRole("dialog", {
    name: "Rechercher un lieu",
  });
  await user.click(within(search).getByRole("button", { name: /La Cave/ }));
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
    mockVenueBeers.useVenueBeersQuery.mockReturnValue({
      beers: [],
      isPending: false,
      isError: false,
      refetch,
    });
    stubSearch();
    mockBeer.useFilteredBeerQuery.mockReturnValue({
      data: { id: 7, name: "Orval" },
      isPending: false,
      isError: false,
    });
  });

  it("renders a screen-reader only title, the map and the venue list trigger, without the page header", () => {
    renderWithProviders(<MapPage />);

    const heading = screen.getByRole("heading", { level: 1, name: "Carte" });
    expect(heading).toHaveClass("sr-only");
    expect(
      screen.queryByText("Bars, caves et brasseries autour de vous."),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("map")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Lieux (2)" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Aucun lieu pour l'instant"),
    ).not.toBeInTheDocument();
  });

  it("AC5 lays the map out as a fixed layer above the tab bar with no page scroll", () => {
    renderWithProviders(<MapPage />);

    const layer = screen.getByRole("heading", { level: 1 }).parentElement;
    expect(layer).toHaveClass("fixed", "inset-x-0", "top-0", "z-30");
    expect(layer?.className).toContain(
      "bottom-[calc(5rem+env(safe-area-inset-bottom))]",
    );
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
    const handler = leaflet.fakeMap.on.mock.calls.find(
      ([name]) => name === "moveend",
    )?.[1] as () => void;

    act(() => handler());

    expect(mockVenues.useVenuesQuery).toHaveBeenLastCalledWith({
      ...EMPTY_VENUE_QUERY,
      bounds: { north: 49.1, south: 49.0, east: 2.6, west: 2.5 },
    });
  });

  it("AC1 puts one named marker per loaded venue", () => {
    renderWithProviders(<MapPage />);

    expect(screen.getAllByTestId("marker")).toHaveLength(2);
    expect(
      screen.getByRole("button", { name: "Le Trappiste, Bar, Confirmée" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "La Cave, Cave, Épuisée" }),
    ).toBeInTheDocument();
  });

  it("AC4 shows no banner until a tile fails", () => {
    renderWithProviders(<MapPage />);

    expect(
      screen.queryByText(/Fond de carte indisponible/),
    ).not.toBeInTheDocument();
  });

  it("AC4 shows a non blocking banner when a tile fails while markers and drawer stay usable", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MapPage />);

    await user.click(screen.getByRole("button", { name: "tile" }));

    expect(
      screen.getByText(
        "Fond de carte indisponible : les lieux restent utilisables.",
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByTestId("marker")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Lieux (2)" }));
    expect(
      await screen.findByRole("dialog", { name: "Lieux" }),
    ).toBeInTheDocument();
  });

  it("shows only the position error when the tiles are unavailable and the position is denied", async () => {
    const user = userEvent.setup();
    stubGeolocation({ status: "denied" });
    renderWithProviders(<MapPage />);

    await user.click(screen.getByRole("button", { name: "tile" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Position refusée");
    expect(
      screen.queryByText(/Fond de carte indisponible/),
    ).not.toBeInTheDocument();
  });

  it("shows only the position error while a point is being picked, and keeps Annuler in the banner", async () => {
    const user = userEvent.setup();
    stubGeolocation({ status: "unavailable" });
    renderWithProviders(<MapPage />);

    await user.click(screen.getByRole("button", { name: "Proposer un lieu" }));

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Position indisponible.");
    expect(
      screen.queryByText(
        "Touchez la carte pour choisir l'emplacement du lieu.",
      ),
    ).not.toBeInTheDocument();
    await user.click(within(alert).getByRole("button", { name: "Annuler" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Position indisponible.",
    );
  });

  it("shows the unavailable tiles before the point hint, with a single banner and Annuler still reachable", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MapPage />);

    await user.click(screen.getByRole("button", { name: "Proposer un lieu" }));
    await user.click(screen.getByRole("button", { name: "tile" }));

    expect(
      screen.getByText(
        "Fond de carte indisponible : les lieux restent utilisables.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        "Touchez la carte pour choisir l'emplacement du lieu.",
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByText(
        /Fond de carte indisponible|Touchez la carte|Position/,
      ),
    ).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(
      screen.queryByRole("button", { name: "Annuler" }),
    ).not.toBeInTheDocument();
  });

  it("stacks no banner at all when nothing needs saying", () => {
    renderWithProviders(<MapPage />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Fond de carte indisponible|Touchez la carte/),
    ).not.toBeInTheDocument();
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

    expect(
      (await screen.findAllByTestId("venue-row-skeleton")).length,
    ).toBeGreaterThan(0);
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

    expect(
      await screen.findByRole("heading", { level: 2, name: "Aucun lieu ici" }),
    ).toBeInTheDocument();
    expect(screen.queryAllByTestId("marker")).toHaveLength(0);
  });

  it("shows an Autour de moi button, idle, with no position, no marker and no message", () => {
    renderWithProviders(<MapPage />);

    expect(
      screen.getByRole("button", { name: /Autour de moi/ }),
    ).toBeInTheDocument();
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
    stubGeolocation({
      position: { latitude: 48.85, longitude: 2.35 },
      status: "located",
    });
    stubVenues({
      venues: [
        { ...VENUES[1], distanceKm: 0.35 },
        { ...VENUES[0], distanceKm: 1.2 },
      ],
    });
    renderWithProviders(<MapPage />);

    expect(leaflet.fakeMap.flyTo).toHaveBeenCalledWith([48.85, 2.35], 14);
    expect(screen.getByTestId("user-marker")).toHaveTextContent(
      "Vous êtes ici",
    );
    expect(mockVenues.useVenuesQuery).toHaveBeenLastCalledWith({
      ...EMPTY_VENUE_QUERY,
      bounds: { north: 48.9, south: 48.8, east: 2.4, west: 2.3 },
      position: { latitude: 48.85, longitude: 2.35 },
    });
    await user.click(screen.getByRole("button", { name: "Lieux (2)" }));
    const rows = within(
      await screen.findByRole("dialog", { name: "Lieux" }),
    ).getAllByRole("listitem");
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
    expect(alert).toHaveTextContent(
      "Position refusée : autorisez la localisation dans les réglages du navigateur.",
    );
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

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Position indisponible.",
    );
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

    expect(
      screen.getByRole("button", { name: /Autour de moi/ }),
    ).not.toHaveAttribute("data-pending", "true");
  });
  it("US12 shows the Filtres button with no badge and the venue query without filter when the address has none", () => {
    renderMap();

    expect(screen.getByRole("button", { name: "Filtres" })).toBeInTheDocument();
    expect(screen.queryByText(/filtres? actifs?/)).not.toBeInTheDocument();
    expect(mockVenues.useVenuesQuery).toHaveBeenLastCalledWith({
      ...EMPTY_VENUE_QUERY,
      bounds: BOUNDS,
    });
  });

  it("US9 AC1 asks the venue list for the undiscovered filter and counts it in the Filtres badge", () => {
    renderMap("/carte?undiscovered=1");

    expect(mockVenues.useVenuesQuery).toHaveBeenLastCalledWith({
      ...EMPTY_VENUE_QUERY,
      bounds: BOUNDS,
      undiscovered: true,
    });
    expect(screen.getByText("1 filtre actif")).toBeInTheDocument();
  });

  it("US9 AC3 opens the filters with the undiscovered switch on when the address carries the filter", async () => {
    const user = userEvent.setup();
    renderMap("/carte?undiscovered=1");

    await user.click(screen.getByRole("button", { name: "Filtres" }));
    const dialog = await screen.findByRole("dialog", { name: "Filtres" });

    expect(
      within(dialog).getByRole("switch", {
        name: "Lieux avec des bières à découvrir",
      }),
    ).toBeChecked();
  });

  it("US9 AC3 treats another value of the address as inactive", () => {
    renderMap("/carte?undiscovered=true");

    expect(mockVenues.useVenuesQuery).toHaveBeenLastCalledWith({
      ...EMPTY_VENUE_QUERY,
      bounds: BOUNDS,
    });
    expect(screen.queryByText(/filtres? actifs?/)).not.toBeInTheDocument();
  });

  it("US9 AC1 writes the undiscovered filter into the address when the user applies the switch", async () => {
    const user = userEvent.setup();
    renderMap();
    await user.click(screen.getByRole("button", { name: "Filtres" }));
    const dialog = await screen.findByRole("dialog", { name: "Filtres" });

    await user.click(
      within(dialog).getByRole("switch", {
        name: "Lieux avec des bières à découvrir",
      }),
    );
    await user.click(within(dialog).getByRole("button", { name: "Appliquer" }));

    expect(urlSearch()).toBe("?undiscovered=1");
    expect(mockVenues.useVenuesQuery).toHaveBeenLastCalledWith({
      ...EMPTY_VENUE_QUERY,
      bounds: BOUNDS,
      undiscovered: true,
    });
    expect(screen.getByText("1 filtre actif")).toBeInTheDocument();
  });

  it("US9 AC2 gives the search the undiscovered filter", () => {
    renderMap("/carte?undiscovered=1");

    expect(mockSearch.useVenueSearch).toHaveBeenLastCalledWith({
      ...EMPTY_VENUE_QUERY,
      undiscovered: true,
    });
  });

  it("US9 AC4 keeps the empty list state of the list drawer with the filter on and no venue", async () => {
    const user = userEvent.setup();
    stubVenues({ venues: [] });
    renderMap("/carte?undiscovered=1");

    await user.click(screen.getByRole("button", { name: "Lieux (0)" }));

    expect(
      await screen.findByRole("heading", { level: 2, name: "Aucun lieu ici" }),
    ).toBeInTheDocument();
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

    expect(mockVenues.useVenuesQuery).toHaveBeenLastCalledWith({
      ...EMPTY_VENUE_QUERY,
      bounds: BOUNDS,
      confirmedOnly: true,
    });
    expect(screen.getByText("1 filtre actif")).toBeInTheDocument();
  });

  it("US12 sends the radius of the address only with a position", () => {
    const position = { latitude: 48.85, longitude: 2.35 };
    stubGeolocation({ position, status: "located" });
    renderMap("/carte?radius=5");

    expect(mockVenues.useVenuesQuery).toHaveBeenLastCalledWith({
      ...EMPTY_VENUE_QUERY,
      bounds: BOUNDS,
      position,
      radiusKm: 5,
    });
  });

  it("US12 does not send the radius of the address when there is no position", () => {
    renderMap("/carte?radius=5");

    expect(mockVenues.useVenuesQuery).toHaveBeenLastCalledWith({
      ...EMPTY_VENUE_QUERY,
      bounds: BOUNDS,
      radiusKm: null,
    });
  });

  it("US12 does not count the radius of the address in the Filtres badge when there is no position", () => {
    renderMap("/carte?radius=5");

    expect(screen.queryByText(/filtres? actifs?/)).not.toBeInTheDocument();
  });

  it("US12 counts the radius of the address in the Filtres badge when there is a position", () => {
    stubGeolocation({
      position: { latitude: 48.85, longitude: 2.35 },
      status: "located",
    });
    renderMap("/carte?radius=5");

    expect(screen.getByText("1 filtre actif")).toBeInTheDocument();
  });

  it("US12 AC1 reads the venues again with the applied filters and writes them into the address", async () => {
    const user = userEvent.setup();
    renderMap();
    await user.click(screen.getByRole("button", { name: "Filtres" }));
    const dialog = await screen.findByRole("dialog", { name: "Filtres" });

    await user.click(within(dialog).getByRole("checkbox", { name: "Cave" }));
    await user.click(
      within(dialog).getByRole("button", { name: /Famille de bière/ }),
    );
    await user.click(screen.getByRole("option", { name: "Stout" }));
    await user.click(
      within(dialog).getByRole("switch", {
        name: "Disponibilité confirmée seulement",
      }),
    );
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

    await user.click(
      within(dialog).getByRole("button", { name: "Réinitialiser" }),
    );
    await user.click(within(dialog).getByRole("button", { name: "Appliquer" }));

    expect(mockVenues.useVenuesQuery).toHaveBeenLastCalledWith({
      ...EMPTY_VENUE_QUERY,
      bounds: BOUNDS,
    });
    expect(urlSearch()).toBe("");
    expect(screen.queryByText(/filtres? actifs?/)).not.toBeInTheDocument();
  });

  it("US12 AC2 disables the radius without a position and enables it once the map has one", async () => {
    const user = userEvent.setup();
    const { unmount } = renderMap();
    await user.click(screen.getByRole("button", { name: "Filtres" }));
    expect(
      within(await screen.findByRole("dialog", { name: "Filtres" })).getByRole(
        "button",
        { name: /Rayon/ },
      ),
    ).toBeDisabled();
    unmount();

    stubGeolocation({
      position: { latitude: 48.85, longitude: 2.35 },
      status: "located",
    });
    renderMap();
    await user.click(screen.getByRole("button", { name: "Filtres" }));
    expect(
      within(await screen.findByRole("dialog", { name: "Filtres" })).getByRole(
        "button",
        { name: /Rayon/ },
      ),
    ).toBeEnabled();
  });

  it("US13 shows no beer chip when the address has no beer", () => {
    renderMap("/carte?type=shop");

    expect(
      screen.queryByRole("button", { name: "Retirer le filtre bière" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Où boire/)).not.toBeInTheDocument();
  });

  it("US13 AC1 shows the chip Où boire : Orval and reads the venues with the beer filter", () => {
    renderMap("/carte?beer=7");

    expect(screen.getByText("Où boire : Orval")).toBeInTheDocument();
    expect(mockBeer.useFilteredBeerQuery).toHaveBeenCalledWith(7);
    expect(mockVenues.useVenuesQuery).toHaveBeenLastCalledWith({
      ...EMPTY_VENUE_QUERY,
      bounds: BOUNDS,
      beerId: 7,
    });
    expect(screen.getByText("1 filtre actif")).toBeInTheDocument();
  });

  it("US13 AC2 removes only the beer from the address and the venue query when the chip is removed", async () => {
    const user = userEvent.setup();
    renderMap("/carte?type=shop&beer=7");

    await user.click(
      screen.getByRole("button", { name: "Retirer le filtre bière" }),
    );

    expect(urlSearch()).toBe("?type=shop");
    expect(screen.queryByText(/Où boire/)).not.toBeInTheDocument();
    expect(mockVenues.useVenuesQuery).toHaveBeenLastCalledWith({
      ...EMPTY_VENUE_QUERY,
      bounds: BOUNDS,
      types: [VenueTypeEnum.SHOP],
    });
  });

  it("US13 AC2 leaves an empty address and every venue when the beer was the only filter", async () => {
    const user = userEvent.setup();
    renderMap("/carte?beer=7");

    await user.click(
      screen.getByRole("button", { name: "Retirer le filtre bière" }),
    );

    expect(urlSearch()).toBe("");
    expect(mockVenues.useVenuesQuery).toHaveBeenLastCalledWith({
      ...EMPTY_VENUE_QUERY,
      bounds: BOUNDS,
    });
  });

  it("US13 AC3 says Bière inconnue for an unknown beer and the chip stays removable", async () => {
    const user = userEvent.setup();
    mockBeer.useFilteredBeerQuery.mockReturnValue({
      data: null,
      isPending: false,
      isError: false,
    });
    renderMap("/carte?beer=99");

    expect(screen.getByText("Bière inconnue")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Retirer le filtre bière" }),
    );

    expect(urlSearch()).toBe("");
  });

  it("US13 AC4 shows a loading block for the name while the filtered venues are already read", () => {
    mockBeer.useFilteredBeerQuery.mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
    });
    renderMap("/carte?beer=7");

    expect(screen.getByTestId("beer-filter-chip-skeleton")).toBeInTheDocument();
    expect(screen.queryByText(/Où boire/)).not.toBeInTheDocument();
    expect(mockVenues.useVenuesQuery).toHaveBeenLastCalledWith({
      ...EMPTY_VENUE_QUERY,
      bounds: BOUNDS,
      beerId: 7,
    });
    expect(screen.getAllByTestId("marker")).toHaveLength(2);
  });

  it("US14 AC2 opens the venue sheet when a marker is touched", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MapPage />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Le Trappiste, Bar, Confirmée" }),
    );

    const sheet = await screen.findByRole("dialog", { name: "Le Trappiste" });
    expect(within(sheet).getByText("Bar")).toBeInTheDocument();
    expect(within(sheet).getByText("12 rue de la Bière")).toBeInTheDocument();
    expect(within(sheet).getByText("Paris")).toBeInTheDocument();
    expect(within(sheet).getByText("Vingt pressions.")).toBeInTheDocument();
  });

  it("US15 loads the beers of the touched venue in its sheet, without any real request", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MapPage />);

    await user.click(
      screen.getByRole("button", { name: "La Cave, Cave, Épuisée" }),
    );

    const sheet = await screen.findByRole("dialog", { name: "La Cave" });
    expect(mockVenueBeers.useVenueBeersQuery).toHaveBeenLastCalledWith(2);
    expect(
      within(sheet).getByText("Aucune bière signalée ici"),
    ).toBeInTheDocument();
  });

  it("US14 AC1 closes the list and opens the sheet of the touched venue", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MapPage />);

    await user.click(screen.getByRole("button", { name: "Lieux (2)" }));
    const list = await screen.findByRole("dialog", { name: "Lieux" });
    await user.click(
      within(within(list).getAllByRole("listitem")[1]).getByRole("button"),
    );

    const sheet = await screen.findByRole("dialog", { name: "La Cave" });
    expect(within(sheet).getByText("Cave")).toBeInTheDocument();
    expect(within(sheet).getByText("3 quai du Houblon")).toBeInTheDocument();
    expect(within(sheet).getByText("Lyon")).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Lieux" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("US14 AC2 closes the open list and opens the sheet when a marker is touched, one sheet at a time", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MapPage />);

    await user.click(screen.getByRole("button", { name: "Lieux (2)" }));
    await screen.findByRole("dialog", { name: "Lieux" });
    fireEvent.click(
      screen.getByRole("button", {
        name: "Le Trappiste, Bar, Confirmée",
        hidden: true,
      }),
    );

    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Lieux", hidden: true }),
      ).not.toBeInTheDocument(),
    );
    expect(
      await screen.findByRole("dialog", { name: "Le Trappiste" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("dialog", { hidden: true })).toHaveLength(1);
  });

  it("US14 AC3 closes the sheet with Fermer and keeps the map on the same view", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MapPage />);
    const queryCalls = mockVenues.useVenuesQuery.mock.calls.length;

    await user.click(
      screen.getByRole("button", { name: "Le Trappiste, Bar, Confirmée" }),
    );
    const sheet = await screen.findByRole("dialog", { name: "Le Trappiste" });
    await user.click(within(sheet).getByRole("button", { name: "Fermer" }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(leaflet.fakeMap.flyTo).not.toHaveBeenCalled();
    expect(screen.getAllByTestId("marker")).toHaveLength(2);
    expect(mockVenues.useVenuesQuery).toHaveBeenLastCalledWith({
      ...EMPTY_VENUE_QUERY,
      bounds: BOUNDS,
    });
    expect(mockVenues.useVenuesQuery.mock.calls.length).toBeGreaterThan(
      queryCalls,
    );
  });

  it("US14 AC3 closes the sheet with Escape, then another marker opens its own sheet", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MapPage />);

    await user.click(
      screen.getByRole("button", { name: "Le Trappiste, Bar, Confirmée" }),
    );
    await screen.findByRole("dialog", { name: "Le Trappiste" });
    const queryCalls = mockVenues.useVenuesQuery.mock.calls.length;
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(leaflet.fakeMap.flyTo).not.toHaveBeenCalled();
    expect(screen.getAllByTestId("marker")).toHaveLength(2);
    expect(mockVenues.useVenuesQuery).toHaveBeenLastCalledWith({
      ...EMPTY_VENUE_QUERY,
      bounds: BOUNDS,
    });
    expect(mockVenues.useVenuesQuery.mock.calls.length).toBeGreaterThan(
      queryCalls,
    );
    await user.click(
      screen.getByRole("button", { name: "La Cave, Cave, Épuisée" }),
    );

    expect(
      await screen.findByRole("dialog", { name: "La Cave" }),
    ).toBeInTheDocument();
  });

  it("US14 AC4 shows no empty line for a venue without city and description", async () => {
    const user = userEvent.setup();
    stubVenues({ venues: [{ ...VENUES[1], city: "", description: "" }] });
    renderWithProviders(<MapPage />);

    await user.click(
      screen.getByRole("button", { name: "La Cave, Cave, Épuisée" }),
    );

    const sheet = await screen.findByRole("dialog", { name: "La Cave" });
    expect(within(sheet).queryByText("Ville")).not.toBeInTheDocument();
    expect(within(sheet).getByText("3 quai du Houblon")).toBeInTheDocument();
  });

  it("US14 E8 keeps the sheet open when the map moves and the venue leaves the loaded area", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MapPage />);

    await user.click(
      screen.getByRole("button", { name: "Le Trappiste, Bar, Confirmée" }),
    );
    await screen.findByRole("dialog", { name: "Le Trappiste" });
    stubVenues({ venues: [VENUES[1]] });
    leaflet.bounds = { north: 49.1, south: 49.0, east: 2.6, west: 2.5 };
    const handler = leaflet.fakeMap.on.mock.calls.find(
      ([name]) => name === "moveend",
    )?.[1] as () => void;
    act(() => handler());

    expect(mockVenues.useVenuesQuery).toHaveBeenLastCalledWith({
      ...EMPTY_VENUE_QUERY,
      bounds: { north: 49.1, south: 49.0, east: 2.6, west: 2.5 },
    });
    expect(
      screen.getByRole("dialog", { name: "Le Trappiste" }),
    ).toBeInTheDocument();
  });

  it("F8 E5 leaves the open sheet untouched when a cluster is touched, the map only zooming on it", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MapPage />);
    await user.click(
      screen.getByRole("button", { name: "La Cave, Cave, Épuisée" }),
    );
    await screen.findByRole("dialog", { name: "La Cave" });
    const beersCalls = mockVenueBeers.useVenueBeersQuery.mock.calls.length;
    leaflet.fakeMap.getZoom.mockReturnValueOnce(12);
    leaflet.fakeMap.project.mockImplementation(
      ([latitude, longitude]: [number, number]) => ({
        x: longitude * 1000,
        y: latitude * 1000,
      }),
    );
    const handler = leaflet.fakeMap.on.mock.calls.find(
      ([name]) => name === "zoomend",
    )?.[1] as () => void;
    act(() => handler());

    fireEvent.click(
      screen.getByRole("button", { name: "2 lieux, zoomer", hidden: true }),
    );

    expect(leaflet.fakeMap.fitBounds).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("dialog", { name: "La Cave" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("dialog", { hidden: true })).toHaveLength(1);
    expect(mockVenueBeers.useVenueBeersQuery).toHaveBeenLastCalledWith(2);
    expect(
      mockVenueBeers.useVenueBeersQuery.mock.calls
        .slice(beersCalls)
        .every(([venueId]) => venueId === 2),
    ).toBe(true);
  });
});

const API = `${API_BASE_URL}/api/v1`;
const mockFetch = vi.fn();
const POINT_MARKER = "Point choisi pour le nouveau lieu";

const createdDto = {
  id: 40,
  name: "Le Nouveau",
  type: "bar",
  city: "",
  address: "5 rue Neuve",
  latitude: 48.85,
  longitude: 2.35,
  description: "",
  distanceKm: null,
  status: "unknown",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

const longPress = (lat = 48.85, lng = 2.35) => {
  const call = leaflet.fakeMap.on.mock.calls.find(
    ([name]) => name === "contextmenu",
  );
  if (call === undefined) throw new Error("the map listens to no context menu");
  act(() =>
    (
      call[1] as (event: {
        latlng: {
          lat: number;
          lng: number;
          wrap: () => { lat: number; lng: number };
        };
      }) => void
    )({ latlng: { lat, lng, wrap: () => ({ lat, lng }) } }),
  );
};

const proposeDialog = () =>
  screen.getByRole("dialog", { name: "Proposer un lieu" });

const fillProposal = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(
    within(proposeDialog()).getByRole("textbox", { name: /Nom du lieu/ }),
    "Le Nouveau",
  );
  await user.type(
    within(proposeDialog()).getByRole("textbox", { name: /Adresse/ }),
    "5 rue Neuve",
  );
};

const confirmPoint = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: "Confirmer le point" }));
  await screen.findByRole("dialog", { name: "Proposer un lieu" });
};

describe("MapPage venue proposal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    mockFetch.mockImplementation(async () => json(createdDto, 201));
    vi.stubGlobal("fetch", mockFetch);
    leaflet.dragEnd = undefined;
    leaflet.fakeMap.getBounds.mockImplementation(() => ({
      getNorth: () => leaflet.bounds.north,
      getSouth: () => leaflet.bounds.south,
      getEast: () => leaflet.bounds.east,
      getWest: () => leaflet.bounds.west,
    }));
    stubVenues();
    stubGeolocation();
    mockVenueBeers.useVenueBeersQuery.mockReturnValue({
      beers: [],
      isPending: false,
      isError: false,
      refetch,
    });
    mockBeer.useFilteredBeerQuery.mockReturnValue({
      data: { id: 7, name: "Orval" },
      isPending: false,
      isError: false,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("offers a Proposer un lieu button with no hint, no point marker and no form at first", () => {
    renderWithProviders(<MapPage />);

    expect(
      screen.getByRole("button", { name: "Proposer un lieu" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        "Touchez la carte pour choisir l'emplacement du lieu.",
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: POINT_MARKER }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { hidden: true }),
    ).not.toBeInTheDocument();
  });

  it("asks for a long press on the map once Proposer un lieu is pressed, and cancels", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MapPage />);

    await user.click(screen.getByRole("button", { name: "Proposer un lieu" }));

    expect(
      screen.getByText("Touchez la carte pour choisir l'emplacement du lieu."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Confirmer le point" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(
      screen.queryByText(
        "Touchez la carte pour choisir l'emplacement du lieu.",
      ),
    ).not.toBeInTheDocument();
  });

  it("AC1 puts a point marker on a long press and asks to confirm it", () => {
    renderWithProviders(<MapPage />);

    longPress(48.85, 2.35);

    expect(
      screen.getByRole("button", { name: POINT_MARKER }),
    ).toBeInTheDocument();
    expect(screen.getAllByTestId("marker")).toHaveLength(3);
    expect(
      screen.getByText(
        "Glissez le repère pour ajuster le point, puis confirmez.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Confirmer le point" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { hidden: true }),
    ).not.toBeInTheDocument();
  });

  it("drops the picked point on Annuler", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MapPage />);
    longPress();

    await user.click(screen.getByRole("button", { name: "Annuler" }));

    expect(
      screen.queryByRole("button", { name: POINT_MARKER }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Confirmer le point" }),
    ).not.toBeInTheDocument();
  });

  it("AC1 opens the form on Confirmer le point, showing the chosen point", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MapPage />);
    longPress(48.85, 2.35);

    await confirmPoint(user);

    expect(
      within(proposeDialog()).getByText("Point choisi : 48.8500, 2.3500"),
    ).toBeInTheDocument();
  });

  it("AC1 creates the venue at the picked point, reloads the venue lists, then closes the form and clears the point", async () => {
    const user = userEvent.setup();
    const queryClient = createTestQueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    renderWithProviders(<MapPage />, { queryClient });
    longPress(48.85, 2.35);
    await confirmPoint(user);
    await fillProposal(user);

    mockVenues.useVenuesQuery.mockReturnValue({
      venues: [...VENUES, { ...createdDto }],
      isPending: false,
      isError: false,
      refetch,
    });
    await user.click(
      within(proposeDialog()).getByRole("button", { name: "Proposer" }),
    );

    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { hidden: true }),
      ).not.toBeInTheDocument(),
    );
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toBe(`${API}/venues`);
    expect(
      JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string),
    ).toEqual({
      name: "Le Nouveau",
      type: "bar",
      address: "5 rue Neuve",
      city: "",
      description: "",
      latitude: 48.85,
      longitude: 2.35,
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: venueKeys.lists() });
    expect(toast.success).toHaveBeenCalledWith("Lieu proposé");
    expect(
      screen.queryByRole("button", { name: POINT_MARKER }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Confirmer le point" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Le Nouveau, Bar, Inconnue" }),
    ).toBeInTheDocument();
  });

  it("AC1 creates the venue where the point marker was dragged", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MapPage />);
    longPress(48.85, 2.35);

    act(() =>
      leaflet.dragEnd?.({
        target: {
          getLatLng: () => ({
            lat: 48.9,
            lng: 2.4,
            wrap: () => ({ lat: 48.9, lng: 2.4 }),
          }),
        },
      }),
    );
    await confirmPoint(user);
    await fillProposal(user);
    await user.click(
      within(proposeDialog()).getByRole("button", { name: "Proposer" }),
    );

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    expect(
      JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string),
    ).toMatchObject({
      latitude: 48.9,
      longitude: 2.4,
    });
  });

  it("AC2 shows the error of each empty required field, sends nothing and keeps the form and the point", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MapPage />);
    longPress();
    await confirmPoint(user);

    await user.click(
      within(proposeDialog()).getByRole("button", { name: "Proposer" }),
    );

    expect(await screen.findByText("Le nom est requis")).toBeInTheDocument();
    expect(screen.getByText("L'adresse est requise")).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: POINT_MARKER, hidden: true }),
    ).toBeInTheDocument();
  });

  it("AC3 shows Ce lieu existe déjà on the name field on a 409 and keeps the form open with the point", async () => {
    mockFetch.mockImplementation(async () => json({ message: "taken" }, 409));
    const user = userEvent.setup();
    renderWithProviders(<MapPage />);
    longPress();
    await confirmPoint(user);
    await fillProposal(user);

    await user.click(
      within(proposeDialog()).getByRole("button", { name: "Proposer" }),
    );

    await waitFor(() =>
      expect(
        within(proposeDialog()).getByRole("textbox", { name: /Nom du lieu/ }),
      ).toBeInvalid(),
    );
    expect(
      within(proposeDialog()).getByText("Ce lieu existe déjà"),
    ).toBeInTheDocument();
    expect(
      within(proposeDialog()).getByRole("textbox", { name: /Adresse/ }),
    ).toHaveValue("5 rue Neuve");
    expect(toast.danger).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: POINT_MARKER, hidden: true }),
    ).toBeInTheDocument();
  });

  it("closes the form with Escape without losing the point, so Confirmer le point opens it again empty", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MapPage />);
    longPress();
    await confirmPoint(user);
    await fillProposal(user);

    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { hidden: true }),
      ).not.toBeInTheDocument(),
    );

    expect(
      screen.getByRole("button", { name: POINT_MARKER }),
    ).toBeInTheDocument();
    await confirmPoint(user);
    expect(
      within(proposeDialog()).getByRole("textbox", { name: /Nom du lieu/ }),
    ).toHaveValue("");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("keeps the venue sheet working while a point is picked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MapPage />);
    longPress();

    await user.click(
      screen.getByRole("button", { name: "Le Trappiste, Bar, Confirmée" }),
    );

    expect(
      await screen.findByRole("dialog", { name: "Le Trappiste" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: POINT_MARKER, hidden: true }),
    ).toBeInTheDocument();
  });
});

describe("MapPage venue search", () => {
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
    mockVenueBeers.useVenueBeersQuery.mockReturnValue({
      beers: [],
      isPending: false,
      isError: false,
      refetch,
    });
    mockBeer.useFilteredBeerQuery.mockReturnValue({
      data: { id: 7, name: "Orval" },
      isPending: false,
      isError: false,
    });
    stubSearch();
  });

  it("US6 AC1 puts Rechercher un lieu as the first button of the toolbar", () => {
    renderWithProviders(<MapPage />);

    const toolbar = screen.getByRole("button", {
      name: "Rechercher un lieu",
    }).parentElement;
    expect(toolbar?.querySelector("button")).toBe(
      screen.getByRole("button", { name: "Rechercher un lieu" }),
    );
    expect(
      within(toolbar as HTMLElement).getByRole("button", {
        name: "Autour de moi",
      }),
    ).toBeInTheDocument();
  });

  it("US6 AC2 centers the map on the chosen result at zoom 16 and opens its sheet", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MapPage />);

    await chooseSearchResult(user);

    expect(leaflet.fakeMap.flyTo).toHaveBeenCalledTimes(1);
    expect(leaflet.fakeMap.flyTo).toHaveBeenCalledWith([45.76, 4.83], 16);
    const sheet = await screen.findByRole("dialog", { name: "La Cave" });
    expect(within(sheet).getByText("3 quai du Houblon")).toBeInTheDocument();
    expect(mockVenueBeers.useVenueBeersQuery).toHaveBeenCalledWith(2);
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", {
          name: "Rechercher un lieu",
          hidden: true,
        }),
      ).not.toBeInTheDocument(),
    );
  });

  it("US6 AC2 shows the beers of the venue chosen from the search in its sheet", async () => {
    const user = userEvent.setup();
    const chimay = {
      beerId: 9,
      beerName: "Chimay Bleue",
      breweryName: "Abbaye de Scourmont",
      styleName: "Trappiste",
      family: BeerFamilyEnum.IPA,
      status: AvailabilityStatusEnum.CONFIRMED,
      lastConfirmedAt: null,
      recentVoterCount: 0,
      nextVoteAt: null,
      drunk: false,
      checkinCount: 0,
      lastCheckinAt: null,
    };
    mockVenueBeers.useVenueBeersQuery.mockImplementation((venueId: number) => ({
      beers: venueId === 2 ? [chimay] : [],
      isPending: false,
      isError: false,
      refetch,
    }));
    renderWithProviders(<MapPage />);

    await chooseSearchResult(user);

    const sheet = await screen.findByRole("dialog", { name: "La Cave" });
    expect(within(sheet).getByText("Chimay Bleue")).toBeInTheDocument();
  });

  it("US6 AC3 centers the map again when the same venue is chosen a second time", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MapPage />);

    await chooseSearchResult(user);
    const sheet = await screen.findByRole("dialog", { name: "La Cave" });
    await user.click(within(sheet).getByRole("button", { name: "Fermer" }));
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "La Cave" }),
      ).not.toBeInTheDocument(),
    );
    await chooseSearchResult(user);

    expect(leaflet.fakeMap.flyTo).toHaveBeenCalledTimes(2);
    expect(leaflet.fakeMap.flyTo).toHaveBeenLastCalledWith([45.76, 4.83], 16);
    expect(
      await screen.findByRole("dialog", { name: "La Cave" }),
    ).toBeInTheDocument();
  });

  it("US6 AC4 gives the search the filters of the address without the visible area, and keeps the area for the map venues", () => {
    stubGeolocation({
      position: { latitude: 48.85, longitude: 2.35 },
      status: "located",
    });
    renderMap("/carte?type=shop&family=stout&beer=7&confirmed=1&radius=5");

    expect(mockSearch.useVenueSearch).toHaveBeenLastCalledWith({
      ...EMPTY_VENUE_QUERY,
      position: { latitude: 48.85, longitude: 2.35 },
      types: [VenueTypeEnum.SHOP],
      family: BeerFamilyEnum.STOUT,
      beerId: 7,
      confirmedOnly: true,
      radiusKm: 5,
    });
    expect(mockVenues.useVenuesQuery).toHaveBeenLastCalledWith({
      ...EMPTY_VENUE_QUERY,
      bounds: BOUNDS,
      position: { latitude: 48.85, longitude: 2.35 },
      types: [VenueTypeEnum.SHOP],
      family: BeerFamilyEnum.STOUT,
      beerId: 7,
      confirmedOnly: true,
      radiusKm: 5,
    });
  });

  it("US6 AC4 sends no radius to the search without a position", () => {
    renderMap("/carte?radius=5");

    expect(mockSearch.useVenueSearch).toHaveBeenLastCalledWith({
      ...EMPTY_VENUE_QUERY,
      radiusKm: null,
    });
  });

  it("US6 AC4 tells the search sheet how many filters are active, so an empty search names them", async () => {
    const user = userEvent.setup();
    stubSearch({ venues: [] });
    renderMap("/carte?type=shop&confirmed=1");

    await user.click(
      screen.getByRole("button", { name: "Rechercher un lieu" }),
    );

    expect(
      await screen.findByText(
        "Aucun lieu ne correspond avec les filtres actifs. Essayez d'en retirer.",
      ),
    ).toBeInTheDocument();
  });

  it("US6 E9 keeps the typed search text when the search sheet is closed and opened again", async () => {
    const user = userEvent.setup();
    mockSearch.useVenueSearch.mockImplementation(() => {
      const [searchText, setSearchText] = useState("");
      return { ...stubbedSearch(), searchText, setSearchText };
    });
    const { rerender } = renderWithProviders(<MapPage />);

    await user.click(
      screen.getByRole("button", { name: "Rechercher un lieu" }),
    );
    await user.type(
      await screen.findByRole("searchbox", {
        name: "Nom d'un lieu ou d'une ville",
      }),
      "cave",
    );
    await user.click(
      screen.getByRole("heading", { name: "Rechercher un lieu" }),
    );
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Rechercher un lieu" }),
      ).not.toBeInTheDocument(),
    );
    rerender(<MapPage />);
    await user.click(
      screen.getByRole("button", { name: "Rechercher un lieu" }),
    );

    expect(
      await screen.findByRole("searchbox", {
        name: "Nom d'un lieu ou d'une ville",
      }),
    ).toHaveValue("cave");
  });

  it("US6 keeps the search query object stable across renders so the typed text survives", () => {
    const { rerender } = renderWithProviders(<MapPage />);
    const first = mockSearch.useVenueSearch.mock.calls[0][0];

    rerender(<MapPage />);

    expect(mockSearch.useVenueSearch.mock.calls.at(-1)?.[0]).toBe(first);
  });
});
