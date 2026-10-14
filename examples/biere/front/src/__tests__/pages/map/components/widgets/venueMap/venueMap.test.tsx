import { screen } from "@testing-library/react";
import { useEffect } from "react";
import type { ReactNode, Ref } from "react";
import { VenueMap } from "@/pages/map/components/widgets/venueMap/venueMap";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import type { VenueMapProps } from "@/pages/map/types/venueMap";
import type { Venue } from "@/types/models/venue/venue";
import { AvailabilityStatusEnum } from "@/types/enums/venue/availabilityStatusEnum";
import { VenueTypeEnum } from "@/types/enums/venue/venueTypeEnum";

type FakeLatLng = { lat: number; lng: number; wrap: () => { lat: number; lng: number } };

const leaflet = vi.hoisted(() => ({
  bounds: { north: 48.9, south: 48.8, east: 2.4, west: 2.3 },
  dragEnd: undefined as undefined | ((event: { target: { getLatLng: () => FakeLatLng } }) => void),
  fakeMap: {
    on: vi.fn(),
    off: vi.fn(),
    getBounds: vi.fn(),
    flyTo: vi.fn(),
  },
}));

vi.mock("react-leaflet", () => ({
  MapContainer: ({
    children,
    ref,
    className,
    center,
    zoom,
    zoomControl,
  }: {
    children: ReactNode;
    ref?: Ref<unknown>;
    className?: string;
    center: number[];
    zoom: number;
    zoomControl?: boolean;
  }) => {
    useEffect(() => {
      if (typeof ref === "function") ref(leaflet.fakeMap);
    }, [ref]);
    return (
      <div data-testid="map" className={className} data-center={center.join(",")} data-zoom={zoom} data-default-zoom-control={String(zoomControl)}>
        {children}
      </div>
    );
  },
  ZoomControl: ({ position }: { position?: string }) => <div data-testid="zoom-control" data-position={position} />,
  TileLayer: ({
    url,
    attribution,
    eventHandlers,
  }: {
    url: string;
    attribution: string;
    eventHandlers?: { tileerror?: () => void };
  }) => (
    <button type="button" data-testid="tiles" data-url={url} data-attribution={attribution} onClick={() => eventHandlers?.tileerror?.()}>
      tile
    </button>
  ),
  CircleMarker: ({ center, children }: { center: number[]; children: ReactNode }) => (
    <div data-testid="user-marker" data-center={center.join(",")}>
      {children}
    </div>
  ),
  Tooltip: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  Marker: ({
    title,
    keyboard,
    position,
    icon,
    draggable,
    eventHandlers,
  }: {
    title: string;
    keyboard: boolean;
    position: number[];
    icon: { options: { html: string } };
    draggable?: boolean;
    eventHandlers?: { click?: () => void; dragend?: typeof leaflet.dragEnd };
  }) => {
    if (draggable) leaflet.dragEnd = eventHandlers?.dragend;
    return (
      <button type="button" data-testid="marker" data-keyboard={String(keyboard)} data-draggable={String(draggable === true)} data-position={position.join(",")} data-html={icon.options.html} onClick={() => eventHandlers?.click?.()}>
        {title}
      </button>
    );
  },
}));

const buildVenues = (count: number): Venue[] => {
  const types = [VenueTypeEnum.BAR, VenueTypeEnum.SHOP, VenueTypeEnum.BREWERY];
  const statuses = [
    AvailabilityStatusEnum.CONFIRMED,
    AvailabilityStatusEnum.MAYBE_GONE,
    AvailabilityStatusEnum.GONE,
    AvailabilityStatusEnum.UNKNOWN,
  ];
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    name: `Lieu ${index + 1}`,
    type: types[index % types.length],
    city: "Paris",
    address: "",
    latitude: 48.8 + index / 1000,
    longitude: 2.3 + index / 1000,
    description: "",
    distanceKm: null,
    status: statuses[index % statuses.length],
  }));
};

