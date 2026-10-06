import { MOVEMENT_CONFIG, STATION_LAYOUT, ZONES, ZONE_IDS } from "@/config/mapConfig";
import type { ZoneId } from "@/config/mapConfig";

export type Vec2 = { x: number; z: number };

export type WallSegment = {
  readonly ax: number;
  readonly az: number;
  readonly bx: number;
  readonly bz: number;
  readonly zoneId: ZoneId | null;
};

export type SpawnPoint = {
  readonly id: string;
  readonly x: number;
  readonly z: number;
  readonly facing: number;
};

export type LayoutWindow = SpawnPoint & { readonly zoneId: ZoneId | null };

export type StationLayout = {
  readonly segments: WallSegment[];
  readonly entrances: readonly WallSegment[];
  readonly windows: readonly LayoutWindow[];
  readonly spawnPoints: SpawnPoint[];
  readonly playerStart: Readonly<Vec2>;
};

const scratchPoint: Vec2 = { x: 0, z: 0 };

export const createStationLayout = (): StationLayout => {
  const walls: WallSegment[] = STATION_LAYOUT.WALLS.map((wall) => ({ ...wall, zoneId: null }));
  const zoneWalls: WallSegment[] = ZONE_IDS.flatMap((zoneId) => ZONES[zoneId].WALLS.map((wall) => ({ ...wall, zoneId: null })));
  const entrances: WallSegment[] = STATION_LAYOUT.ENTRANCES.map((entrance) => ({ ...entrance }));
  const startWindows: LayoutWindow[] = STATION_LAYOUT.WINDOWS.map((windowSpec) => ({ ...windowSpec, zoneId: null }));
  const zoneWindows: LayoutWindow[] = ZONE_IDS.flatMap((zoneId) => ZONES[zoneId].WINDOWS.map((windowSpec) => ({ ...windowSpec, zoneId })));
  return {
    segments: [...walls, ...zoneWalls, ...entrances],
    entrances,
    windows: [...startWindows, ...zoneWindows],
    spawnPoints: [...startWindows],
    playerStart: { x: STATION_LAYOUT.PLAYER_START.x, z: STATION_LAYOUT.PLAYER_START.z },
  };
};

export const openZone = (layout: StationLayout, zoneId: ZoneId): void => {
  const entrance = layout.entrances.find((candidate) => candidate.zoneId === zoneId);
  const segmentIndex = entrance ? layout.segments.indexOf(entrance) : -1;
  if (segmentIndex >= 0) layout.segments.splice(segmentIndex, 1);
  for (const zoneWindow of layout.windows) {
    if (zoneWindow.zoneId === zoneId && !layout.spawnPoints.includes(zoneWindow)) layout.spawnPoints.push(zoneWindow);
  }
};

const pushOutOfSegment = (segment: WallSegment, point: Vec2, radiusM: number): boolean => {
  const dx = segment.bx - segment.ax;
  const dz = segment.bz - segment.az;
  const lengthSq = dx * dx + dz * dz;
  const along = lengthSq > 0 ? ((point.x - segment.ax) * dx + (point.z - segment.az) * dz) / lengthSq : 0;
  const t = Math.min(1, Math.max(0, along));
  const offsetX = point.x - (segment.ax + t * dx);
  const offsetZ = point.z - (segment.az + t * dz);
  const distanceSq = offsetX * offsetX + offsetZ * offsetZ;
  if (distanceSq >= radiusM * radiusM) return false;
  const distance = Math.sqrt(distanceSq);
  if (distance > MOVEMENT_CONFIG.MIN_DISTANCE_M) {
    const scale = (radiusM - distance) / distance;
    point.x += offsetX * scale;
    point.z += offsetZ * scale;
    return true;
  }
  const length = Math.sqrt(lengthSq) || 1;
  point.x += (-dz / length) * radiusM;
  point.z += (dx / length) * radiusM;
  return true;
};

export const resolveMovement = (layout: StationLayout, from: Readonly<Vec2>, delta: Readonly<Vec2>, radiusM: number, out: Vec2): void => {
  const length = Math.hypot(delta.x, delta.z);
  const steps = Math.max(1, Math.ceil(length / (radiusM * MOVEMENT_CONFIG.SUBSTEP_RATIO)));
  const stepX = delta.x / steps;
  const stepZ = delta.z / steps;
  scratchPoint.x = from.x;
  scratchPoint.z = from.z;
  for (let step = 0; step < steps; step++) {
    scratchPoint.x += stepX;
    scratchPoint.z += stepZ;
    for (let pass = 0; pass < MOVEMENT_CONFIG.PUSH_PASSES; pass++) {
      let pushed = false;
      for (const segment of layout.segments) {
        if (pushOutOfSegment(segment, scratchPoint, radiusM)) pushed = true;
      }
      if (!pushed) break;
    }
  }
  out.x = scratchPoint.x;
  out.z = scratchPoint.z;
};
