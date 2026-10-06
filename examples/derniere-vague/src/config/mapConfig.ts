import type { WeaponId } from "@/config/weaponConfig";

export type ZoneId = "north" | "east" | "west";

export type WallSpec = {
  readonly ax: number;
  readonly az: number;
  readonly bx: number;
  readonly bz: number;
};

export type EntranceSpec = WallSpec & { readonly zoneId: ZoneId };

export type WindowSpec = {
  readonly id: string;
  readonly x: number;
  readonly z: number;
  readonly facing: number;
};

export type DoorKind = "debris" | "door";

export type ZoneSpec = {
  readonly DOOR_COST_POINTS: number;
  readonly DOOR_KIND: DoorKind;
  readonly WALLS: readonly WallSpec[];
  readonly WINDOWS: readonly WindowSpec[];
};

export type WallBuySpec = {
  readonly id: string;
  readonly weaponId: WeaponId;
  readonly x: number;
  readonly z: number;
  readonly facing: number;
};

export const WALL_BUYS: readonly WallBuySpec[] = [
  { id: "wall-smg", weaponId: "smg", x: -6.5, z: -5.7, facing: 0 },
  { id: "wall-carbine", weaponId: "carbine", x: 6.5, z: -5.7, facing: 0 },
  { id: "wall-shotgun", weaponId: "shotgun", x: 0, z: 5.7, facing: Math.PI },
];

export const ZONE_IDS: readonly ZoneId[] = ["north", "east", "west"];

export const DOOR_OPEN_S = 1;

export const ZONES: Readonly<Record<ZoneId, ZoneSpec>> = {
  north: {
    DOOR_COST_POINTS: 750,
    DOOR_KIND: "debris",
    WALLS: [
      { ax: -4, az: -6, bx: -4, bz: -12 },
      { ax: -4, az: -12, bx: 4, bz: -12 },
      { ax: 4, az: -12, bx: 4, bz: -6 },
    ],
    WINDOWS: [
      { id: "north-zone-left", x: -2, z: -13, facing: 0 },
      { id: "north-zone-right", x: 2, z: -13, facing: 0 },
    ],
  },
  east: {
    DOOR_COST_POINTS: 1000,
    DOOR_KIND: "door",
    WALLS: [
      { ax: 8, az: -3, bx: 14, bz: -3 },
      { ax: 14, az: -3, bx: 14, bz: 3 },
      { ax: 14, az: 3, bx: 8, bz: 3 },
    ],
    WINDOWS: [
      { id: "east-zone-near", x: 15, z: -1.5, facing: -Math.PI / 2 },
      { id: "east-zone-far", x: 15, z: 1.5, facing: -Math.PI / 2 },
    ],
  },
  west: {
    DOOR_COST_POINTS: 1250,
    DOOR_KIND: "debris",
    WALLS: [
      { ax: -8, az: -3, bx: -14, bz: -3 },
      { ax: -14, az: -3, bx: -14, bz: 3 },
      { ax: -14, az: 3, bx: -8, bz: 3 },
    ],
    WINDOWS: [
      { id: "west-zone-near", x: -15, z: -1.5, facing: Math.PI / 2 },
      { id: "west-zone-far", x: -15, z: 1.5, facing: Math.PI / 2 },
    ],
  },
};

export const INTERACT_RADIUS_M = 1.5;

export const BARRICADE = {
  PLANKS_PER_WINDOW: 6,
  TEAR_INTERVAL_S: 1.2,
  REPAIR_INTERVAL_S: 0.75,
} as const;

export const STATION_LAYOUT = {
  HALF_WIDTH_M: 8,
  HALF_DEPTH_M: 6,
  WALL_HEIGHT_M: 3.2,
  WALL_THICKNESS_M: 0.3,
  PLAYER_START: { x: 0, z: 2.5 },
  WALLS: [
    { ax: -8, az: -6, bx: -1.2, bz: -6 },
    { ax: 1.2, az: -6, bx: 8, bz: -6 },
    { ax: -8, az: 6, bx: 8, bz: 6 },
    { ax: 8, az: -6, bx: 8, bz: -1.2 },
    { ax: 8, az: 1.2, bx: 8, bz: 6 },
    { ax: -8, az: -6, bx: -8, bz: -1.2 },
    { ax: -8, az: 1.2, bx: -8, bz: 6 },
  ] satisfies readonly WallSpec[],
  ENTRANCES: [
    { zoneId: "north", ax: -1.2, az: -6, bx: 1.2, bz: -6 },
    { zoneId: "east", ax: 8, az: -1.2, bx: 8, bz: 1.2 },
    { zoneId: "west", ax: -8, az: -1.2, bx: -8, bz: 1.2 },
  ] satisfies readonly EntranceSpec[],
  WINDOWS: [
    { id: "north-left", x: -5, z: -7, facing: 0 },
    { id: "north-right", x: 5, z: -7, facing: 0 },
    { id: "south-left", x: -4, z: 7, facing: Math.PI },
    { id: "south-right", x: 4, z: 7, facing: Math.PI },
    { id: "east-near", x: 9, z: -4, facing: -Math.PI / 2 },
    { id: "east-far", x: 9, z: 4, facing: -Math.PI / 2 },
    { id: "west-near", x: -9, z: -4, facing: Math.PI / 2 },
    { id: "west-far", x: -9, z: 4, facing: Math.PI / 2 },
  ] satisfies readonly WindowSpec[],
  WINDOW_SPAWN_OUTSET_M: 1,
  LAMPS: [
    { x: -4, y: 2.9, z: -2 },
    { x: 4, y: 2.9, z: -2 },
    { x: 0, y: 2.9, z: 3 },
  ],
} as const;

export const MOVEMENT_CONFIG = {
  SUBSTEP_RATIO: 0.5,
  PUSH_PASSES: 3,
  MIN_DISTANCE_M: 1e-9,
} as const;
