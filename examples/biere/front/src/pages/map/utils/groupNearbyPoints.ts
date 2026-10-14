import type { PointGroup } from "@/pages/map/types/pointGroup";
import type { ProjectedPoint } from "@/pages/map/types/projectedPoint";

export const groupNearbyPoints = (
  points: readonly ProjectedPoint[],
  thresholdPx: number,
): PointGroup[] => {
  const sortedPoints = [...points].sort(
    (first, second) => first.id - second.id,
  );
  const takenIds = new Set<number>();
  const groups: PointGroup[] = [];

  sortedPoints.forEach((seed) => {
    if (takenIds.has(seed.id)) return;
    const ids = sortedPoints
      .filter(
        (candidate) =>
          !takenIds.has(candidate.id) &&
          (candidate.id === seed.id ||
            Math.hypot(candidate.x - seed.x, candidate.y - seed.y) <
              thresholdPx),
      )
      .map((candidate) => candidate.id);
    ids.forEach((id) => takenIds.add(id));
    groups.push({ ids });
  });

  return groups;
};
