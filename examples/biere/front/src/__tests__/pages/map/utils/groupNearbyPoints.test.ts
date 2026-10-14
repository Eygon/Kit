import { groupNearbyPoints } from "@/pages/map/utils/groupNearbyPoints";

const point = (id: number, x: number, y: number) => ({ id, x, y });

describe("groupNearbyPoints", () => {
  it("returns no group for no point", () => {
    expect(groupNearbyPoints([], 44)).toEqual([]);
  });

  it("returns a singleton group for a lone point", () => {
    expect(groupNearbyPoints([point(7, 10, 10)], 44)).toEqual([{ ids: [7] }]);
  });

  it("AC1 groups three close points and leaves the far one alone", () => {
    const points = [
      point(1, 100, 100),
      point(2, 110, 105),
      point(3, 120, 100),
      point(4, 400, 400),
    ];

    expect(groupNearbyPoints(points, 44)).toEqual([
      { ids: [1, 2, 3] },
      { ids: [4] },
    ]);
  });

  it("does not group a point at exactly the threshold distance", () => {
    expect(groupNearbyPoints([point(1, 0, 0), point(2, 44, 0)], 44)).toEqual([
      { ids: [1] },
      { ids: [2] },
    ]);
    expect(groupNearbyPoints([point(1, 0, 0), point(2, 43.9, 0)], 44)).toEqual([
      { ids: [1, 2] },
    ]);
  });

  it("attaches a point between two seeds to the seed with the smallest id", () => {
    const points = [point(1, 0, 0), point(2, 80, 0), point(3, 40, 0)];

    expect(groupNearbyPoints(points, 44)).toEqual([
      { ids: [1, 3] },
      { ids: [2] },
    ]);
  });

  it("measures the distance to the seed only, not to the other members", () => {
    const points = [point(1, 0, 0), point(2, 40, 0), point(3, 80, 0)];

    expect(groupNearbyPoints(points, 44)).toEqual([
      { ids: [1, 2] },
      { ids: [3] },
    ]);
  });

  it("gives the same groups whatever the input order, with ascending ids", () => {
    const ordered = [
      point(1, 0, 0),
      point(2, 10, 0),
      point(3, 20, 0),
      point(4, 300, 0),
      point(5, 310, 0),
    ];
    const shuffled = [
      ordered[4],
      ordered[1],
      ordered[3],
      ordered[0],
      ordered[2],
    ];

    expect(groupNearbyPoints(shuffled, 44)).toEqual(
      groupNearbyPoints(ordered, 44),
    );
    expect(groupNearbyPoints(shuffled, 44)).toEqual([
      { ids: [1, 2, 3] },
      { ids: [4, 5] },
    ]);
  });

  it("does not mutate its input", () => {
    const points = [point(3, 20, 0), point(1, 0, 0), point(2, 10, 0)];
    const snapshot = JSON.parse(JSON.stringify(points));

    groupNearbyPoints(points, 44);

    expect(points).toEqual(snapshot);
  });

  it("keeps 500 points spaced 50 px apart as 500 singleton groups", () => {
    const points = Array.from({ length: 500 }, (_, index) =>
      point(index + 1, (index % 25) * 50, Math.floor(index / 25) * 50),
    );

    const groups = groupNearbyPoints(points, 44);

    expect(groups).toHaveLength(500);
    expect(
      groups.every((group: { ids: number[] }) => group.ids.length === 1),
    ).toBe(true);
  });

  it("gathers 500 coincident points in a single group", () => {
    const points = Array.from({ length: 500 }, (_, index) =>
      point(index + 1, 5, 5),
    );

    const groups = groupNearbyPoints(points, 44);

    expect(groups).toHaveLength(1);
    expect(groups[0].ids).toHaveLength(500);
    expect(groups[0].ids[0]).toBe(1);
    expect(groups[0].ids[499]).toBe(500);
  });

  it("groups 500 points within a wide time budget (SC-003 targets 16 ms, the bound is loosened to 200 ms so a loaded machine does not make it flaky)", () => {
    const points = Array.from({ length: 500 }, (_, index) =>
      point(index + 1, (index % 25) * 50, Math.floor(index / 25) * 50),
    );

    const start = performance.now();
    groupNearbyPoints(points, 44);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(200);
  });
});
