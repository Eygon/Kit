import type { PowerUpKind, TimedPowerUpKind } from "@/config/powerUpConfig";
import { VISUAL_CONFIG } from "@/config/visualConfig";
import type { WeaponId } from "@/config/weaponConfig";
import type { GameEvent } from "@/logic/game/gameEvents";
import type { GameSession } from "@/logic/game/gameSession";
import type { InteractionPrompt } from "@/logic/economy/interactions";
import { isPowerUpActive } from "@/logic/powerUps/powerUps";
import type { PowerUps } from "@/logic/powerUps/powerUps";
import type { PlayerHealth } from "@/logic/player/playerHealth";
import type { WeaponState } from "@/logic/weapons/weaponState";
import { createFloatingPoints } from "@/ui/floatingPoints";
import { TEXTS } from "@/ui/texts";

export type Hud = {
  update: (session: GameSession, frameS?: number) => void;
};

type TimerView = {
  readonly kind: TimedPowerUpKind;
  readonly node: HTMLElement;
  shownSeconds: number;
};

type SlotView = {
  readonly node: HTMLElement;
  shownWeaponId: WeaponId | null;
  shownMag: number;
  shownReserve: number;
};

const HURT_CLASS = "is-hurt";
const VISIBLE_CLASS = "is-visible";
const DENIED_CLASS = "is-denied";
const SLOT_COUNT = 2;
const BOX_TARGET_ID = "box";
const TIMED_KINDS: readonly TimedPowerUpKind[] = ["instaKill", "doublePoints"];

const createNode = (parent: HTMLElement, className: string, name: string): HTMLElement => {
  const node = document.createElement("div");
  node.className = className;
  node.dataset[`hud${name.charAt(0).toUpperCase()}${name.slice(1)}`] = "";
  parent.appendChild(node);
  return node;
};

const createSlot = (parent: HTMLElement, index: number): SlotView => {
  const node = createNode(parent, "hud__slot", "slot");
  node.dataset.hudSlot = String(index);
  node.hidden = true;
  return { node, shownWeaponId: null, shownMag: -1, shownReserve: -1 };
};

const createTimer = (parent: HTMLElement, kind: TimedPowerUpKind): TimerView => {
  const node = createNode(parent, "hud__powerup", "powerup");
  node.dataset.hudPowerup = kind;
  node.hidden = true;
  return { kind, node, shownSeconds: 0 };
};

const displayedSeconds = (remainingS: number): number => Math.max(1, Math.floor(remainingS));

const showTimer = (timer: TimerView, powerUps: PowerUps): void => {
  const seconds = isPowerUpActive(powerUps, timer.kind) ? displayedSeconds(powerUps.timers[timer.kind]) : 0;
  if (seconds === timer.shownSeconds) return;
  timer.shownSeconds = seconds;
  timer.node.hidden = seconds === 0;
  if (seconds > 0) timer.node.textContent = TEXTS.powerUpCountdown(seconds);
};

const lastTakenPowerUp = (events: readonly GameEvent[]): PowerUpKind | null => {
  let taken: PowerUpKind | null = null;
  for (let index = 0; index < events.length; index++) {
    const event = events[index];
    if (event?.kind === "powerUpTaken") taken = event.powerUpKind;
  }
  return taken;
};

const isHurt = (health: PlayerHealth): boolean => health.status === "dead" || health.hitsTaken > 0;

const showSlot = (slot: SlotView, weapon: WeaponState | null): void => {
  if (!weapon) {
    if (slot.shownWeaponId === null) return;
    slot.shownWeaponId = null;
    slot.node.hidden = true;
    return;
  }
  if (weapon.weaponId !== slot.shownWeaponId || weapon.mag !== slot.shownMag || weapon.reserve !== slot.shownReserve) {
    slot.shownWeaponId = weapon.weaponId;
    slot.shownMag = weapon.mag;
    slot.shownReserve = weapon.reserve;
    slot.node.textContent = TEXTS.slotAmmo(TEXTS.weaponNames[weapon.weaponId], weapon.mag, weapon.reserve);
    slot.node.hidden = false;
  }
};

const holstered = (session: GameSession, index: number): WeaponState | null => (session.loadout.active === index ? null : (session.loadout.slots[index] ?? null));

const promptText = (prompt: InteractionPrompt): string => {
  if (prompt.kind === "openDoor") return TEXTS.openDoor(prompt.costPoints);
  if (prompt.kind === "repair") return TEXTS.repair;
  if (prompt.kind === "box") return TEXTS.openBox(prompt.costPoints);
  if (prompt.kind === "takeWeapon") return TEXTS.takeWeapon(TEXTS.weaponNames[prompt.weaponId]);
  const name = TEXTS.weaponNames[prompt.weaponId];
  return prompt.kind === "buyAmmo" ? TEXTS.buyAmmo(name, prompt.costPoints) : TEXTS.buyWeapon(name, prompt.costPoints);
};

