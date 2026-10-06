export {};

const TOUCH_MODULE = "@/engine/input/touchControls";
const INPUT_MODULE = "@/logic/input/inputState";
const PLAYER_CONFIG_MODULE = "@/config/playerConfig";
const VISUAL_CONFIG_MODULE = "@/config/visualConfig";
const HOST_WIDTH_PX = 800;
const HOST_HEIGHT_PX = 400;
const LEFT_X_PX = 100;
const RIGHT_X_PX = 600;
const TOUCH_Y_PX = 300;
const STICK_SELECTOR = "[data-touch-stick]";

type Input = { move: { x: number; y: number }; look: { dx: number; dy: number } };

const load = async () => {
  const touchModule = await import(/* @vite-ignore */ TOUCH_MODULE);
  const inputModule = await import(/* @vite-ignore */ INPUT_MODULE);
  const configModule = await import(/* @vite-ignore */ PLAYER_CONFIG_MODULE);
  const visualModule = await import(/* @vite-ignore */ VISUAL_CONFIG_MODULE);
  const host = document.createElement("div");
  document.body.appendChild(host);
  vi.spyOn(host, "getBoundingClientRect").mockReturnValue({
    left: 0,
    top: 0,
    right: HOST_WIDTH_PX,
    bottom: HOST_HEIGHT_PX,
    width: HOST_WIDTH_PX,
    height: HOST_HEIGHT_PX,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
  const input: Input = inputModule.createInputState();
  const controls: { dispose: () => void } = touchModule.createTouchControls(host, input);
  const fire = (type: string, pointerId: number, clientX: number, clientY: number, pointerType = "touch"): void => {
    host.dispatchEvent(new PointerEvent(type, { pointerId, pointerType, clientX, clientY, bubbles: true }));
  };
  const stick = (): HTMLElement | null => host.querySelector<HTMLElement>(STICK_SELECTOR);
  return { host, input, controls, fire, stick, config: configModule.PLAYER_CONFIG, visual: visualModule.VISUAL_CONFIG };
};

describe("createTouchControls", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("creates a single hidden stick node up front and disables browser touch gestures", async () => {
    const { host, stick } = await load();
    expect(host.querySelectorAll(STICK_SELECTOR)).toHaveLength(1);
    expect(stick()?.style.visibility).toBe("hidden");
    expect(host.style.touchAction).toBe("none");
  });

  it("spawns the stick under the finger on a left half touch", async () => {
    const { fire, stick, visual } = await load();
    fire("pointerdown", 1, LEFT_X_PX, TOUCH_Y_PX);
    const node = stick();
    const radius = visual.STICK_DIAMETER_PX / 2;
    expect(node?.style.visibility).toBe("visible");
    expect(node?.style.transform).toBe(`translate3d(${LEFT_X_PX - radius}px, ${TOUCH_Y_PX - radius}px, 0)`);
  });

  it("writes a normalized move vector while dragging, forward being up", async () => {
    const { input, fire, config } = await load();
    fire("pointerdown", 1, LEFT_X_PX, TOUCH_Y_PX);
    fire("pointermove", 1, LEFT_X_PX + config.STICK_MAX_TRAVEL_PX, TOUCH_Y_PX);
    expect(input.move.x).toBeCloseTo(1, 6);
    expect(input.move.y).toBeCloseTo(0, 6);
    fire("pointermove", 1, LEFT_X_PX, TOUCH_Y_PX - config.STICK_MAX_TRAVEL_PX / 2);
    expect(input.move.x).toBeCloseTo(0, 6);
    expect(input.move.y).toBeCloseTo(0.5, 6);
    fire("pointermove", 1, LEFT_X_PX, TOUCH_Y_PX + config.STICK_MAX_TRAVEL_PX);
    expect(input.move.y).toBeCloseTo(-1, 6);
  });

  it("caps the move vector length at one however far the finger goes", async () => {
    const { input, fire, config } = await load();
    fire("pointerdown", 1, LEFT_X_PX, TOUCH_Y_PX);
    fire("pointermove", 1, LEFT_X_PX + config.STICK_MAX_TRAVEL_PX * 5, TOUCH_Y_PX - config.STICK_MAX_TRAVEL_PX * 5);
    expect(Math.hypot(input.move.x, input.move.y)).toBeCloseTo(1, 6);
  });

  it("keeps the stick node anchored at the touch point and reuses it", async () => {
    const { host, fire, stick, visual } = await load();
    fire("pointerdown", 1, LEFT_X_PX, TOUCH_Y_PX);
    const anchored = stick()?.style.transform;
    fire("pointermove", 1, LEFT_X_PX + 20, TOUCH_Y_PX - 10);
    expect(stick()?.style.transform).toBe(anchored);
    fire("pointerup", 1, LEFT_X_PX + 20, TOUCH_Y_PX - 10);
    fire("pointerdown", 2, LEFT_X_PX + 30, TOUCH_Y_PX - 30);
    const radius = visual.STICK_DIAMETER_PX / 2;
    expect(host.querySelectorAll(STICK_SELECTOR)).toHaveLength(1);
    expect(stick()?.style.transform).toBe(`translate3d(${LEFT_X_PX + 30 - radius}px, ${TOUCH_Y_PX - 30 - radius}px, 0)`);
  });

  it("releases the move vector and hides the stick when the finger lifts", async () => {
    const { input, fire, stick, config } = await load();
    fire("pointerdown", 1, LEFT_X_PX, TOUCH_Y_PX);
    fire("pointermove", 1, LEFT_X_PX + config.STICK_MAX_TRAVEL_PX, TOUCH_Y_PX);
    fire("pointerup", 1, LEFT_X_PX + config.STICK_MAX_TRAVEL_PX, TOUCH_Y_PX);
    expect(input.move).toEqual({ x: 0, y: 0 });
    expect(stick()?.style.visibility).toBe("hidden");
  });

  it("releases the move vector when the pointer is cancelled", async () => {
    const { input, fire, config } = await load();
    fire("pointerdown", 1, LEFT_X_PX, TOUCH_Y_PX);
    fire("pointermove", 1, LEFT_X_PX + config.STICK_MAX_TRAVEL_PX, TOUCH_Y_PX);
    fire("pointercancel", 1, LEFT_X_PX, TOUCH_Y_PX);
    expect(input.move).toEqual({ x: 0, y: 0 });
  });

  it("accumulates look deltas from a right half drag", async () => {
    const { input, fire, stick } = await load();
    fire("pointerdown", 1, RIGHT_X_PX, TOUCH_Y_PX);
    fire("pointermove", 1, RIGHT_X_PX + 10, TOUCH_Y_PX - 5);
    fire("pointermove", 1, RIGHT_X_PX + 14, TOUCH_Y_PX - 2);
    expect(input.look.dx).toBeCloseTo(14, 6);
    expect(input.look.dy).toBeCloseTo(-2, 6);
    expect(input.move).toEqual({ x: 0, y: 0 });
    expect(stick()?.style.visibility).toBe("hidden");
  });

  it("stops writing look deltas once the right finger lifts", async () => {
    const { input, fire } = await load();
    fire("pointerdown", 1, RIGHT_X_PX, TOUCH_Y_PX);
    fire("pointermove", 1, RIGHT_X_PX + 10, TOUCH_Y_PX);
    fire("pointerup", 1, RIGHT_X_PX + 10, TOUCH_Y_PX);
    input.look.dx = 0;
    fire("pointermove", 1, RIGHT_X_PX + 50, TOUCH_Y_PX);
    expect(input.look.dx).toBe(0);
  });

  it("ignores a second finger landing on the left half", async () => {
    const { input, fire, stick, config } = await load();
    fire("pointerdown", 1, LEFT_X_PX, TOUCH_Y_PX);
    const anchored = stick()?.style.transform;
    fire("pointerdown", 2, LEFT_X_PX + 50, TOUCH_Y_PX - 50);
    fire("pointermove", 2, LEFT_X_PX + 50 + config.STICK_MAX_TRAVEL_PX, TOUCH_Y_PX - 50);
    expect(input.move).toEqual({ x: 0, y: 0 });
    expect(stick()?.style.transform).toBe(anchored);
    fire("pointerup", 2, LEFT_X_PX + 50, TOUCH_Y_PX - 50);
    fire("pointermove", 1, LEFT_X_PX + config.STICK_MAX_TRAVEL_PX, TOUCH_Y_PX);
    expect(input.move.x).toBeCloseTo(1, 6);
  });

  it("ignores a second finger landing on the right half", async () => {
    const { input, fire } = await load();
    fire("pointerdown", 1, RIGHT_X_PX, TOUCH_Y_PX);
    fire("pointerdown", 2, RIGHT_X_PX + 50, TOUCH_Y_PX);
    fire("pointermove", 2, RIGHT_X_PX + 90, TOUCH_Y_PX + 30);
    expect(input.look).toEqual({ dx: 0, dy: 0 });
    fire("pointermove", 1, RIGHT_X_PX + 7, TOUCH_Y_PX);
    expect(input.look.dx).toBeCloseTo(7, 6);
  });

  it("tracks one finger per half at the same time", async () => {
    const { input, fire, config } = await load();
    fire("pointerdown", 1, LEFT_X_PX, TOUCH_Y_PX);
    fire("pointerdown", 2, RIGHT_X_PX, TOUCH_Y_PX);
    fire("pointermove", 1, LEFT_X_PX + config.STICK_MAX_TRAVEL_PX, TOUCH_Y_PX);
    fire("pointermove", 2, RIGHT_X_PX + 12, TOUCH_Y_PX);
    expect(input.move.x).toBeCloseTo(1, 6);
    expect(input.look.dx).toBeCloseTo(12, 6);
  });

  it("ignores moves from pointers that never touched down", async () => {
    const { input, fire } = await load();
    fire("pointermove", 9, LEFT_X_PX, TOUCH_Y_PX);
    fire("pointermove", 9, RIGHT_X_PX, TOUCH_Y_PX);
    expect(input.move).toEqual({ x: 0, y: 0 });
    expect(input.look).toEqual({ dx: 0, dy: 0 });
  });

  it("removes the stick and stops listening on dispose", async () => {
    const { host, input, controls, fire, config } = await load();
    fire("pointerdown", 1, LEFT_X_PX, TOUCH_Y_PX);
    fire("pointermove", 1, LEFT_X_PX + config.STICK_MAX_TRAVEL_PX, TOUCH_Y_PX);
    controls.dispose();
    expect(host.querySelectorAll(STICK_SELECTOR)).toHaveLength(0);
    expect(input.move).toEqual({ x: 0, y: 0 });
    fire("pointerdown", 2, RIGHT_X_PX, TOUCH_Y_PX);
    fire("pointermove", 2, RIGHT_X_PX + 30, TOUCH_Y_PX);
    expect(input.look).toEqual({ dx: 0, dy: 0 });
  });

  it("ignores a mouse pointer on the left half: no stick, no move", async () => {
    const { input, fire, stick, config } = await load();
    fire("pointerdown", 1, LEFT_X_PX, TOUCH_Y_PX, "mouse");
    fire("pointermove", 1, LEFT_X_PX + config.STICK_MAX_TRAVEL_PX, TOUCH_Y_PX, "mouse");
    expect(stick()?.style.visibility).toBe("hidden");
    expect(input.move).toEqual({ x: 0, y: 0 });
    expect(input.look).toEqual({ dx: 0, dy: 0 });
  });

  it("ignores a mouse pointer on the right half: no look", async () => {
    const { input, fire, stick } = await load();
    fire("pointerdown", 1, RIGHT_X_PX, TOUCH_Y_PX, "mouse");
    fire("pointermove", 1, RIGHT_X_PX + 30, TOUCH_Y_PX + 10, "mouse");
    expect(input.look).toEqual({ dx: 0, dy: 0 });
    expect(input.move).toEqual({ x: 0, y: 0 });
    expect(stick()?.style.visibility).toBe("hidden");
  });

  it("does not prevent default for a mouse pointerdown and still serves touch afterwards", async () => {
    const { host, input, fire, config } = await load();
    const mouseDown = new PointerEvent("pointerdown", { pointerId: 1, pointerType: "mouse", clientX: LEFT_X_PX, clientY: TOUCH_Y_PX, bubbles: true, cancelable: true });
    host.dispatchEvent(mouseDown);
    expect(mouseDown.defaultPrevented).toBe(false);
    fire("pointerdown", 2, LEFT_X_PX, TOUCH_Y_PX);
    fire("pointermove", 2, LEFT_X_PX + config.STICK_MAX_TRAVEL_PX, TOUCH_Y_PX);
    expect(input.move.x).toBeCloseTo(1, 6);
  });
});
