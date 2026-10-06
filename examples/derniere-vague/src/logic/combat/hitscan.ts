import { GAME_CONFIG } from "@/config/gameConfig";
import { HEAD_HEIGHT_M, HITSCAN_EPSILON, KNIFE } from "@/config/weaponConfig";
import type { StationLayout, Vec2 } from "@/logic/map/stationLayout";

export type HitTarget = {
  readonly id: number;
  readonly x: number;
  readonly z: number;
  readonly radiusM: number;
  readonly heightM: number;
};

export type ShotHit = { targetId: number; head: boolean };

const KNIFE_HALF_ARC_COS = Math.cos(KNIFE.ARC_RAD / 2);

const isBlockedByWall = (layout: StationLayout, origin: Readonly<Vec2>, dirX: number, dirZ: number, distanceM: number): boolean => {
  for (const segment of layout.segments) {
    const edgeX = segment.bx - segment.ax;
    const edgeZ = segment.bz - segment.az;
    const denominator = dirX * edgeZ - dirZ * edgeX;
    if (Math.abs(denominator) < HITSCAN_EPSILON) continue;
    const offsetX = segment.ax - origin.x;
    const offsetZ = segment.az - origin.z;
    const along = (offsetX * edgeZ - offsetZ * edgeX) / denominator;
    const onSegment = (offsetX * dirZ - offsetZ * dirX) / denominator;
    if (along >= 0 && along < distanceM && onSegment >= 0 && onSegment <= 1) return true;
  }
  return false;
};

export const resolveShot = (
  origin: Readonly<Vec2>,
  yaw: number,
  pitch: number,
  targets: readonly HitTarget[],
  rangeM: number,
  assistRad: number,
  out: ShotHit,
  layout: StationLayout,
): ShotHit | null => {
  const dirX = -Math.sin(yaw);
  const dirZ = -Math.cos(yaw);
  const cosPitch = Math.max(Math.cos(pitch), HITSCAN_EPSILON);
  const tanPitch = Math.tan(pitch);
  const tanAssist = Math.tan(assistRad);
  let nearestAlong = Infinity;
  let found = false;
  for (const target of targets) {
    const offsetX = target.x - origin.x;
    const offsetZ = target.z - origin.z;
    const along = offsetX * dirX + offsetZ * dirZ;
    if (along <= 0 || along >= nearestAlong || along / cosPitch > rangeM) continue;
    const slack = along * tanAssist;
    if (Math.abs(offsetX * dirZ - offsetZ * dirX) > target.radiusM + slack) continue;
    const aimHeight = GAME_CONFIG.PLAYER_EYE_HEIGHT_M + along * tanPitch;
    if (aimHeight < -slack || aimHeight > target.heightM + slack) continue;
    if (isBlockedByWall(layout, origin, dirX, dirZ, along)) continue;
    nearestAlong = along;
    found = true;
    out.targetId = target.id;
    out.head = aimHeight > HEAD_HEIGHT_M;
  }
  return found ? out : null;
};

export const resolveKnife = (origin: Readonly<Vec2>, yaw: number, targets: readonly HitTarget[], rangeM: number, layout: StationLayout): number | null => {
  const dirX = -Math.sin(yaw);
  const dirZ = -Math.cos(yaw);
  let nearestDistance = Infinity;
  let nearestId: number | null = null;
  for (const target of targets) {
    const offsetX = target.x - origin.x;
    const offsetZ = target.z - origin.z;
    const distance = Math.hypot(offsetX, offsetZ);
    if (distance >= nearestDistance || distance - target.radiusM > rangeM) continue;
    const facing = distance > HITSCAN_EPSILON ? (offsetX * dirX + offsetZ * dirZ) / distance : 1;
    if (facing < KNIFE_HALF_ARC_COS) continue;
    if (distance > HITSCAN_EPSILON && isBlockedByWall(layout, origin, offsetX / distance, offsetZ / distance, distance)) continue;
    nearestDistance = distance;
    nearestId = target.id;
  }
  return nearestId;
};
