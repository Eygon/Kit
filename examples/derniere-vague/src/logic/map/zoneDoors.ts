import { DOOR_OPEN_S, ZONE_IDS } from "@/config/mapConfig";
import type { ZoneId } from "@/config/mapConfig";
import type { GameEvent } from "@/logic/game/gameEvents";
import { openZone } from "@/logic/map/stationLayout";
import type { StationLayout } from "@/logic/map/stationLayout";

export type ZoneDoorState = { kind: "closed" } | { kind: "opening"; remainingS: number } | { kind: "open" };

export type ZoneDoors = Record<ZoneId, ZoneDoorState>;

export const createZoneDoors = (): ZoneDoors => ({ north: { kind: "closed" }, east: { kind: "closed" }, west: { kind: "closed" } });

export const startOpening = (doors: ZoneDoors, zoneId: ZoneId, events: GameEvent[]): void => {
  if (doors[zoneId].kind !== "closed") return;
  doors[zoneId] = { kind: "opening", remainingS: DOOR_OPEN_S };
  events.push({ kind: "doorOpening", zoneId });
};

export const updateZoneDoors = (doors: ZoneDoors, layout: StationLayout, stepS: number, events: GameEvent[]): void => {
  for (const zoneId of ZONE_IDS) {
    const door = doors[zoneId];
    if (door.kind !== "opening") continue;
    door.remainingS -= stepS;
    if (door.remainingS > 0) continue;
    openZone(layout, zoneId);
    doors[zoneId] = { kind: "open" };
    events.push({ kind: "doorOpened", zoneId });
  }
};

export const doorProgress = (doors: ZoneDoors, zoneId: ZoneId): number => {
  const door = doors[zoneId];
  if (door.kind === "closed") return 0;
  if (door.kind === "open") return 1;
  return 1 - door.remainingS / DOOR_OPEN_S;
};
