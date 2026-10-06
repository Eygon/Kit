export {};

const KEYBOARD_MODULE = "@/engine/input/keyboardMouse";
const INPUT_MODULE = "@/logic/input/inputState";
const CONFIG_MODULE = "@/config/weaponConfig";

type Flags = {
  pressed: { fire: boolean; knife: boolean; interact: boolean };
  move: { x: number; y: number };
  look: { dx: number; dy: number };
  fire: boolean;
  aim: boolean;
  reload: boolean;
  knife: boolean;
  interact: boolean;
  swap: boolean;
};

const load = async () => {
  const keyboardModule = await import(/* @vite-ignore */ KEYBOARD_MODULE);
  const inputModule = await import(/* @vite-ignore */ INPUT_MODULE);
  const configModule = await import(/* @vite-ignore */ CONFIG_MODULE);
  const canvas = document.createElement("canvas");
  const lockSpy = vi.fn();
  canvas.requestPointerLock = lockSpy;
  document.body.appendChild(canvas);
  const input: Flags = inputModule.createInputState();
  const controls: { dispose: () => void } = keyboardModule.createKeyboardMouse(canvas, input);
  const key = (type: "keydown" | "keyup", code: string): void => {
    document.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
  };
  const lock = (locked: boolean): void => {
    Object.defineProperty(document, "pointerLockElement", { value: locked ? canvas : null, configurable: true });
  };
  const mouse = (target: EventTarget, type: string, button: number): MouseEvent => {
    const event = new MouseEvent(type, { button, bubbles: true, cancelable: true });
    target.dispatchEvent(event);
    return event;
  };
  const move = (movementX: number, movementY: number): void => {
    const event = new MouseEvent("mousemove", { bubbles: true });
    Object.defineProperty(event, "movementX", { value: movementX });
    Object.defineProperty(event, "movementY", { value: movementY });
    document.dispatchEvent(event);
  };
  return { canvas, input, controls, key, lock, mouse, move, lockSpy, swapPulseMs: configModule.SWAP_PULSE_MS as number };
};

const NO_LATCH = { fire: false, knife: false, interact: false };

