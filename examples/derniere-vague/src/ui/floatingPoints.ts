import { VISUAL_CONFIG } from "@/config/visualConfig";
import { TEXTS } from "@/ui/texts";

export type FloatingPoints = {
  show: (amount: number) => void;
};

const FEEDBACK = VISUAL_CONFIG.HUD_FEEDBACK;
const FLOAT_CLASS = "hud__float";
const DURATION_PROPERTY = "--float-s";
const ANIMATION_END_EVENT = "animationend";

const createFloatNode = (anchor: HTMLElement): HTMLElement => {
  const node = document.createElement("div");
  node.dataset.hudFloat = "";
  node.style.setProperty(DURATION_PROPERTY, `${FEEDBACK.FLOATING_S}s`);
  node.addEventListener(ANIMATION_END_EVENT, () => {
    node.classList.remove(FLOAT_CLASS);
    node.dataset.gain = "";
  });
  anchor.appendChild(node);
  return node;
};

const restart = (node: HTMLElement): void => {
  node.classList.remove(FLOAT_CLASS);
  void node.offsetWidth;
  node.classList.add(FLOAT_CLASS);
};

export const createFloatingPoints = (anchor: HTMLElement): FloatingPoints => {
  const pool = Array.from({ length: FEEDBACK.FLOATING_POOL_SIZE }, () => createFloatNode(anchor));
  let next = 0;

  const show = (amount: number): void => {
    const node = pool[next];
    if (!node) return;
    next = (next + 1) % pool.length;
    node.dataset.gain = TEXTS.pointsGain(amount);
    restart(node);
  };

  return { show };
};
