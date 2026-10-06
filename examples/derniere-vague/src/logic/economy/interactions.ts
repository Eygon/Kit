import { BOX_COST_POINTS, BOX_SPOTS } from "@/config/boxConfig";
import { BARRICADE, INTERACT_RADIUS_M, STATION_LAYOUT, WALL_BUYS, ZONES } from "@/config/mapConfig";
import type { WallBuySpec, ZoneId } from "@/config/mapConfig";
import { WEAPONS } from "@/config/weaponConfig";
import type { WeaponId } from "@/config/weaponConfig";
import { openBox, takeOffer } from "@/logic/economy/mysteryBox";
import type { MysteryBox } from "@/logic/economy/mysteryBox";
import { trySpend } from "@/logic/economy/pointsLedger";
import type { PointsLedger } from "@/logic/economy/pointsLedger";
import type { GameEvent } from "@/logic/game/gameEvents";
import type { InputState } from "@/logic/input/inputState";
import { planksOf, repairStep } from "@/logic/map/barricades";
import type { Barricades } from "@/logic/map/barricades";
import type { SpawnPoint, StationLayout, Vec2 } from "@/logic/map/stationLayout";
import { startOpening } from "@/logic/map/zoneDoors";
import type { ZoneDoors } from "@/logic/map/zoneDoors";
import { giveWeapon, needsAmmo, refillAmmo } from "@/logic/weapons/loadout";
import type { Loadout } from "@/logic/weapons/loadout";

export type WeaponPrompt = {
  kind: "buyWeapon" | "buyAmmo";
  weaponId: WeaponId;
  costPoints: number;
  affordable: boolean;
};

export type DoorPrompt = {
  kind: "openDoor";
  zoneId: ZoneId;
  costPoints: number;
  affordable: boolean;
};

export type RepairPrompt = {
  kind: "repair";
  windowId: string;
  costPoints: number;
  affordable: boolean;
};

export type BoxPrompt = {
  kind: "box";
  costPoints: number;
  affordable: boolean;
};

export type TakeWeaponPrompt = {
  kind: "takeWeapon";
  weaponId: WeaponId;
  costPoints: number;
  affordable: boolean;
};

export type InteractionPrompt = WeaponPrompt | DoorPrompt | RepairPrompt | BoxPrompt | TakeWeaponPrompt;

export type Interactions = {
  prompt: InteractionPrompt | null;
  readonly weaponPrompt: WeaponPrompt;
  readonly doorPrompt: DoorPrompt;
  readonly repairPrompt: RepairPrompt;
  readonly boxPrompt: BoxPrompt;
  readonly takeWeaponPrompt: TakeWeaponPrompt;
  interactHeld: boolean;
};

export const createInteractions = (): Interactions => ({
  prompt: null,
  weaponPrompt: { kind: "buyWeapon", weaponId: "pistol", costPoints: 0, affordable: false },
  doorPrompt: { kind: "openDoor", zoneId: "east", costPoints: 0, affordable: false },
  repairPrompt: { kind: "repair", windowId: "", costPoints: 0, affordable: true },
  boxPrompt: { kind: "box", costPoints: BOX_COST_POINTS, affordable: false },
  takeWeaponPrompt: { kind: "takeWeapon", weaponId: "pistol", costPoints: 0, affordable: true },
  interactHeld: false,
});

type DoorPoint = { readonly id: string; readonly zoneId: ZoneId; readonly x: number; readonly z: number };

const DOOR_POINTS: readonly DoorPoint[] = STATION_LAYOUT.ENTRANCES.map((entrance) => ({
  id: `door-${entrance.zoneId}`,
  zoneId: entrance.zoneId,
  x: (entrance.ax + entrance.bx) / 2,
  z: (entrance.az + entrance.bz) / 2,
}));

const distanceTo = (point: Readonly<Vec2>, player: Readonly<Vec2>): number => Math.hypot(point.x - player.x, point.z - player.z);

