export {};

const BUTTONS_MODULE = "@/engine/input/touchButtons";
const INPUT_MODULE = "@/logic/input/inputState";

type Flags = { pressed: { fire: boolean; knife: boolean; interact: boolean }; fire: boolean; aim: boolean; reload: boolean; knife: boolean; interact: boolean; swap: boolean };
type Buttons = { dispose: () => void; setInteractVisible: (visible: boolean) => void };

const MIN_HIT_PX = 48;
const FLAG_BUTTONS = ["fire", "aim", "reload", "knife", "interact", "swap"] as const;

const load = async (labels: Record<string, string> = {}) => {
  const buttonsModule = await import(/* @vite-ignore */ BUTTONS_MODULE);
  const inputModule = await import(/* @vite-ignore */ INPUT_MODULE);
  const host = document.createElement("div");
  for (const [key, value] of Object.entries(labels)) host.dataset[key] = value;
  document.body.appendChild(host);
  const input: Flags = inputModule.createInputState();
  const buttons: Buttons = buttonsModule.createTouchButtons(host, input);
  const button = (name: string): HTMLElement => {
    const node = host.querySelector<HTMLElement>(`[data-touch-button="${name}"]`);
    if (!node) throw new Error(`button ${name} missing`);
    return node;
  };
  const press = (name: string, pointerId: number, type = "pointerdown", pointerType = "touch"): void => {
    button(name).dispatchEvent(new PointerEvent(type, { pointerId, pointerType, bubbles: true, cancelable: true }));
  };
  return { host, input, buttons, button, press };
};

describe("touchButtons", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("creates the six buttons inside the host", async () => {
    const { host } = await load();
    const names = [...host.querySelectorAll<HTMLElement>("[data-touch-button]")].map((node) => node.dataset.touchButton);
    expect(names.sort()).toEqual(["aim", "fire", "interact", "knife", "reload", "swap"]);
  });

  it("sizes every button at least 48px with the fire button the largest", async () => {
    const { button } = await load();
    const size = (name: string): number => Number.parseFloat(button(name).style.width);
    for (const name of [...FLAG_BUTTONS, "swap"]) {
      expect(size(name)).toBeGreaterThanOrEqual(MIN_HIT_PX);
      expect(Number.parseFloat(button(name).style.height)).toBeGreaterThanOrEqual(MIN_HIT_PX);
    }
    for (const name of ["aim", "reload", "knife", "swap"]) expect(size("fire")).toBeGreaterThan(size(name));
  });

  it("keeps the buttons on the right side without page gestures", async () => {
    const { host, button } = await load();
    const container = host.querySelector<HTMLElement>("[data-touch-buttons]");
    expect(container?.style.right).not.toBe("");
    expect(container?.style.left).toBe("");
    expect(button("fire").style.touchAction).toBe("none");
  });

  it("writes the matching input flag while pressed and clears it on release", async () => {
    const { input, press } = await load();
    for (const name of FLAG_BUTTONS) {
      press(name, 1);
      expect(input[name]).toBe(true);
      press(name, 1, "pointerup");
      expect(input[name]).toBe(false);
    }
  });

  it("tracks simultaneous presses by pointer id", async () => {
    const { input, press } = await load();
    press("fire", 1);
    press("aim", 2);
    expect(input.fire && input.aim).toBe(true);
    press("fire", 1, "pointerup");
    expect(input.fire).toBe(false);
    expect(input.aim).toBe(true);
    press("aim", 2, "pointercancel");
    expect(input.aim).toBe(false);
  });

  it("ignores a second pointer on a held button and a release from another pointer", async () => {
    const { input, press } = await load();
    press("fire", 1);
    press("fire", 2);
    press("fire", 2, "pointerup");
    expect(input.fire).toBe(true);
    press("fire", 1, "pointerup");
    expect(input.fire).toBe(false);
  });

  it("does not let a button press reach the host look handler", async () => {
    const { host, press } = await load();
    const seen: string[] = [];
    host.addEventListener("pointerdown", () => seen.push("host"));
    press("fire", 1);
    expect(seen).toEqual([]);
  });

  it("hides interact until it is made available", async () => {
    const { button, buttons, input, press } = await load();
    expect(button("interact").style.display).toBe("none");
    buttons.setInteractVisible(true);
    expect(button("interact").style.display).not.toBe("none");
    press("interact", 1);
    expect(input.interact).toBe(true);
    buttons.setInteractVisible(false);
    expect(button("interact").style.display).toBe("none");
    expect(input.interact).toBe(false);
  });

  it("keeps swap active, fully opaque and writing input.swap while pressed", async () => {
    const { button, input, press } = await load();
    expect(button("swap").getAttribute("aria-disabled")).toBeNull();
    expect(button("swap").style.opacity).toBe("");
    press("swap", 1);
    expect(input.swap).toBe(true);
    press("swap", 1, "pointerup");
    expect(input.swap).toBe(false);
  });

  it("takes labels from host data attributes and holds no text of its own", async () => {
    const { button } = await load({ labelFire: "Tir", labelReload: "Rech" });
    expect(button("fire").textContent).toBe("Tir");
    expect(button("reload").textContent).toBe("Rech");
    expect(button("aim").textContent).toBe("");
  });

  it("removes the buttons and clears the flags on dispose", async () => {
    const { host, input, buttons, press } = await load();
    press("fire", 1);
    buttons.dispose();
    expect(host.querySelector("[data-touch-button]")).toBeNull();
    expect(input.fire).toBe(false);
  });

  it("latches fire, knife and interact on a touch press and survives the release", async () => {
    const { input, press } = await load();
    for (const name of ["fire", "knife", "interact"] as const) {
      press(name, 1);
      press(name, 1, "pointerup");
      expect(input.pressed[name]).toBe(true);
      expect(input[name]).toBe(false);
    }
  });

  it("does not latch aim, reload or swap", async () => {
    const { input, press } = await load();
    for (const name of ["aim", "reload", "swap"]) {
      press(name, 1);
      press(name, 1, "pointerup");
    }
    expect(input.pressed).toEqual({ fire: false, knife: false, interact: false });
  });

  it("ignores a mouse pointerdown: no flag, no latch, no capture", async () => {
    const { button, input, press } = await load();
    const capture = vi.fn();
    for (const name of FLAG_BUTTONS) {
      button(name).setPointerCapture = capture;
      press(name, 1, "pointerdown", "mouse");
      expect(input[name]).toBe(false);
      expect(button(name).style.transform).toBe("");
    }
    expect(input.pressed).toEqual({ fire: false, knife: false, interact: false });
    expect(capture).not.toHaveBeenCalled();
  });

  it("still sets the flag for a touch pointerdown after a mouse one on the same button", async () => {
    const { input, press } = await load();
    press("fire", 1, "pointerdown", "mouse");
    press("fire", 2, "pointerdown", "touch");
    expect(input.fire).toBe(true);
    press("fire", 2, "pointerup");
    expect(input.fire).toBe(false);
  });
});