const promptTargetId = (prompt: InteractionPrompt): string => {
  if (prompt.kind === "openDoor") return prompt.zoneId;
  if (prompt.kind === "repair") return prompt.windowId;
  return prompt.kind === "box" ? BOX_TARGET_ID : prompt.weaponId;
};

export const createHud = (host: HTMLElement): Hud => {
  const root = createNode(host, "hud", "root");
  const stats = createNode(root, "hud__stats", "stats");
  const roundNode = createNode(stats, "hud__round", "round");
  const pointsNode = createNode(stats, "hud__points", "points");
  const pointsLabel = document.createTextNode("");
  pointsNode.appendChild(pointsLabel);
  const floatingPoints = createFloatingPoints(pointsNode);
  const loadout = createNode(root, "hud__loadout", "loadout");
  const weaponNode = createNode(loadout, "hud__weapon", "weapon");
  const ammoNode = createNode(loadout, "hud__ammo", "ammo");
  const slotsNode = createNode(loadout, "hud__slots", "slots");
  const slots = Array.from({ length: SLOT_COUNT }, (_, index) => createSlot(slotsNode, index));
  const promptNode = createNode(root, "hud__prompt", "prompt");
  const powerUpsNode = createNode(root, "hud__powerups", "powerups");
  const timers = TIMED_KINDS.map((kind) => createTimer(powerUpsNode, kind));
  const announceNode = createNode(root, "hud__announce", "announce");
  const vignetteNode = createNode(host, "hud__vignette", "vignette");

  let shownRound = -1;
  let shownPoints = -1;
  let shownMag = -1;
  let shownReserve = -1;
  let shownHurt = false;
  let shownWeaponId: WeaponId | null = null;
  let shownPromptKind: InteractionPrompt["kind"] | null = null;
  let shownPromptTargetId: string | null = null;
  let shownPromptCost = -1;
  let shownPromptDenied = false;
  let shownPromptVisible = false;
  let shownAnnounceKind: PowerUpKind | null = null;
  let announceVisible = false;
  let announceRemainingS = 0;

  const updatePrompt = (prompt: InteractionPrompt | null): void => {
    if (!prompt) {
      if (!shownPromptVisible) return;
      shownPromptVisible = false;
      promptNode.classList.remove(VISIBLE_CLASS);
      return;
    }
    const targetId = promptTargetId(prompt);
    if (prompt.kind !== shownPromptKind || targetId !== shownPromptTargetId || prompt.costPoints !== shownPromptCost) {
      shownPromptKind = prompt.kind;
      shownPromptTargetId = targetId;
      shownPromptCost = prompt.costPoints;
      promptNode.textContent = promptText(prompt);
    }
    const denied = !prompt.affordable;
    if (denied !== shownPromptDenied) {
      shownPromptDenied = denied;
      promptNode.classList.toggle(DENIED_CLASS, denied);
    }
    if (!shownPromptVisible) {
      shownPromptVisible = true;
      promptNode.classList.add(VISIBLE_CLASS);
    }
  };

  const updateAnnounce = (events: readonly GameEvent[], frameS: number): void => {
    const taken = lastTakenPowerUp(events);
    if (taken !== null) {
      announceRemainingS = VISUAL_CONFIG.POWER_UP.ANNOUNCE_S;
      if (taken !== shownAnnounceKind) {
        shownAnnounceKind = taken;
        announceNode.textContent = TEXTS.powerUpNames[taken];
      }
      if (!announceVisible) {
        announceVisible = true;
        announceNode.classList.add(VISIBLE_CLASS);
      }
      return;
    }
    if (!announceVisible) return;
    announceRemainingS -= frameS;
    if (announceRemainingS > 0) return;
    announceVisible = false;
    announceNode.classList.remove(VISIBLE_CLASS);
  };

  const update = (session: GameSession, frameS = 0): void => {
    const round = session.rounds.number;
    if (round !== shownRound) {
      shownRound = round;
      roundNode.textContent = TEXTS.round(round);
    }
    const points = session.ledger.points;
    if (points !== shownPoints) {
      if (shownPoints >= 0 && points > shownPoints) floatingPoints.show(points - shownPoints);
      shownPoints = points;
      pointsLabel.nodeValue = TEXTS.points(points);
    }
    const { mag, reserve, weaponId } = session.weapon;
    if (mag !== shownMag || reserve !== shownReserve) {
      shownMag = mag;
      shownReserve = reserve;
      ammoNode.textContent = TEXTS.ammo(mag, reserve);
    }
    if (weaponId !== shownWeaponId) {
      shownWeaponId = weaponId;
      weaponNode.textContent = TEXTS.weaponNames[weaponId];
    }
    slots.forEach((slot, index) => showSlot(slot, holstered(session, index)));
    updatePrompt(session.interactions.prompt);
    timers.forEach((timer) => showTimer(timer, session.powerUps));
    updateAnnounce(session.events, frameS);
    const hurt = isHurt(session.health);
    if (hurt !== shownHurt) {
      shownHurt = hurt;
      vignetteNode.classList.toggle(HURT_CLASS, hurt);
    }
  };

  return { update };
};