const isOwned = (loadout: Loadout, weaponId: WeaponId): boolean => loadout.slots[0].weaponId === weaponId || loadout.slots[1]?.weaponId === weaponId;

const findNearest = (player: Readonly<Vec2>): WallBuySpec | null => {
  let nearest: WallBuySpec | null = null;
  let nearestDistanceM = INTERACT_RADIUS_M;
  for (const buy of WALL_BUYS) {
    const distanceM = Math.hypot(buy.x - player.x, buy.z - player.z);
    if (distanceM > nearestDistanceM) continue;
    nearestDistanceM = distanceM;
    nearest = buy;
  }
  return nearest;
};

const findNearestDoor = (player: Readonly<Vec2>, doors: ZoneDoors): DoorPoint | null => {
  let nearest: DoorPoint | null = null;
  let nearestDistanceM = INTERACT_RADIUS_M;
  for (const door of DOOR_POINTS) {
    if (doors[door.zoneId].kind !== "closed") continue;
    const distanceM = distanceTo(door, player);
    if (distanceM > nearestDistanceM) continue;
    nearestDistanceM = distanceM;
    nearest = door;
  }
  return nearest;
};

const findNearestRepair = (player: Readonly<Vec2>, layout: StationLayout, barricades: Barricades): SpawnPoint | null => {
  let nearest: SpawnPoint | null = null;
  let nearestDistanceM = INTERACT_RADIUS_M;
  for (const point of layout.spawnPoints) {
    if (planksOf(barricades, point.id) >= BARRICADE.PLANKS_PER_WINDOW) continue;
    const distanceM = distanceTo(point, player);
    if (distanceM > nearestDistanceM) continue;
    nearestDistanceM = distanceM;
    nearest = point;
  }
  return nearest;
};

const BOX_POINT_ID = "box";

const findBoxPoint = (player: Readonly<Vec2>, box: MysteryBox): Vec2 | null => {
  if (box.state.kind !== "idle" && box.state.kind !== "offering") return null;
  const spot = BOX_SPOTS[box.spot];
  return spot && distanceTo(spot, player) <= INTERACT_RADIUS_M ? spot : null;
};

const fillPrompt = (state: Interactions, buy: WallBuySpec, loadout: Loadout, ledger: PointsLedger): void => {
  const owned = isOwned(loadout, buy.weaponId);
  const spec = WEAPONS[buy.weaponId];
  const store = state.weaponPrompt;
  store.kind = owned ? "buyAmmo" : "buyWeapon";
  store.weaponId = buy.weaponId;
  store.costPoints = owned ? spec.AMMO_PRICE_POINTS : spec.WALL_PRICE_POINTS;
  store.affordable = ledger.points >= store.costPoints;
  state.prompt = store;
};

const fillDoorPrompt = (state: Interactions, door: DoorPoint, ledger: PointsLedger): void => {
  const store = state.doorPrompt;
  store.zoneId = door.zoneId;
  store.costPoints = ZONES[door.zoneId].DOOR_COST_POINTS;
  store.affordable = ledger.points >= store.costPoints;
  state.prompt = store;
};

const fillRepairPrompt = (state: Interactions, point: SpawnPoint): void => {
  state.repairPrompt.windowId = point.id;
  state.prompt = state.repairPrompt;
};

const stepRepair = (state: Interactions, point: SpawnPoint, input: Readonly<InputState>, stepS: number, ledger: PointsLedger, barricades: Barricades, events: GameEvent[]): void => {
  fillRepairPrompt(state, point);
  if (!input.interact) return;
  repairStep(barricades, point.id, stepS, ledger, events);
  if (planksOf(barricades, point.id) >= BARRICADE.PLANKS_PER_WINDOW) state.prompt = null;
};

const fillBoxPrompt = (state: Interactions, box: MysteryBox, ledger: PointsLedger): void => {
  if (box.state.kind === "offering") {
    state.takeWeaponPrompt.weaponId = box.state.weaponId;
    state.prompt = state.takeWeaponPrompt;
    return;
  }
  state.boxPrompt.affordable = ledger.points >= BOX_COST_POINTS;
  state.prompt = state.boxPrompt;
};