const onBoundsChange = vi.fn();
const onTilesUnavailable = vi.fn();
const onSelectVenue = vi.fn();
const onPickPoint = vi.fn();

const renderMap = async (overrides: Partial<VenueMapProps> = {}) => {
  return renderWithProviders(
    <VenueMap
      venues={[]}
      userPosition={null}
      focusedPosition={null}
      onBoundsChange={onBoundsChange}
      onTilesUnavailable={onTilesUnavailable}
      onSelectVenue={onSelectVenue}
      pickedPoint={null}
      isPickingPoint={false}
      onPickPoint={onPickPoint}
      {...overrides}
    />,
  );
};

describe("VenueMap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    leaflet.fakeMap.getBounds.mockReturnValue({
      getNorth: () => leaflet.bounds.north,
      getSouth: () => leaflet.bounds.south,
      getEast: () => leaflet.bounds.east,
      getWest: () => leaflet.bounds.west,
    });
  });

  it("fills its parent and starts centered on Paris at zoom 12", async () => {
    await renderMap();

    const map = screen.getByTestId("map");
    expect(map).toHaveClass("size-full");
    expect(map).toHaveAttribute("data-center", "48.8566,2.3522");
    expect(map).toHaveAttribute("data-zoom", "12");
  });

  it("moves the zoom buttons to the bottom right, replacing the default top left control", async () => {
    await renderMap();

    expect(screen.getByTestId("map")).toHaveAttribute("data-default-zoom-control", "false");
    expect(screen.getByTestId("zoom-control")).toHaveAttribute("data-position", "bottomright");
  });

  it("loads the OpenStreetMap tiles with their attribution", async () => {
    await renderMap();

    const tiles = screen.getByTestId("tiles");
    expect(tiles).toHaveAttribute("data-url", "https://tile.openstreetmap.org/{z}/{x}/{y}.png");
    expect(tiles).toHaveAttribute("data-attribution", "&copy; OpenStreetMap contributors");
  });

  it("AC1 puts one marker per venue, each named name, type, status", async () => {
    await renderMap({ venues: buildVenues(36) });

    expect(screen.getAllByTestId("marker")).toHaveLength(36);
    expect(screen.getByRole("button", { name: "Lieu 1, Bar, Confirmée" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lieu 2, Cave, Peut-être épuisée" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lieu 3, Brasserie, Épuisée" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lieu 4, Bar, Inconnue" })).toBeInTheDocument();
  });

  it("AC1 places each marker at its coordinates, keyboard reachable, with the status glyph icon", async () => {
    await renderMap({ venues: buildVenues(2) });

    const [first, second] = screen.getAllByTestId("marker");
    expect(first).toHaveAttribute("data-position", "48.8,2.3");
    expect(first).toHaveAttribute("data-keyboard", "true");
    expect(first.getAttribute("data-html")).toContain("✓");
    expect(second.getAttribute("data-html")).toContain("?");
  });

  it("AC2 renders a confirmed bar round with a check and a gone shop square with a cross", async () => {
    await renderMap({ venues: [buildVenues(1)[0], { ...buildVenues(2)[1], status: AvailabilityStatusEnum.GONE }] });

    const [bar, shop] = screen.getAllByTestId("marker");
    expect(bar.getAttribute("data-html")).toContain("rounded-full");
    expect(bar.getAttribute("data-html")).toContain("✓");
    expect(shop.getAttribute("data-html")).toContain("rounded-control");
    expect(shop.getAttribute("data-html")).toContain("✕");
  });

  it("AC3 reports the visible bounds once the map exists and on every moveend, and stops listening on unmount", async () => {
    const { unmount } = await renderMap();

    expect(onBoundsChange).toHaveBeenCalledTimes(1);
    expect(onBoundsChange).toHaveBeenLastCalledWith({ north: 48.9, south: 48.8, east: 2.4, west: 2.3 });
    expect(leaflet.fakeMap.on).toHaveBeenCalledWith("moveend", expect.any(Function));

    leaflet.bounds.north = 49.1;
    leaflet.bounds.south = 49.0;
    const handler = leaflet.fakeMap.on.mock.calls[0][1] as () => void;
    handler();

    expect(onBoundsChange).toHaveBeenCalledTimes(2);
    expect(onBoundsChange).toHaveBeenLastCalledWith({ north: 49.1, south: 49.0, east: 2.4, west: 2.3 });

    unmount();

    expect(leaflet.fakeMap.off).toHaveBeenCalledWith("moveend", handler);
  });

  it("AC4 reports the unavailable tiles when a tile fails", async () => {
    const { getByTestId } = await renderMap({ venues: buildVenues(2) });

    getByTestId("tiles").click();

    expect(onTilesUnavailable).toHaveBeenCalledTimes(1);
    expect(screen.getAllByTestId("marker")).toHaveLength(2);
  });
});


describe("VenueMap user position", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    leaflet.fakeMap.getBounds.mockReturnValue({
      getNorth: () => leaflet.bounds.north,
      getSouth: () => leaflet.bounds.south,
      getEast: () => leaflet.bounds.east,
      getWest: () => leaflet.bounds.west,
    });
  });

  it("neither moves the map nor draws a user marker without a position", async () => {
    await renderMap();

    expect(leaflet.fakeMap.flyTo).not.toHaveBeenCalled();
    expect(screen.queryByTestId("user-marker")).not.toBeInTheDocument();
  });

  it("AC1 flies to the user at zoom 14 and shows the Vous êtes ici marker at the position", async () => {
    await renderMap({ userPosition: { latitude: 48.85, longitude: 2.35 } });

    expect(leaflet.fakeMap.flyTo).toHaveBeenCalledTimes(1);
    expect(leaflet.fakeMap.flyTo).toHaveBeenCalledWith([48.85, 2.35], 14);
    const marker = screen.getByTestId("user-marker");
    expect(marker).toHaveAttribute("data-center", "48.85,2.35");
    expect(marker).toHaveTextContent("Vous êtes ici");
  });

  it("AC1 flies again when the position changes and keeps the venue markers", async () => {
    const { rerender } = await renderMap({ venues: buildVenues(2), userPosition: { latitude: 48.85, longitude: 2.35 } });

    rerender(
      <VenueMap
        venues={buildVenues(2)}
        userPosition={{ latitude: 45.76, longitude: 4.83 }}
        focusedPosition={null}
        onBoundsChange={onBoundsChange}
        onTilesUnavailable={onTilesUnavailable}
        onSelectVenue={onSelectVenue}
        pickedPoint={null}
        isPickingPoint={false}
        onPickPoint={onPickPoint}
      />,
    );

    expect(leaflet.fakeMap.flyTo).toHaveBeenCalledTimes(2);
    expect(leaflet.fakeMap.flyTo).toHaveBeenLastCalledWith([45.76, 4.83], 14);
    expect(screen.getByTestId("user-marker")).toHaveAttribute("data-center", "45.76,4.83");
    expect(screen.getAllByTestId("marker")).toHaveLength(2);
  });

  it("AC2 does not move the map without a focused position", async () => {
    await renderMap({ focusedPosition: null });

    expect(leaflet.fakeMap.flyTo).not.toHaveBeenCalled();
  });

  it("US6 AC2 flies to the focused venue at zoom 16", async () => {
    await renderMap({ focusedPosition: { latitude: 45.76, longitude: 4.83 } });

    expect(leaflet.fakeMap.flyTo).toHaveBeenCalledTimes(1);
    expect(leaflet.fakeMap.flyTo).toHaveBeenCalledWith([45.76, 4.83], 16);
  });

  it("US6 AC3 flies again when the same venue is focused again with a new position object", async () => {
    const { rerender } = await renderMap({ focusedPosition: { latitude: 45.76, longitude: 4.83 } });

    rerender(
      <VenueMap
        venues={[]}
        userPosition={null}
        focusedPosition={{ latitude: 45.76, longitude: 4.83 }}
        onBoundsChange={onBoundsChange}
        onTilesUnavailable={onTilesUnavailable}
        onSelectVenue={onSelectVenue}
        pickedPoint={null}
        isPickingPoint={false}
        onPickPoint={onPickPoint}
      />,
    );

    expect(leaflet.fakeMap.flyTo).toHaveBeenCalledTimes(2);
    expect(leaflet.fakeMap.flyTo).toHaveBeenLastCalledWith([45.76, 4.83], 16);
  });

  it("US6 AC3 does not fly again on an unrelated re-render that keeps the same focused position object", async () => {
    const focusedPosition = { latitude: 45.76, longitude: 4.83 };
    const { rerender } = await renderMap({ focusedPosition });

    rerender(
      <VenueMap
        venues={buildVenues(2)}
        userPosition={null}
        focusedPosition={focusedPosition}
        onBoundsChange={onBoundsChange}
        onTilesUnavailable={onTilesUnavailable}
        onSelectVenue={onSelectVenue}
        pickedPoint={null}
        isPickingPoint={false}
        onPickPoint={onPickPoint}
      />,
    );

    expect(leaflet.fakeMap.flyTo).toHaveBeenCalledTimes(1);
    expect(screen.getAllByTestId("marker")).toHaveLength(2);
  });

  it("AC2 hands the venue of a touched marker to onSelectVenue", async () => {
    const venues = buildVenues(3);
    await renderMap({ venues });

    screen.getAllByTestId("marker")[1].click();

    expect(onSelectVenue).toHaveBeenCalledTimes(1);
    expect(onSelectVenue).toHaveBeenCalledWith(venues[1]);
  });

  it("AC2 does not call onSelectVenue before a marker is touched", async () => {
    await renderMap({ venues: buildVenues(3) });

    expect(onSelectVenue).not.toHaveBeenCalled();
  });
});


