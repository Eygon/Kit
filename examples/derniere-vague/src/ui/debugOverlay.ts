import { TEXTS } from "@/ui/texts";

export type DebugOverlay = {
  update: (fps: number, drawCalls: number) => void;
};

const DEBUG_PARAMETER = "debug";
const DEBUG_ENABLED_VALUE = "1";

export const createDebugOverlay = (host: HTMLElement, search: string): DebugOverlay | null => {
  if (new URLSearchParams(search).get(DEBUG_PARAMETER) !== DEBUG_ENABLED_VALUE) return null;
  const node = document.createElement("div");
  node.className = "debug-counter";
  host.appendChild(node);
  let shownText = "";

  const update: DebugOverlay["update"] = (fps, drawCalls) => {
    const text = TEXTS.debugCounter(Math.round(fps), drawCalls);
    if (text === shownText) return;
    shownText = text;
    node.textContent = text;
  };

  return { update };
};
