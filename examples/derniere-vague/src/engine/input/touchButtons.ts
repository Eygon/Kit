import { VISUAL_CONFIG } from "@/config/visualConfig";
import type { TouchButtonLayout } from "@/config/visualConfig";
import { latchPress } from "@/logic/input/inputState";
import type { InputState, LatchFlag } from "@/logic/input/inputState";

export type TouchButtons = {
  dispose: () => void;
  setInteractVisible: (visible: boolean) => void;
};

type ButtonName = "fire" | "aim" | "reload" | "knife" | "interact" | "swap";
type ButtonFlag = "fire" | "aim" | "reload" | "knife" | "interact" | "swap";
type ButtonSpec = { readonly name: ButtonName; readonly flag: ButtonFlag | null; readonly layout: TouchButtonLayout };
type ButtonHandle = { readonly node: HTMLElement; readonly release: () => void };

const STYLE = VISUAL_CONFIG.TOUCH_BUTTONS;

const BUTTONS: readonly ButtonSpec[] = [
  { name: "fire", flag: "fire", layout: STYLE.FIRE },
  { name: "aim", flag: "aim", layout: STYLE.AIM },
  { name: "reload", flag: "reload", layout: STYLE.RELOAD },
  { name: "knife", flag: "knife", layout: STYLE.KNIFE },
  { name: "interact", flag: "interact", layout: STYLE.INTERACT },
  { name: "swap", flag: "swap", layout: STYLE.SWAP },
];

const labelKey = (name: ButtonName): string => `label${name.charAt(0).toUpperCase()}${name.slice(1)}`;

const restFill = (name: ButtonName): string => (name === "fire" ? STYLE.FIRE_FILL_COLOR : STYLE.FILL_COLOR);
const pressedFill = (name: ButtonName): string => (name === "fire" ? STYLE.FIRE_PRESSED_FILL_COLOR : STYLE.PRESSED_FILL_COLOR);

const createContainer = (): HTMLElement => {
  const container = document.createElement("div");
  container.dataset.touchButtons = "";
  container.style.cssText = ["position:absolute", `right:${STYLE.MARGIN_PX}px`, `bottom:${STYLE.MARGIN_PX}px`, "width:0", "height:0", "pointer-events:none"].join(";");
  return container;
};

const createNode = (spec: ButtonSpec, label: string): HTMLElement => {
  const node = document.createElement("div");
  node.dataset.touchButton = spec.name;
  node.textContent = label;
  node.style.cssText = [
    "position:absolute",
    "box-sizing:border-box",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "border-radius:50%",
    "pointer-events:auto",
    "touch-action:none",
    "user-select:none",
    "will-change:transform",
    `right:${spec.layout.right}px`,
    `bottom:${spec.layout.bottom}px`,
    `width:${spec.layout.size}px`,
    `height:${spec.layout.size}px`,
    `border:${STYLE.RING_WIDTH_PX}px solid ${STYLE.RING_COLOR}`,
    `background:${restFill(spec.name)}`,
    `box-shadow:${STYLE.SHADOW}`,
    `color:${STYLE.TEXT_COLOR}`,
    `font:${STYLE.FONT}`,
    `transition:${STYLE.TRANSITION}`,
  ].join(";");
  return node;
};

const LATCHED_FLAGS: readonly LatchFlag[] = ["fire", "knife", "interact"];

const latchOf = (flag: ButtonFlag | null): LatchFlag | null => LATCHED_FLAGS.find((candidate) => candidate === flag) ?? null;

const bindButton = (spec: ButtonSpec, node: HTMLElement, input: InputState): ButtonHandle => {
  let activePointerId: number | null = null;
  const flag = spec.flag;
  const latch = latchOf(flag);

  const setPressed = (pressed: boolean): void => {
    if (flag) input[flag] = pressed;
    node.style.transform = pressed ? `scale(${STYLE.PRESSED_SCALE})` : "";
    node.style.background = pressed ? pressedFill(spec.name) : restFill(spec.name);
  };

  const release = (): void => {
    activePointerId = null;
    setPressed(false);
  };

  node.addEventListener("pointerdown", (event: PointerEvent) => {
    if (event.pointerType === "mouse") return;
    event.preventDefault();
    event.stopPropagation();
    if (!flag || activePointerId !== null) return;
    activePointerId = event.pointerId;
    if (typeof node.setPointerCapture === "function") node.setPointerCapture(event.pointerId);
    setPressed(true);
    if (latch) latchPress(input, latch);
  });

  const onEnd = (event: PointerEvent): void => {
    if (event.pointerId === activePointerId) release();
  };
  node.addEventListener("pointerup", onEnd);
  node.addEventListener("pointercancel", onEnd);
  node.addEventListener("lostpointercapture", onEnd);

  return { node, release };
};

export const createTouchButtons = (host: HTMLElement, input: InputState): TouchButtons => {
  const container = createContainer();
  const handles = new Map<ButtonName, ButtonHandle>();
  for (const spec of BUTTONS) {
    const node = createNode(spec, host.dataset[labelKey(spec.name)] ?? "");
    if (spec.name === "interact") node.style.display = "none";
    handles.set(spec.name, bindButton(spec, node, input));
    container.appendChild(node);
  }
  host.appendChild(container);

  const setInteractVisible = (visible: boolean): void => {
    const handle = handles.get("interact");
    if (!handle) return;
    handle.node.style.display = visible ? "flex" : "none";
    if (!visible) handle.release();
  };

  const dispose = (): void => {
    for (const handle of handles.values()) handle.release();
    container.remove();
  };

  return { dispose, setInteractVisible };
};
