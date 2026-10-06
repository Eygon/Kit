import { VISUAL_CONFIG } from "@/config/visualConfig";
import type { GameSession } from "@/logic/game/gameSession";
import type { GameEvent } from "@/logic/game/gameEvents";

export type DamageIndicator = {
  update: (session: Pick<GameSession, "events" | "player">, frameS?: number) => void;
};

const ARC = VISUAL_CONFIG.DAMAGE_ARC;
const ACTIVE_CLASS = "is-active";
const ANGLE_PROPERTY = "--arc-angle";
const DURATION_PROPERTY = "--arc-duration";
const RADIUS_PROPERTY = "--arc-radius";
const HALF_TURN_RAD = Math.PI;
const FULL_TURN_RAD = Math.PI * 2;
const DEGREES_PER_RAD = 180 / Math.PI;

const createNode = (parent: HTMLElement, className: string): HTMLElement => {
  const node = document.createElement("div");
  node.className = className;
  parent.appendChild(node);
  return node;
};

const wrapTurn = (angleRad: number): number => {
  const turns = (angleRad + HALF_TURN_RAD) % FULL_TURN_RAD;
  return (turns < 0 ? turns + FULL_TURN_RAD : turns) - HALF_TURN_RAD;
};

const screenAngleDeg = (player: GameSession["player"], x: number, z: number): number => {
  const worldBearingRad = Math.atan2(x - player.x, z - player.z);
  return wrapTurn(player.yaw + HALF_TURN_RAD - worldBearingRad) * DEGREES_PER_RAD;
};

export const createDamageIndicator = (host: HTMLElement): DamageIndicator => {
  const root = createNode(host, "damage-indicator");
  root.style.setProperty(DURATION_PROPERTY, `${ARC.DURATION_S}s`);
  root.style.setProperty(RADIUS_PROPERTY, `${ARC.RADIUS_PX}px`);
  const arcs = Array.from({ length: ARC.POOL_SIZE }, () => createNode(root, "damage-arc"));
  const remainingS = arcs.map(() => 0);
  let nextArc = 0;

  const fadeArcs = (frameS: number): void => {
    for (let index = 0; index < arcs.length; index++) {
      const left = remainingS[index] ?? 0;
      if (left === 0) continue;
      const remaining = Math.max(0, left - frameS);
      remainingS[index] = remaining;
      if (remaining === 0) arcs[index]?.classList.remove(ACTIVE_CLASS);
    }
  };

  const showHit = (player: GameSession["player"], x: number, z: number): void => {
    const arc = arcs[nextArc];
    if (!arc) return;
    arc.classList.remove(ACTIVE_CLASS);
    arc.style.setProperty(ANGLE_PROPERTY, `${screenAngleDeg(player, x, z)}deg`);
    void arc.offsetWidth;
    arc.classList.add(ACTIVE_CLASS);
    remainingS[nextArc] = ARC.DURATION_S;
    nextArc = (nextArc + 1) % arcs.length;
  };

  const readEvents = (events: readonly GameEvent[], player: GameSession["player"]): void => {
    for (let index = 0; index < events.length; index++) {
      const event = events[index];
      if (event?.kind === "playerHit") showHit(player, event.x, event.z);
    }
  };

  const update: DamageIndicator["update"] = (session, frameS = 0) => {
    fadeArcs(frameS);
    readEvents(session.events, session.player);
  };

  return { update };
};