const stepBox = (state: Interactions, box: MysteryBox, loadout: Loadout, ledger: PointsLedger, risingEdge: boolean, events: GameEvent[]): void => {
  fillBoxPrompt(state, box, ledger);
  if (!risingEdge) return;
  if (box.state.kind === "offering") {
    const weaponId = takeOffer(box, events);
    if (weaponId) giveWeapon(loadout, weaponId);
  } else if (!trySpend(ledger, BOX_COST_POINTS)) {
    events.push({ kind: "purchaseDenied", pointId: BOX_POINT_ID });
  } else {
    openBox(box, events);
    events.push({ kind: "purchaseDone", pointId: BOX_POINT_ID, costPoints: BOX_COST_POINTS });
  }
  if (box.state.kind === "idle" || box.state.kind === "offering") fillBoxPrompt(state, box, ledger);
  else state.prompt = null;
};

const purchaseDoor = (door: DoorPoint, ledger: PointsLedger, doors: ZoneDoors, events: GameEvent[]): void => {
  const costPoints = ZONES[door.zoneId].DOOR_COST_POINTS;
  if (!trySpend(ledger, costPoints)) {
    events.push({ kind: "purchaseDenied", pointId: door.id });
    return;
  }
  startOpening(doors, door.zoneId, events);
  events.push({ kind: "purchaseDone", pointId: door.id, costPoints });
};

const purchase = (state: Interactions, buy: WallBuySpec, loadout: Loadout, ledger: PointsLedger, events: GameEvent[]): void => {
  const store = state.weaponPrompt;
  if (store.kind === "buyAmmo" && !needsAmmo(loadout, buy.weaponId)) return;
  if (!trySpend(ledger, store.costPoints)) {
    events.push({ kind: "purchaseDenied", pointId: buy.id });
    return;
  }
  if (store.kind === "buyWeapon") giveWeapon(loadout, buy.weaponId);
  else refillAmmo(loadout, buy.weaponId);
  events.push({ kind: "purchaseDone", pointId: buy.id, costPoints: store.costPoints });
};

export const updateInteractions = (
  state: Interactions,
  player: Readonly<Vec2>,
  loadout: Loadout,
  ledger: PointsLedger,
  input: Readonly<InputState>,
  doors: ZoneDoors,
  events: GameEvent[],
  stepS = 0,
  layout?: StationLayout,
  barricades?: Barricades,
  box?: MysteryBox,
): void => {
  const risingEdge = input.interact && !state.interactHeld;
  state.interactHeld = input.interact;
  const buy = findNearest(player);
  const door = findNearestDoor(player, doors);
  const repair = layout && barricades ? findNearestRepair(player, layout, barricades) : null;
  const boxPoint = box ? findBoxPoint(player, box) : null;
  const buyM = buy ? distanceTo(buy, player) : Infinity;
  const doorM = door ? distanceTo(door, player) : Infinity;
  const boxM = boxPoint ? distanceTo(boxPoint, player) : Infinity;
  const nearestOtherM = Math.min(buyM, doorM, boxM);
  if (repair && barricades && distanceTo(repair, player) < nearestOtherM) {
    stepRepair(state, repair, input, stepS, ledger, barricades, events);
    return;
  }
  if (box && boxPoint && boxM < doorM && boxM < buyM) {
    stepBox(state, box, loadout, ledger, risingEdge, events);
    return;
  }
  if (door && doorM < buyM) {
    fillDoorPrompt(state, door, ledger);
    if (!risingEdge) return;
    purchaseDoor(door, ledger, doors, events);
    if (doors[door.zoneId].kind === "closed") fillDoorPrompt(state, door, ledger);
    else state.prompt = null;
    return;
  }
  if (!buy) {
    state.prompt = null;
    return;
  }
  fillPrompt(state, buy, loadout, ledger);
  if (!risingEdge) return;
  purchase(state, buy, loadout, ledger, events);
  fillPrompt(state, buy, loadout, ledger);
};
