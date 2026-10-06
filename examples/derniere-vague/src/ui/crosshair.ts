import { VISUAL_CONFIG } from "@/config/visualConfig";
import type { GameSession } from "@/logic/game/gameSession";
import type { InputState } from "@/logic/input/inputState";

export type Crosshair = {
  update: (session: Pick<GameSession, "events">, input: Pick<InputState, "move" | "aim">, frameS: number) => void;
};

const CROSSHAIR = VISUAL_CONFIG.CROSSHAIR;
const VISIBLE_CLASS = "is-visible";
const KILL_CLASS = "is-kill";
const GAP_PROPERTY = "--gap";
const TICK_SIDES = ["up", "down", "left", "right"] as const;

const createNode = (parent: HTMLElement, className: string): HTMLElement => {
  const node = document.createElement("div");
  node.className = className;
  parent.appendChild(node);
  return node;
};

const gapText = (gapPx: number): string => `${gapPx}px`;

export const createCrosshair = (host: HTMLElement): Crosshair => {
  const root = createNode(host, "crosshair");
  TICK_SIDES.forEach((side) => createNode(root, `crosshair__tick crosshair__tick--${side}`));
  const marker = createNode(root, "crosshair__marker");
  let shotSpreadPx = 0;
  let markerRemainingS = 0;
  let killShown = false;
  let shownGapPx = Number.NaN;

  const showGap = (gapPx: number): void => {
    const roundedPx = Math.round(gapPx / CROSSHAIR.GAP_STEP_PX) * CROSSHAIR.GAP_STEP_PX;
    if (roundedPx === shownGapPx) return;
    shownGapPx = roundedPx;
    root.style.setProperty(GAP_PROPERTY, gapText(roundedPx));
  };

  const setMarker = (visible: boolean, kill: boolean): void => {
    if (marker.classList.contains(VISIBLE_CLASS) !== visible) marker.classList.toggle(VISIBLE_CLASS, visible);
    if (marker.classList.contains(KILL_CLASS) !== kill) marker.classList.toggle(KILL_CLASS, kill);
  };

  const readEvents = (events: Pick<GameSession, "events">["events"]): void => {
    let shot = false;
    let hit = false;
    let kill = false;
    for (let index = 0; index < events.length; index++) {
      const kind = events[index]?.kind;
      if (kind === "shotFired") shot = true;
      else if (kind === "targetHit") hit = true;
      else if (kind === "zombieKilled") kill = true;
    }
    if (shot) shotSpreadPx = CROSSHAIR.SHOT_GAP_PX;
    if (hit || kill) markerRemainingS = CROSSHAIR.MARKER_S;
    if (kill) killShown = true;
  };

  const update: Crosshair["update"] = (session, input, frameS) => {
    shotSpreadPx = Math.max(0, shotSpreadPx - CROSSHAIR.RECOVER_RATE * frameS);
    markerRemainingS = Math.max(0, markerRemainingS - frameS);
    readEvents(session.events);
    const baseGapPx = input.aim ? CROSSHAIR.AIM_GAP_PX : CROSSHAIR.REST_GAP_PX;
    showGap(baseGapPx + shotSpreadPx + CROSSHAIR.MOVE_GAP_PX * Math.hypot(input.move.x, input.move.y));
    if (markerRemainingS === 0) killShown = false;
    setMarker(markerRemainingS > 0, killShown);
  };

  return { update };
};
