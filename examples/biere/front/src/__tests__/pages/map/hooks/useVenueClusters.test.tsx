import { act, renderHook } from "@testing-library/react";
import type { Map as LeafletMap } from "leaflet";
import { useVenueClusters } from "@/pages/map/hooks/useVenueClusters";
import type { Venue } from "@/types/models/venue/venue";
import { AvailabilityStatusEnum } from "@/types/enums/venue/availabilityStatusEnum";
import { VenueTypeEnum } from "@/types/enums/venue/venueTypeEnum";

const PIXELS_PER_DEGREE = 1000;

const buildVenue = (
  id: number,
  latitude: number,
  longitude: number,
): Venue => ({
  id,
  name: `Lieu ${id}`,
  type: VenueTypeEnum.BAR,
  city: "Paris",
  address: "",
  latitude,
  longitude,
  description: "",
  distanceKm: null,
  status: AvailabilityStatusEnum.CONFIRMED,
});

const CLOSE_VENUES = [
  buildVenue(1, 48.8, 2.3),
  buildVenue(2, 48.8, 2.31),
  buildVenue(3, 48.801, 2.3),
];
const FAR_VENUE = buildVenue(4, 48.9, 2.5);

const buildFakeMap = (zoom: number) => {
  const state = { zoom };
  const fakeMap = {
    on: vi.fn(),
    off: vi.fn(),
    getZoom: vi.fn(() => state.zoom),
    project: vi.fn(([latitude, longitude]: [number, number]) => ({
      x: longitude * PIXELS_PER_DEGREE,
      y: latitude * PIXELS_PER_DEGREE,
    })),
  };
  return { state, fakeMap, map: fakeMap as unknown as LeafletMap };
};

describe("useVenueClusters", () => {
  it("gives one cluster per venue while the map does not exist", () => {
    const venues = [...CLOSE_VENUES, FAR_VENUE];

    const { result } = renderHook(() => useVenueClusters(null, venues));

    expect(
      result.current.map((cluster: { key: string }) => cluster.key),
    ).toEqual(["venue-1", "venue-2", "venue-3", "venue-4"]);
  });

  it("gives one cluster per venue at the maximum cluster zoom", () => {
    const { map, fakeMap } = buildFakeMap(16);
    const venues = [...CLOSE_VENUES, FAR_VENUE];

    const { result } = renderHook(() => useVenueClusters(map, venues));

    expect(result.current).toHaveLength(4);
    expect(result.current[0]).toEqual({
      key: "venue-1",
      venues: [CLOSE_VENUES[0]],
      latitude: 48.8,
      longitude: 2.3,
    });
    expect(fakeMap.project).not.toHaveBeenCalled();
  });

  it("AC1 groups the venues closer than 44 px below the maximum zoom and keeps the far one alone", () => {
    const { map, fakeMap } = buildFakeMap(12);
    const venues = [...CLOSE_VENUES, FAR_VENUE];

    const { result } = renderHook(() => useVenueClusters(map, venues));

    expect(result.current).toHaveLength(2);
    expect(result.current[0].key).toBe("cluster-1-2-3");
    expect(result.current[0].venues).toEqual(CLOSE_VENUES);
    expect(result.current[1].key).toBe("venue-4");
    expect(result.current[1].venues).toEqual([FAR_VENUE]);
    expect(fakeMap.project).toHaveBeenCalledWith([48.8, 2.3], 12);
  });

  it("places a cluster at the mean latitude and longitude of its venues", () => {
    const { map } = buildFakeMap(12);

    const { result } = renderHook(() => useVenueClusters(map, CLOSE_VENUES));

    expect(result.current[0].latitude).toBeCloseTo(
      (48.8 + 48.8 + 48.801) / 3,
      10,
    );
    expect(result.current[0].longitude).toBeCloseTo((2.3 + 2.31 + 2.3) / 3, 10);
  });

  it("AC8 reads the zoom again on zoomend and regroups for the new zoom", () => {
    const { map, fakeMap, state } = buildFakeMap(12);

    const { result } = renderHook(() => useVenueClusters(map, CLOSE_VENUES));
    expect(result.current).toHaveLength(1);

    const zoomEnd = fakeMap.on.mock.calls.find(
      ([name]) => name === "zoomend",
    )?.[1] as () => void;
    state.zoom = 16;
    act(() => zoomEnd());

    expect(result.current).toHaveLength(3);
    expect(fakeMap.on.mock.calls.some(([name]) => name === "moveend")).toBe(
      false,
    );
  });

  it("AC8 keeps the same groups when the map is only dragged", () => {
    const { map, fakeMap } = buildFakeMap(12);

    const { result } = renderHook(() => useVenueClusters(map, CLOSE_VENUES));
    const before = result.current;

    expect(fakeMap.on.mock.calls.map(([name]) => name)).toEqual(["zoomend"]);
    expect(result.current).toBe(before);
  });

  it("AC7 recomputes the groups when the venue list changes", () => {
    const { map } = buildFakeMap(12);

    const { result, rerender } = renderHook(
      ({ venues }: { venues: Venue[] }) => useVenueClusters(map, venues),
      {
        initialProps: { venues: CLOSE_VENUES },
      },
    );
    expect(result.current[0].key).toBe("cluster-1-2-3");

    rerender({ venues: [CLOSE_VENUES[0], CLOSE_VENUES[2]] });
    expect(result.current[0].key).toBe("cluster-1-3");

    rerender({ venues: [CLOSE_VENUES[0]] });
    expect(
      result.current.map((cluster: { key: string }) => cluster.key),
    ).toEqual(["venue-1"]);
  });

  it("keeps the same result reference, without projecting again, when it renders with the same venues array", () => {
    const { map, fakeMap } = buildFakeMap(12);

    const { result, rerender } = renderHook(() =>
      useVenueClusters(map, CLOSE_VENUES),
    );
    const before = result.current;
    const projectCalls = fakeMap.project.mock.calls.length;
    rerender();

    expect(result.current).toBe(before);
    expect(fakeMap.project.mock.calls.length).toBe(projectCalls);
  });

  it("AC11 gives no cluster for no venue and the lone venue marker for one venue", () => {
    const { map } = buildFakeMap(12);

    const empty = renderHook(() => useVenueClusters(map, []));
    const single = renderHook(() => useVenueClusters(map, [FAR_VENUE]));

    expect(empty.result.current).toEqual([]);
    expect(single.result.current).toEqual([
      { key: "venue-4", venues: [FAR_VENUE], latitude: 48.9, longitude: 2.5 },
    ]);
  });

  it("stops listening to zoomend on unmount and when the map changes", () => {
    const first = buildFakeMap(12);
    const second = buildFakeMap(12);

    const { rerender, unmount } = renderHook(
      ({ map }: { map: LeafletMap }) => useVenueClusters(map, CLOSE_VENUES),
      {
        initialProps: { map: first.map },
      },
    );
    const firstHandler = first.fakeMap.on.mock.calls.find(
      ([name]) => name === "zoomend",
    )?.[1];

    rerender({ map: second.map });
    expect(first.fakeMap.off).toHaveBeenCalledWith("zoomend", firstHandler);
    const secondHandler = second.fakeMap.on.mock.calls.find(
      ([name]) => name === "zoomend",
    )?.[1];

    unmount();
    expect(second.fakeMap.off).toHaveBeenCalledWith("zoomend", secondHandler);
  });
});
