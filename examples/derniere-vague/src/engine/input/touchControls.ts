import { PLAYER_CONFIG } from "@/config/playerConfig";
import { VISUAL_CONFIG } from "@/config/visualConfig";
import type { InputState } from "@/logic/input/inputState";

export type TouchControls = { dispose: () => void };

type Point = { x: number; y: number };

const STICK_RADIUS_PX = VISUAL_CONFIG.STICK_DIAMETER_PX / 2;

const createStickNode = (): HTMLElement => {
  const node = document.createElement("div");
  node.dataset.touchStick = "";
  const thumbEdge = VISUAL_CONFIG.STICK_THUMB_DIAMETER_PX / 2;
  node.style.cssText = [
    "position:absolute",
    "left:0",
    "top:0",
    "pointer-events:none",
    "box-sizing:border-box",
    "border-radius:50%",
    `width:${VISUAL_CONFIG.STICK_DIAMETER_PX}px`,
    `height:${VISUAL_CONFIG.STICK_DIAMETER_PX}px`,
    `border:${VISUAL_CONFIG.STICK_RING_WIDTH_PX}px solid ${VISUAL_CONFIG.STICK_RING_COLOR}`,
    `box-shadow:${VISUAL_CONFIG.STICK_SHADOW}`,
    `background:radial-gradient(circle at calc(50% + var(--thumb-x, 0px)) calc(50% + var(--thumb-y, 0px)), ${VISUAL_CONFIG.STICK_THUMB_COLOR} 0, ${VISUAL_CONFIG.STICK_THUMB_COLOR} ${thumbEdge}px, transparent ${thumbEdge + 1}px), ${VISUAL_CONFIG.STICK_FILL_COLOR}`,
    "will-change:transform",
  ].join(";");
  node.style.visibility = "hidden";
  return node;
};

export const createTouchControls = (host: HTMLElement, input: InputState): TouchControls => {
  const stick = createStickNode();
  host.style.touchAction = "none";
  host.appendChild(stick);
  let movePointerId: number | null = null;
  let lookPointerId: number | null = null;
  const stickOrigin: Point = { x: 0, y: 0 };
  const lookLast: Point = { x: 0, y: 0 };

  const releaseStick = (): void => {
    movePointerId = null;
    input.move.x = 0;
    input.move.y = 0;
    stick.style.visibility = "hidden";
    stick.style.setProperty("--thumb-x", "0px");
    stick.style.setProperty("--thumb-y", "0px");
  };

  const dragStick = (clientX: number, clientY: number): void => {
    const offsetX = clientX - stickOrigin.x;
    const offsetY = clientY - stickOrigin.y;
    const normalizedX = offsetX / PLAYER_CONFIG.STICK_MAX_TRAVEL_PX;
    const normalizedY = (0 - offsetY) / PLAYER_CONFIG.STICK_MAX_TRAVEL_PX;
    const magnitude = Math.hypot(normalizedX, normalizedY);
    const scale = magnitude > 1 ? 1 / magnitude : 1;
    input.move.x = normalizedX * scale;
    input.move.y = normalizedY * scale;
    stick.style.setProperty("--thumb-x", `${input.move.x * PLAYER_CONFIG.STICK_MAX_TRAVEL_PX}px`);
    stick.style.setProperty("--thumb-y", `${-input.move.y * PLAYER_CONFIG.STICK_MAX_TRAVEL_PX}px`);
  };

  const startStick = (event: PointerEvent, rect: DOMRect): void => {
    movePointerId = event.pointerId;
    stickOrigin.x = event.clientX;
    stickOrigin.y = event.clientY;
    stick.style.transform = `translate3d(${event.clientX - rect.left - STICK_RADIUS_PX}px, ${event.clientY - rect.top - STICK_RADIUS_PX}px, 0)`;
    stick.style.visibility = "visible";
    dragStick(event.clientX, event.clientY);
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (event.pointerType === "mouse") return;
    if (event.pointerId === movePointerId || event.pointerId === lookPointerId) return;
    event.preventDefault();
    const rect = host.getBoundingClientRect();
    const onLeftHalf = event.clientX - rect.left < rect.width / 2;
    if (onLeftHalf) {
      if (movePointerId === null) startStick(event, rect);
      return;
    }
    if (lookPointerId !== null) return;
    lookPointerId = event.pointerId;
    lookLast.x = event.clientX;
    lookLast.y = event.clientY;
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (event.pointerId === movePointerId) {
      dragStick(event.clientX, event.clientY);
      return;
    }
    if (event.pointerId !== lookPointerId) return;
    input.look.dx += event.clientX - lookLast.x;
    input.look.dy += event.clientY - lookLast.y;
    lookLast.x = event.clientX;
    lookLast.y = event.clientY;
  };

  const onPointerEnd = (event: PointerEvent): void => {
    if (event.pointerId === movePointerId) releaseStick();
    if (event.pointerId === lookPointerId) lookPointerId = null;
  };

  host.addEventListener("pointerdown", onPointerDown);
  host.addEventListener("pointermove", onPointerMove);
  host.addEventListener("pointerup", onPointerEnd);
  host.addEventListener("pointercancel", onPointerEnd);

  const dispose = (): void => {
    host.removeEventListener("pointerdown", onPointerDown);
    host.removeEventListener("pointermove", onPointerMove);
    host.removeEventListener("pointerup", onPointerEnd);
    host.removeEventListener("pointercancel", onPointerEnd);
    releaseStick();
    lookPointerId = null;
    stick.remove();
  };

  return { dispose };
};