const mapHandler = (eventName: string) => {
  const call = leaflet.fakeMap.on.mock.calls.find(([name]) => name === eventName);
  if (call === undefined) throw new Error(`no handler for ${eventName}`);
  return call[1] as (event?: { latlng: FakeLatLng }) => void;
};

const pressedAt = (lat: number, lng: number) => ({ latlng: { lat, lng, wrap: () => ({ lat, lng }) } });

const PRESSED = pressedAt(48.85, 2.35);

describe("VenueMap point picking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    leaflet.dragEnd = undefined;
    leaflet.fakeMap.getBounds.mockReturnValue({
      getNorth: () => leaflet.bounds.north,
      getSouth: () => leaflet.bounds.south,
      getEast: () => leaflet.bounds.east,
      getWest: () => leaflet.bounds.west,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("AC1 picks the point of a native context menu, the long press of a touch screen", async () => {
    await renderMap();

    mapHandler("contextmenu")(PRESSED);

    expect(onPickPoint).toHaveBeenCalledTimes(1);
    expect(onPickPoint).toHaveBeenCalledWith({ latitude: 48.85, longitude: 2.35 });
  });

  it("wraps the longitude of a context menu on a repeated copy of the world into the contract range", async () => {
    await renderMap();

    mapHandler("contextmenu")({ latlng: { lat: 48.85, lng: 362.35, wrap: () => ({ lat: 48.85, lng: 2.35 }) } });

    expect(onPickPoint).toHaveBeenCalledWith({ latitude: 48.85, longitude: 2.35 });
  });

  it("wraps the longitude of a long press timer on a repeated copy of the world", async () => {
    await renderMap();

    mapHandler("mousedown")({ latlng: { lat: 48.85, lng: -357.65, wrap: () => ({ lat: 48.85, lng: 2.35 }) } });
    vi.advanceTimersByTime(5000);

    expect(onPickPoint).toHaveBeenCalledWith({ latitude: 48.85, longitude: 2.35 });
  });

  it("wraps the longitude of a dragged point marker dropped on a repeated copy of the world", async () => {
    await renderMap({ pickedPoint: { latitude: 48.85, longitude: 2.35 } });

    leaflet.dragEnd?.({
      target: { getLatLng: () => ({ lat: 48.9, lng: 362.4, wrap: () => ({ lat: 48.9, lng: 2.4 }) }) },
    });

    expect(onPickPoint).toHaveBeenCalledWith({ latitude: 48.9, longitude: 2.4 });
  });

  it("picks the pressed point only once the press has lasted long enough", async () => {
    await renderMap();

    mapHandler("mousedown")(PRESSED);
    vi.advanceTimersByTime(100);
    expect(onPickPoint).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2000);

    expect(onPickPoint).toHaveBeenCalledTimes(1);
    expect(onPickPoint).toHaveBeenCalledWith({ latitude: 48.85, longitude: 2.35 });
  });

  it("does not pick the point twice when the context menu comes before the timer of the same press", async () => {
    await renderMap();

    mapHandler("mousedown")(PRESSED);
    mapHandler("contextmenu")(PRESSED);
    vi.advanceTimersByTime(5000);

    expect(onPickPoint).toHaveBeenCalledTimes(1);
  });

  it("does not pick the point twice when the context menu comes after the timer of the same press", async () => {
    await renderMap();

    mapHandler("mousedown")(PRESSED);
    vi.advanceTimersByTime(5000);
    expect(onPickPoint).toHaveBeenCalledTimes(1);
    mapHandler("contextmenu")(PRESSED);

    expect(onPickPoint).toHaveBeenCalledTimes(1);
  });

  it("picks a context menu opened after the press has been released", async () => {
    await renderMap();

    mapHandler("mousedown")(PRESSED);
    vi.advanceTimersByTime(5000);
    mapHandler("mouseup")();
    mapHandler("contextmenu")(pressedAt(45.76, 4.83));

    expect(onPickPoint).toHaveBeenCalledTimes(2);
    expect(onPickPoint).toHaveBeenLastCalledWith({ latitude: 45.76, longitude: 4.83 });
  });

  it("picks the context menu of a new press after the timer picked the previous one", async () => {
    await renderMap();

    mapHandler("mousedown")(PRESSED);
    vi.advanceTimersByTime(5000);
    mapHandler("mousedown")(pressedAt(45.76, 4.83));
    mapHandler("contextmenu")(pressedAt(45.76, 4.83));

    expect(onPickPoint).toHaveBeenCalledTimes(2);
    expect(onPickPoint).toHaveBeenLastCalledWith({ latitude: 45.76, longitude: 4.83 });
  });

  it.each(["mouseup", "movestart", "dragstart", "zoomstart"])("does not pick a point when %s ends the press early", async (eventName) => {
    await renderMap();

    mapHandler("mousedown")(PRESSED);
    mapHandler(eventName)();
    vi.advanceTimersByTime(5000);

    expect(onPickPoint).not.toHaveBeenCalled();
  });

  it("restarts the timer on a new press and picks the latest point", async () => {
    await renderMap();

    mapHandler("mousedown")(PRESSED);
    mapHandler("mousedown")(pressedAt(45.76, 4.83));
    vi.advanceTimersByTime(5000);

    expect(onPickPoint).toHaveBeenCalledTimes(1);
    expect(onPickPoint).toHaveBeenCalledWith({ latitude: 45.76, longitude: 4.83 });
  });

  it("stops listening and drops a pending press on unmount", async () => {
    const { unmount } = await renderMap();
    mapHandler("mousedown")(PRESSED);

    unmount();
    vi.advanceTimersByTime(5000);

    expect(onPickPoint).not.toHaveBeenCalled();
    ["mousedown", "mouseup", "contextmenu", "movestart", "dragstart", "zoomstart"].forEach((eventName) => {
      expect(leaflet.fakeMap.off).toHaveBeenCalledWith(eventName, mapHandler(eventName));
    });
  });

  it("shows no point marker until a point is picked, only the venue markers", async () => {
    await renderMap({ venues: buildVenues(2) });

    expect(screen.getAllByTestId("marker")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Point choisi pour le nouveau lieu" })).not.toBeInTheDocument();
  });

  it("AC1 shows a draggable marker at the picked point next to the venue markers", async () => {
    await renderMap({ venues: buildVenues(2), pickedPoint: { latitude: 48.85, longitude: 2.35 } });

    expect(screen.getAllByTestId("marker")).toHaveLength(3);
    const marker = screen.getByRole("button", { name: "Point choisi pour le nouveau lieu" });
    expect(marker).toHaveAttribute("data-position", "48.85,2.35");
    expect(marker).toHaveAttribute("data-draggable", "true");
    expect(screen.getAllByTestId("marker")[0]).toHaveAttribute("data-draggable", "false");
  });

  it("AC1 hands the dropped position to onPickPoint when the point marker is dragged", async () => {
    await renderMap({ pickedPoint: { latitude: 48.85, longitude: 2.35 } });

    leaflet.dragEnd?.({ target: { getLatLng: () => pressedAt(48.9, 2.4).latlng } });

    expect(onPickPoint).toHaveBeenCalledTimes(1);
    expect(onPickPoint).toHaveBeenCalledWith({ latitude: 48.9, longitude: 2.4 });
  });

  it("places the point on a simple tap of the map while the choose-a-venue mode is active", async () => {
    await renderMap({ isPickingPoint: true });

    mapHandler("click")({ latlng: { lat: 48.85, lng: 362.35, wrap: () => ({ lat: 48.85, lng: 2.35 }) } });

    expect(onPickPoint).toHaveBeenCalledTimes(1);
    expect(onPickPoint).toHaveBeenCalledWith({ latitude: 48.85, longitude: 2.35 });
  });

  it("ignores a tap of the map outside the choose-a-venue mode", async () => {
    await renderMap({ isPickingPoint: false });

    expect(leaflet.fakeMap.on).not.toHaveBeenCalledWith("click", expect.any(Function));
    expect(onPickPoint).not.toHaveBeenCalled();
  });

  it("stops listening to taps when the choose-a-venue mode ends", async () => {
    const { rerender } = await renderMap({ isPickingPoint: true });
    const clickHandler = mapHandler("click");

    rerender(
      <VenueMap
        venues={[]}
        userPosition={null}
        focusedPosition={null}
        onBoundsChange={onBoundsChange}
        onTilesUnavailable={onTilesUnavailable}
        onSelectVenue={onSelectVenue}
        pickedPoint={null}
        isPickingPoint={false}
        onPickPoint={onPickPoint}
      />,
    );

    expect(leaflet.fakeMap.off).toHaveBeenCalledWith("click", clickHandler);
  });

  it("places nothing when the finger drags the map instead of tapping it", async () => {
    await renderMap({ isPickingPoint: true });

    mapHandler("mousedown")(PRESSED);
    mapHandler("dragstart")();
    mapHandler("mouseup")();
    vi.advanceTimersByTime(5000);

    expect(onPickPoint).not.toHaveBeenCalled();
  });

  it("keeps the venue marker selection working while a point is picked", async () => {
    const venues = buildVenues(2);
    await renderMap({ venues, pickedPoint: { latitude: 48.85, longitude: 2.35 } });

    screen.getAllByTestId("marker")[0].click();

    expect(onSelectVenue).toHaveBeenCalledWith(venues[0]);
    expect(onPickPoint).not.toHaveBeenCalled();
  });
});