describe("keyboardMouse", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    Object.defineProperty(document, "pointerLockElement", { value: null, configurable: true });
    vi.useRealTimers();
  });

  it("maps WASD to the move axes and releases them", async () => {
    const { input, key } = await load();
    key("keydown", "KeyW");
    expect(input.move).toEqual({ x: 0, y: 1 });
    key("keydown", "KeyD");
    expect(input.move).toEqual({ x: 1, y: 1 });
    key("keydown", "KeyS");
    expect(input.move).toEqual({ x: 1, y: 0 });
    key("keydown", "KeyA");
    expect(input.move).toEqual({ x: 0, y: 0 });
    for (const code of ["KeyW", "KeyD", "KeyS", "KeyA"]) key("keyup", code);
    expect(input.move).toEqual({ x: 0, y: 0 });
  });

  it("looks with the locked mouse and ignores it when unlocked", async () => {
    const { input, lock, move } = await load();
    move(5, 3);
    expect(input.look).toEqual({ dx: 0, dy: 0 });
    lock(true);
    move(5, 3);
    move(2, -1);
    expect(input.look).toEqual({ dx: 7, dy: 2 });
  });

  it("requests pointer lock on the first click without firing", async () => {
    const { canvas, input, mouse, lockSpy } = await load();
    mouse(canvas, "mousedown", 0);
    expect(lockSpy).toHaveBeenCalledTimes(1);
    expect(input.fire).toBe(false);
  });

  it("fires on left click and aims on right click once locked", async () => {
    const { canvas, input, lock, mouse } = await load();
    lock(true);
    mouse(canvas, "mousedown", 0);
    expect(input.fire).toBe(true);
    mouse(canvas, "mousedown", 2);
    expect(input.aim).toBe(true);
    mouse(document, "mouseup", 0);
    expect(input.fire).toBe(false);
    expect(input.aim).toBe(true);
    mouse(document, "mouseup", 2);
    expect(input.aim).toBe(false);
  });

  it("suppresses the context menu on the canvas", async () => {
    const { canvas, mouse } = await load();
    expect(mouse(canvas, "contextmenu", 2).defaultPrevented).toBe(true);
  });

  it("maps R, V and E to reload, knife and interact while held", async () => {
    const { input, key } = await load();
    const pairs = [
      ["KeyR", "reload"],
      ["KeyV", "knife"],
      ["KeyE", "interact"],
    ] as const;
    for (const [code, flag] of pairs) {
      key("keydown", code);
      expect(input[flag]).toBe(true);
      key("keyup", code);
      expect(input[flag]).toBe(false);
    }
  });

  it("swaps with the 1 and 2 keys", async () => {
    const { input, key } = await load();
    for (const code of ["Digit1", "Digit2"]) {
      key("keydown", code);
      expect(input.swap).toBe(true);
      key("keyup", code);
      expect(input.swap).toBe(false);
    }
  });

  it("pulses swap on the wheel", async () => {
    vi.useFakeTimers();
    const { canvas, input, swapPulseMs } = await load();
    canvas.dispatchEvent(new WheelEvent("wheel", { deltaY: 100, bubbles: true, cancelable: true }));
    expect(input.swap).toBe(true);
    vi.advanceTimersByTime(swapPulseMs + 1);
    expect(input.swap).toBe(false);
  });

  it("clears every flag when the window loses focus", async () => {
    const { input, key } = await load();
    key("keydown", "KeyW");
    key("keydown", "KeyR");
    window.dispatchEvent(new Event("blur"));
    expect(input.move).toEqual({ x: 0, y: 0 });
    expect(input.reload).toBe(false);
  });

  it("stops listening and clears flags on dispose", async () => {
    const { canvas, input, controls, key, lock, mouse, move } = await load();
    lock(true);
    key("keydown", "KeyW");
    mouse(canvas, "mousedown", 0);
    controls.dispose();
    expect(input.move).toEqual({ x: 0, y: 0 });
    expect(input.fire).toBe(false);
    key("keydown", "KeyW");
    mouse(canvas, "mousedown", 0);
    move(9, 9);
    expect(input.move).toEqual({ x: 0, y: 0 });
    expect(input.fire).toBe(false);
    expect(input.look).toEqual({ dx: 0, dy: 0 });
  });

  it("latches fire on a locked left click and not on right click", async () => {
    const { canvas, input, lock, mouse } = await load();
    lock(true);
    mouse(canvas, "mousedown", 2);
    expect(input.pressed).toEqual(NO_LATCH);
    mouse(canvas, "mousedown", 0);
    mouse(document, "mouseup", 0);
    expect(input.fire).toBe(false);
    expect(input.pressed).toEqual({ fire: true, knife: false, interact: false });
  });

  it("does not latch fire on the click that requests pointer lock", async () => {
    const { canvas, input, mouse } = await load();
    mouse(canvas, "mousedown", 0);
    expect(input.pressed).toEqual(NO_LATCH);
  });

  it("latches knife on V and interact on E, once per physical press", async () => {
    const { input, key } = await load();
    key("keydown", "KeyV");
    key("keyup", "KeyV");
    expect(input.pressed).toEqual({ fire: false, knife: true, interact: false });
    key("keydown", "KeyE");
    key("keyup", "KeyE");
    expect(input.pressed).toEqual({ fire: false, knife: true, interact: true });
  });

  it("does not latch on key repeat", async () => {
    const { input, key } = await load();
    document.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyE", repeat: true, bubbles: true }));
    document.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyV", repeat: true, bubbles: true }));
    expect(input.pressed).toEqual(NO_LATCH);
    key("keydown", "KeyE");
    expect(input.pressed.interact).toBe(true);
  });

  it("does not latch reload, swap or movement keys", async () => {
    const { input, key } = await load();
    for (const code of ["KeyR", "Digit1", "KeyW"]) key("keydown", code);
    expect(input.pressed).toEqual(NO_LATCH);
  });
});
