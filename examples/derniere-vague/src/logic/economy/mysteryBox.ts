import { BOX_COST_POINTS, BOX_MOVE_S, BOX_OFFER_S, BOX_POOL, BOX_ROLL_S, BOX_SPOTS, BOX_START_SPOT, TEDDY_CHANCE, TEDDY_FROM_ROLL } from "@/config/boxConfig";
import type { WeaponId } from "@/config/weaponConfig";
import type { PointsLedger } from "@/logic/economy/pointsLedger";
import type { GameEvent } from "@/logic/game/gameEvents";
import type { Random } from "@/logic/random";

export type MysteryBoxState =
  | { kind: "idle" }
  | { kind: "rolling"; remainingS: number }
  | { kind: "offering"; weaponId: WeaponId; remainingS: number }
  | { kind: "moving"; remainingS: number };

export type MysteryBox = {
  state: MysteryBoxState;
  spot: number;
  rolls: number;
};

export const createMysteryBox = (): MysteryBox => ({ state: { kind: "idle" }, spot: BOX_START_SPOT, rolls: 0 });

const TOTAL_WEIGHT = BOX_POOL.reduce((sum, entry) => sum + entry.weight, 0);
const FALLBACK_WEAPON: WeaponId = "smg";

const drawWeapon = (random: Random): WeaponId => {
  let remaining = random.next() * TOTAL_WEIGHT;
  for (const entry of BOX_POOL) {
    if (remaining < entry.weight) return entry.weaponId;
    remaining -= entry.weight;
  }
  return BOX_POOL[BOX_POOL.length - 1]?.weaponId ?? FALLBACK_WEAPON;
};

const drawOtherSpot = (box: MysteryBox, random: Random): number => {
  const index = random.int(0, BOX_SPOTS.length - 1);
  return index >= box.spot ? index + 1 : index;
};

const isTeddyDrawn = (box: MysteryBox, random: Random): boolean => box.rolls >= TEDDY_FROM_ROLL && random.next() < TEDDY_CHANCE;

export const openBox = (box: MysteryBox, events: GameEvent[]): void => {
  if (box.state.kind !== "idle") return;
  box.rolls += 1;
  box.state = { kind: "rolling", remainingS: BOX_ROLL_S };
  events.push({ kind: "boxOpened" });
};

const finishRoll = (box: MysteryBox, random: Random, ledger: PointsLedger, events: GameEvent[]): void => {
  if (isTeddyDrawn(box, random)) {
    ledger.points += BOX_COST_POINTS;
    box.state = { kind: "moving", remainingS: BOX_MOVE_S };
    events.push({ kind: "boxTeddy" });
    return;
  }
  const weaponId = drawWeapon(random);
  box.state = { kind: "offering", weaponId, remainingS: BOX_OFFER_S };
  events.push({ kind: "boxOffered", weaponId });
};

const finishMove = (box: MysteryBox, random: Random, events: GameEvent[]): void => {
  box.spot = drawOtherSpot(box, random);
  box.rolls = 0;
  box.state = { kind: "idle" };
  events.push({ kind: "boxMoved", spot: box.spot });
};

export const updateMysteryBox = (box: MysteryBox, stepS: number, random: Random, ledger: PointsLedger, events: GameEvent[]): void => {
  const state = box.state;
  if (state.kind === "idle") return;
  state.remainingS -= stepS;
  if (state.remainingS > 0) return;
  if (state.kind === "rolling") finishRoll(box, random, ledger, events);
  else if (state.kind === "offering") box.state = { kind: "idle" };
  else finishMove(box, random, events);
};

export const takeOffer = (box: MysteryBox, events: GameEvent[]): WeaponId | null => {
  const state = box.state;
  if (state.kind !== "offering") return null;
  box.state = { kind: "idle" };
  events.push({ kind: "boxWeaponTaken", weaponId: state.weaponId });
  return state.weaponId;
};
