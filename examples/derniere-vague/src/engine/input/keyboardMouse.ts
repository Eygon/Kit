import { SWAP_PULSE_MS } from "@/config/weaponConfig";
import { clearLatches, latchPress } from "@/logic/input/inputState";
import type { InputState, LatchFlag } from "@/logic/input/inputState";

export type KeyboardMouse = { dispose: () => void };

type MoveKey = "forward" | "back" | "left" | "right";
type HoldFlag = "reload" | "knife" | "interact" | "swap";

const MOVE_KEYS: Readonly<Record<string, MoveKey | undefined>> = {
  KeyW: "forward",
  KeyS: "back",
  KeyA: "left",
  KeyD: "right",
};

const HOLD_KEYS: Readonly<Record<string, HoldFlag | undefined>> = {
  KeyR: "reload",
  KeyV: "knife",
  KeyE: "interact",
  Digit1: "swap",
  Digit2: "swap",
};

const LATCH_KEYS: Readonly<Record<string, LatchFlag | undefined>> = {
  KeyV: "knife",
  KeyE: "interact",
};

const BUTTON_PRIMARY = 0;
const BUTTON_SECONDARY = 2;

export const createKeyboardMouse = (canvas: HTMLElement, input: InputState): KeyboardMouse => {
  const doc = canvas.ownerDocument;
  const held: Record<MoveKey, boolean> = { forward: false, back: false, left: false, right: false };
  let swapTimer: ReturnType<typeof setTimeout> | null = null;

  const syncMove = (): void => {
    input.move.x = (held.right ? 1 : 0) - (held.left ? 1 : 0);
    input.move.y = (held.forward ? 1 : 0) - (held.back ? 1 : 0);
  };

  const isLocked = (): boolean => doc.pointerLockElement === canvas;

  const onKey = (pressed: boolean) => (event: KeyboardEvent): void => {
    const moveKey = MOVE_KEYS[event.code];
    if (moveKey) {
      held[moveKey] = pressed;
      syncMove();
      return;
    }
    const flag = HOLD_KEYS[event.code];
    if (flag) input[flag] = pressed;
    const latch = LATCH_KEYS[event.code];
    if (pressed && latch && !event.repeat) latchPress(input, latch);
  };
  const onKeyDown = onKey(true);
  const onKeyUp = onKey(false);

  const onMouseMove = (event: MouseEvent): void => {
    if (!isLocked()) return;
    input.look.dx += event.movementX;
    input.look.dy += event.movementY;
  };

  const onMouseDown = (event: MouseEvent): void => {
    if (!isLocked()) {
      if (typeof canvas.requestPointerLock === "function") canvas.requestPointerLock();
      return;
    }
    if (event.button === BUTTON_PRIMARY) {
      input.fire = true;
      latchPress(input, "fire");
    }
    if (event.button === BUTTON_SECONDARY) input.aim = true;
  };

  const onMouseUp = (event: MouseEvent): void => {
    if (event.button === BUTTON_PRIMARY) input.fire = false;
    if (event.button === BUTTON_SECONDARY) input.aim = false;
  };

  const onContextMenu = (event: Event): void => event.preventDefault();

  const clearSwapTimer = (): void => {
    if (swapTimer !== null) clearTimeout(swapTimer);
    swapTimer = null;
  };

  const onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    clearSwapTimer();
    input.swap = true;
    swapTimer = setTimeout(() => {
      input.swap = false;
      swapTimer = null;
    }, SWAP_PULSE_MS);
  };

  const clearAll = (): void => {
    held.forward = false;
    held.back = false;
    held.left = false;
    held.right = false;
    syncMove();
    input.fire = false;
    input.aim = false;
    input.reload = false;
    input.knife = false;
    input.interact = false;
    input.swap = false;
    clearLatches(input);
  };

  const onBlur = (): void => clearAll();

  doc.addEventListener("keydown", onKeyDown);
  doc.addEventListener("keyup", onKeyUp);
  doc.addEventListener("mousemove", onMouseMove);
  doc.addEventListener("mouseup", onMouseUp);
  canvas.addEventListener("mousedown", onMouseDown);
  canvas.addEventListener("contextmenu", onContextMenu);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("blur", onBlur);

  const dispose = (): void => {
    doc.removeEventListener("keydown", onKeyDown);
    doc.removeEventListener("keyup", onKeyUp);
    doc.removeEventListener("mousemove", onMouseMove);
    doc.removeEventListener("mouseup", onMouseUp);
    canvas.removeEventListener("mousedown", onMouseDown);
    canvas.removeEventListener("contextmenu", onContextMenu);
    canvas.removeEventListener("wheel", onWheel);
    window.removeEventListener("blur", onBlur);
    clearSwapTimer();
    clearAll();
  };

  return { dispose };
};
