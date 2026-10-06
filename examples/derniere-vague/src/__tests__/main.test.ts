import * as THREE from "three";
import { GAME_CONFIG } from "@/config/gameConfig";
import { BARRICADE, STATION_LAYOUT, WALL_BUYS, ZONE_IDS } from "@/config/mapConfig";
import { createStationLayout } from "@/logic/map/stationLayout";
import type { Barricades } from "@/logic/map/barricades";
import type { ZoneDoors } from "@/logic/map/zoneDoors";
import { VISUAL_CONFIG, ZOMBIE_VISUAL } from "@/config/visualConfig";
import type * as HitscanModule from "@/logic/combat/hitscan";
import type * as ViewModelModule from "@/render/weapon/viewModel";
import type * as DoorViewModule from "@/render/map/doorView";
import type * as BarricadeViewModule from "@/render/map/barricadeView";
import type * as BoxViewModule from "@/render/map/boxView";
import type * as PowerUpViewModule from "@/render/powerUps/powerUpView";
import type { PowerUps } from "@/logic/powerUps/powerUps";
import { BOX_SPOTS } from "@/config/boxConfig";
import type { MysteryBox } from "@/logic/economy/mysteryBox";
import { AIM_ASSIST_CONE_RAD, KNIFE, WEAPONS } from "@/config/weaponConfig";
import { ROUND_CONFIG } from "@/config/roundConfig";
import { TEXTS } from "@/ui/texts";

const MAIN_MODULE = "@/main";
const PLAYER_CONFIG_MODULE = "@/config/playerConfig";
const ZOMBIE_CONFIG_MODULE = "@/config/zombieConfig";
const FRAME_S = 1 / 60;
const FLICKER_FRAMES = 120;
const MAIN_SEED = 1337;

type LoopCallbacks = { update: (stepS: number) => void; render: (alpha: number, frameS: number) => void };

const mocks = vi.hoisted(() => ({
  renderSpy: vi.fn(),
  loopCallbacks: [] as unknown[],
  canvases: [] as HTMLCanvasElement[],
  shotCalls: [] as unknown[][],
  knifeCalls: [] as unknown[][],
  viewModelEvents: [] as unknown[][],
  doorStates: [] as unknown[],
  barricadeStates: [] as unknown[],
  boxCalls: [] as { box: unknown; frameS: number }[],
  powerUpCalls: [] as { powerUps: unknown; frameS: number }[],
  drawCalls: { count: 0 },
  triangles: { count: 0 },
  setPixelRatio: vi.fn(),
}));

vi.mock("@/render/createRenderer", () => ({
  createRenderer: () => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 0, 0);
    const domElement = document.createElement("canvas");
    mocks.canvases.push(domElement);
    return { renderer: {
        render: mocks.renderSpy,
        setPixelRatio: mocks.setPixelRatio,
        domElement,
        info: {
          render: {
            get calls() {
              return mocks.drawCalls.count;
            },
            get triangles() {
              return mocks.triangles.count;
            },
          },
        },
      }, scene, camera, resize: vi.fn(), testHandle: { scene, camera } };
  },
}));

vi.mock("@/render/map/doorView", async (importOriginal) => {
  const actual = await importOriginal<typeof DoorViewModule>();
  return {
    ...actual,
    createDoorView: (...args: Parameters<typeof actual.createDoorView>) => {
      const view = actual.createDoorView(...args);
      return {
        ...view,
        update: (doors: Parameters<typeof view.update>[0]) => {
          mocks.doorStates.push(doors);
          view.update(doors);
        },
      };
    },
  };
});

vi.mock("@/render/map/barricadeView", async (importOriginal) => {
  const actual = await importOriginal<typeof BarricadeViewModule>();
  return {
    ...actual,
    createBarricadeView: (...args: Parameters<typeof actual.createBarricadeView>) => {
      const view = actual.createBarricadeView(...args);
      return {
        ...view,
        update: (barricades: Parameters<typeof view.update>[0]) => {
          mocks.barricadeStates.push(barricades);
          view.update(barricades);
        },
      };
    },
  };
});

vi.mock("@/render/map/boxView", async (importOriginal) => {
  const actual = await importOriginal<typeof BoxViewModule>();
  return {
    ...actual,
    createBoxView: (...args: Parameters<typeof actual.createBoxView>) => {
      const view = actual.createBoxView(...args);
      return {
        ...view,
        update: (box: Parameters<typeof view.update>[0], frameS: number) => {
          mocks.boxCalls.push({ box, frameS });
          view.update(box, frameS);
        },
      };
    },
  };
});

vi.mock("@/render/powerUps/powerUpView", async (importOriginal) => {
  const actual = await importOriginal<typeof PowerUpViewModule>();
  return {
    ...actual,
    createPowerUpView: (...args: Parameters<typeof actual.createPowerUpView>) => {
      const view = actual.createPowerUpView(...args);
      return {
        ...view,
        update: (powerUps: Parameters<typeof view.update>[0], frameS: number) => {
          mocks.powerUpCalls.push({ powerUps, frameS });
          view.update(powerUps, frameS);
        },
      };
    },
  };
});

vi.mock("@/engine/gameLoop", () => ({
  startGameLoop: (callbacks: unknown) => {
    mocks.loopCallbacks.push(callbacks);
    return () => undefined;
  },
}));

const renderedScene = (): { scene: THREE.Scene; camera: THREE.PerspectiveCamera } => {
  const [scene, camera] = mocks.renderSpy.mock.calls[0] as [THREE.Scene, THREE.PerspectiveCamera];
  return { scene, camera };
};

const startGame = (): void => {
  document.querySelector<HTMLElement>('[data-menu-button="play"]')?.click();
};

const bootMain = async (start = true): Promise<LoopCallbacks> => {
  vi.resetModules();
  vi.spyOn(Date, "now").mockReturnValue(MAIN_SEED);
  mocks.renderSpy.mockClear();
  mocks.loopCallbacks.length = 0;
  mocks.canvases.length = 0;
  mocks.shotCalls.length = 0;
  mocks.knifeCalls.length = 0;
  mocks.viewModelEvents.length = 0;
  mocks.doorStates.length = 0;
  mocks.barricadeStates.length = 0;
  mocks.boxCalls.length = 0;
  mocks.powerUpCalls.length = 0;
  document.body.innerHTML = '<div id="app"></div>';
  await import(/* @vite-ignore */ MAIN_MODULE);
  const callbacks = mocks.loopCallbacks[0] as LoopCallbacks | undefined;
  if (!callbacks) throw new Error("game loop not started");
  callbacks.render(0, FRAME_S);
  if (start) startGame();
  return callbacks;
};

const namesIn = (scene: THREE.Scene): string[] => {
  const names: string[] = [];
  scene.traverse((object) => names.push(object.name));
  return names;
};

describe("main", () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("puts the camera at the layout player start at eye height", async () => {
    await bootMain();
    const { camera } = renderedScene();
    expect(camera.position.x).toBeCloseTo(STATION_LAYOUT.PLAYER_START.x, 6);
    expect(camera.position.z).toBeCloseTo(STATION_LAYOUT.PLAYER_START.z, 6);
    expect(camera.position.y).toBeCloseTo(GAME_CONFIG.PLAYER_EYE_HEIGHT_M, 6);
    expect(Math.abs(camera.position.x)).toBeLessThan(STATION_LAYOUT.HALF_WIDTH_M);
    expect(Math.abs(camera.position.z)).toBeLessThan(STATION_LAYOUT.HALF_DEPTH_M);
  });

  it("renders the built station with entrances, windows and fog instead of the placeholder", async () => {
    await bootMain();
    const { scene } = renderedScene();
    const names = namesIn(scene);
    for (const expected of ["walls", "floor", "ceiling", "zoneFloors", "doors", "barricades", "windowFrames"]) expect(names).toContain(expected);
    expect(scene.fog).toBeInstanceOf(THREE.FogExp2);
    const hemisphereLights: THREE.Object3D[] = [];
    scene.traverse((object) => {
      if (object instanceof THREE.HemisphereLight) hemisphereLights.push(object);
    });
    expect(hemisphereLights).toHaveLength(1);
    const placeholderFloors = scene.children.filter((child) => child instanceof THREE.Mesh && child.geometry instanceof THREE.PlaneGeometry && child.name === "");
    expect(placeholderFloors).toHaveLength(0);
  });

  it("keeps at most 4 dynamic lights while the render callback flickers the lamps", async () => {
    const callbacks = await bootMain();
    const { scene } = renderedScene();
    const lamps: THREE.PointLight[] = [];
    let dynamicCount = 0;
    scene.traverse((object) => {
      if (object instanceof THREE.PointLight) lamps.push(object);
      if (object instanceof THREE.PointLight || object instanceof THREE.SpotLight) dynamicCount++;
    });
    expect(dynamicCount).toBeLessThanOrEqual(4);
    const intensities = new Set<number>();
    for (let frame = 0; frame < FLICKER_FRAMES; frame++) {
      callbacks.render(0, FRAME_S);
      lamps.forEach((lamp) => intensities.add(lamp.intensity));
    }
    expect(intensities.size).toBeGreaterThan(lamps.length);
    expect(mocks.renderSpy).toHaveBeenCalledTimes(FLICKER_FRAMES + 1);
  });
});

const HOST_WIDTH_PX = 800;
const HOST_HEIGHT_PX = 400;
const LEFT_X_PX = 100;
const RIGHT_X_PX = 600;
const TOUCH_Y_PX = 300;
const WALK_STEPS = 60;
const LONG_WALK_STEPS = 600;

const HOST_RECT = { left: 0, top: 0, right: HOST_WIDTH_PX, bottom: HOST_HEIGHT_PX, width: HOST_WIDTH_PX, height: HOST_HEIGHT_PX, x: 0, y: 0, toJSON: () => ({}) };

const loadPlayerConfig = async () => (await import(/* @vite-ignore */ PLAYER_CONFIG_MODULE)).PLAYER_CONFIG;

const touch = (type: string, pointerId: number, clientX: number, clientY: number): void => {
  const host = document.getElementById("app");
  if (!host) throw new Error("#app missing");
  host.dispatchEvent(new PointerEvent(type, { pointerId, clientX, clientY, bubbles: true }));
};

const stepFor = (callbacks: LoopCallbacks, count: number): void => {
  for (let i = 0; i < count; i++) callbacks.update(FRAME_S);
  callbacks.render(0, FRAME_S);
};

describe("main player controls", () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(HOST_RECT);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("walks the camera forward at walking speed when the left half is dragged up", async () => {
    const PLAYER_CONFIG = await loadPlayerConfig();
    const callbacks = await bootMain();
    const { camera } = renderedScene();
    touch("pointerdown", 1, LEFT_X_PX, TOUCH_Y_PX);
    touch("pointermove", 1, LEFT_X_PX, TOUCH_Y_PX - PLAYER_CONFIG.STICK_MAX_TRAVEL_PX);
    stepFor(callbacks, WALK_STEPS);
    expect(STATION_LAYOUT.PLAYER_START.z - camera.position.z).toBeCloseTo(PLAYER_CONFIG.PLAYER_WALK_SPEED_MPS, 2);
    expect(camera.position.x).toBeCloseTo(STATION_LAYOUT.PLAYER_START.x, 6);
    expect(camera.position.y).toBeCloseTo(GAME_CONFIG.PLAYER_EYE_HEIGHT_M, 6);
  });

  it("stops moving once the left finger lifts", async () => {
    const PLAYER_CONFIG = await loadPlayerConfig();
    const callbacks = await bootMain();
    const { camera } = renderedScene();
    touch("pointerdown", 1, LEFT_X_PX, TOUCH_Y_PX);
    touch("pointermove", 1, LEFT_X_PX, TOUCH_Y_PX - PLAYER_CONFIG.STICK_MAX_TRAVEL_PX);
    stepFor(callbacks, WALK_STEPS);
    touch("pointerup", 1, LEFT_X_PX, TOUCH_Y_PX - PLAYER_CONFIG.STICK_MAX_TRAVEL_PX);
    const stoppedAt = camera.position.z;
    stepFor(callbacks, WALK_STEPS);
    expect(camera.position.z).toBe(stoppedAt);
  });

  it("turns the camera with the right half drag and consumes the look delta once", async () => {
    const PLAYER_CONFIG = await loadPlayerConfig();
    const callbacks = await bootMain();
    const { camera } = renderedScene();
    touch("pointerdown", 1, RIGHT_X_PX, TOUCH_Y_PX);
    touch("pointermove", 1, RIGHT_X_PX + 100, TOUCH_Y_PX - 50);
    stepFor(callbacks, 1);
    expect(camera.rotation.order).toBe("YXZ");
    expect(camera.rotation.y).toBeCloseTo(-100 * PLAYER_CONFIG.LOOK_SENSITIVITY_RAD_PER_PX, 6);
    expect(camera.rotation.x).toBeCloseTo(50 * PLAYER_CONFIG.LOOK_SENSITIVITY_RAD_PER_PX, 6);
    stepFor(callbacks, WALK_STEPS);
    expect(camera.rotation.y).toBeCloseTo(-100 * PLAYER_CONFIG.LOOK_SENSITIVITY_RAD_PER_PX, 6);
  });

  it("clamps the camera pitch when dragging far past straight up", async () => {
    const PLAYER_CONFIG = await loadPlayerConfig();
    const callbacks = await bootMain();
    const { camera } = renderedScene();
    touch("pointerdown", 1, RIGHT_X_PX, TOUCH_Y_PX);
    touch("pointermove", 1, RIGHT_X_PX, TOUCH_Y_PX - 1e6);
    stepFor(callbacks, 1);
    expect(camera.rotation.x).toBeCloseTo(PLAYER_CONFIG.LOOK_PITCH_MAX_RAD, 6);
  });

  it("keeps the camera inside the station when pushing into the wall", async () => {
    const PLAYER_CONFIG = await loadPlayerConfig();
    const callbacks = await bootMain();
    const { camera } = renderedScene();
    touch("pointerdown", 1, LEFT_X_PX, TOUCH_Y_PX);
    touch("pointermove", 1, LEFT_X_PX + PLAYER_CONFIG.STICK_MAX_TRAVEL_PX, TOUCH_Y_PX + PLAYER_CONFIG.STICK_MAX_TRAVEL_PX);
    stepFor(callbacks, LONG_WALK_STEPS);
    expect(camera.position.z).toBeLessThanOrEqual(STATION_LAYOUT.HALF_DEPTH_M - PLAYER_CONFIG.PLAYER_RADIUS_M + 1e-3);
    expect(camera.position.x).toBeGreaterThan(STATION_LAYOUT.PLAYER_START.x + 1);
  });

  it("mounts one stick node in the host", async () => {
    await bootMain();
    expect(document.querySelectorAll("#app [data-touch-stick]")).toHaveLength(1);
  });
});

const VIEW = VISUAL_CONFIG.VIEW_MODEL;
const AIM_TOLERANCE = 1e-4;

const setPointerLock = (locked: boolean): void => {
  const canvas = mocks.canvases[0];
  Object.defineProperty(document, "pointerLockElement", { value: locked ? canvas : null, configurable: true });
};

const setCoarsePointer = (coarse: boolean): void => {
  Object.defineProperty(window, "matchMedia", { value: (query: string) => ({ matches: coarse && query === "(pointer: coarse)" }), configurable: true });
};

const mockHitscan = (): void => {
  vi.doMock("@/logic/combat/hitscan", async () => {
    const actual = await vi.importActual<typeof HitscanModule>("@/logic/combat/hitscan");
    return {
      ...actual,
      resolveShot: (...args: Parameters<(typeof HitscanModule)["resolveShot"]>) => {
        mocks.shotCalls.push(args);
        return actual.resolveShot(...args);
      },
      resolveKnife: (...args: Parameters<(typeof HitscanModule)["resolveKnife"]>) => {
        mocks.knifeCalls.push(args);
        return actual.resolveKnife(...args);
      },
    };
  });
};

const SHOT_TARGET_ID = 3;
const KNIFE_TARGET_ID = 4;

const mockHitscanHits = (): void => {
  vi.doMock("@/logic/combat/hitscan", async () => {
    const actual = await vi.importActual<typeof HitscanModule>("@/logic/combat/hitscan");
    return { ...actual, resolveShot: () => ({ targetId: SHOT_TARGET_ID, head: true }), resolveKnife: () => KNIFE_TARGET_ID };
  });
};

const mockViewModelCapture = (): void => {
  vi.doMock("@/render/weapon/viewModel", async () => {
    const actual = await vi.importActual<typeof ViewModelModule>("@/render/weapon/viewModel");
    return {
      ...actual,
      createViewModel: (camera: THREE.Camera) => {
        const real = actual.createViewModel(camera);
        return {
          ...real,
          update: (...args: Parameters<ViewModelModule.ViewModel["update"]>) => {
            mocks.viewModelEvents.push(args[3].map((event) => ({ ...event })));
            real.update(...args);
          },
        };
      },
    };
  });
};

const viewModelOf = (camera: THREE.Camera): THREE.Object3D => {
  const found = camera.getObjectByName("viewModel");
  if (!found) throw new Error("view model missing");
  return found;
};

const pressKey = (type: "keydown" | "keyup", code: string): void => {
  document.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
};

describe("main weapons", () => {
  afterEach(() => {
    vi.doUnmock("@/logic/combat/hitscan");
    vi.doUnmock("@/render/weapon/viewModel");
    Reflect.deleteProperty(window, "matchMedia");
    setPointerLock(false);
    vi.restoreAllMocks();
  });
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });

  it("mounts the six touch buttons next to the stick", async () => {
    await bootMain();
    const names = [...document.querySelectorAll<HTMLElement>("#app [data-touch-button]")].map((node) => node.dataset.touchButton);
    expect(names.sort()).toEqual(["aim", "fire", "interact", "knife", "reload", "swap"]);
    expect(document.querySelectorAll("#app [data-touch-stick]")).toHaveLength(1);
  });

  it("walks with WASD on desktop", async () => {
    const callbacks = await bootMain();
    const { camera } = renderedScene();
    pressKey("keydown", "KeyW");
    stepFor(callbacks, WALK_STEPS);
    pressKey("keyup", "KeyW");
    expect(STATION_LAYOUT.PLAYER_START.z - camera.position.z).toBeGreaterThan(1);
  });

  it("looks with the locked mouse", async () => {
    const callbacks = await bootMain();
    const { camera } = renderedScene();
    setPointerLock(true);
    const move = new MouseEvent("mousemove", { bubbles: true });
    Object.defineProperty(move, "movementX", { value: 40 });
    Object.defineProperty(move, "movementY", { value: 0 });
    document.dispatchEvent(move);
    stepFor(callbacks, 1);
    expect(camera.rotation.y).toBeLessThan(0);
  });

  it("recoils the view model when the touch fire button is pressed and drains the event after render", async () => {
    const callbacks = await bootMain();
    const { camera } = renderedScene();
    const fireButton = document.querySelector<HTMLElement>('[data-touch-button="fire"]');
    fireButton?.dispatchEvent(new PointerEvent("pointerdown", { pointerId: 5, bubbles: true }));
    callbacks.update(FRAME_S);
    callbacks.render(0, FRAME_S);
    const kicked = viewModelOf(camera).position.z;
    expect(kicked).toBeGreaterThan(VIEW.REST_POSITION.z + 0.01);
    expect(viewModelOf(camera).getObjectByName("muzzleFlash")?.visible).toBe(true);
    callbacks.render(0, FRAME_S);
    expect(viewModelOf(camera).position.z).toBeLessThan(kicked - AIM_TOLERANCE);
  });

  it("fires with the left click once the pointer is locked", async () => {
    const callbacks = await bootMain();
    const { camera } = renderedScene();
    setPointerLock(true);
    mocks.canvases[0]?.dispatchEvent(new MouseEvent("mousedown", { button: 0, bubbles: true }));
    callbacks.update(FRAME_S);
    callbacks.render(0, FRAME_S);
    expect(viewModelOf(camera).position.z).toBeGreaterThan(VIEW.REST_POSITION.z + 0.01);
  });

  it("resolves the shot against the target list with the pistol range and no assist on desktop", async () => {
    mockHitscan();
    setCoarsePointer(false);
    const callbacks = await bootMain();
    stepFor(callbacks, ROUND_SPAWN_STEPS);
    document.querySelector('[data-touch-button="fire"]')?.dispatchEvent(new PointerEvent("pointerdown", { pointerId: 5, bubbles: true }));
    callbacks.update(FRAME_S);
    expect(mocks.shotCalls).toHaveLength(1);
    const [, , , targets, rangeM, assistRad] = mocks.shotCalls[0] ?? [];
    expect(targets).toHaveLength(ROUND_CONFIG.ROUND_BASE_COUNT);
    expect(rangeM).toBe(WEAPONS.pistol.RANGE_M);
    expect(assistRad).toBe(0);
  });

  it("passes the aim assist cone on a coarse pointer device", async () => {
    mockHitscan();
    setCoarsePointer(true);
    const callbacks = await bootMain();
    document.querySelector('[data-touch-button="fire"]')?.dispatchEvent(new PointerEvent("pointerdown", { pointerId: 5, bubbles: true }));
    callbacks.update(FRAME_S);
    expect(mocks.shotCalls[0]?.[5]).toBe(AIM_ASSIST_CONE_RAD);
  });

  it("swings the knife with V and resolves it with the knife range", async () => {
    mockHitscan();
    const callbacks = await bootMain();
    const { camera } = renderedScene();
    pressKey("keydown", "KeyV");
    callbacks.update(FRAME_S);
    callbacks.render(0, FRAME_S);
    expect(mocks.knifeCalls).toHaveLength(1);
    expect(mocks.knifeCalls[0]?.[3]).toBe(KNIFE.RANGE_M);
    expect(viewModelOf(camera).getObjectByName("knife")?.visible).toBe(true);
  });

  it("hands a head targetHit event with pistol head damage to the view model after a shot", async () => {
    mockHitscanHits();
    mockViewModelCapture();
    const callbacks = await bootMain();
    document.querySelector('[data-touch-button="fire"]')?.dispatchEvent(new PointerEvent("pointerdown", { pointerId: 5, bubbles: true }));
    callbacks.update(FRAME_S);
    mocks.viewModelEvents.length = 0;
    callbacks.render(0, FRAME_S);
    expect(mocks.viewModelEvents[0]).toContainEqual({
      kind: "targetHit",
      targetId: SHOT_TARGET_ID,
      damage: WEAPONS.pistol.DAMAGE * WEAPONS.pistol.HEAD_MULTIPLIER,
      head: true,
      knife: false,
    });
  });

  it("hands a knife targetHit event with knife damage to the view model after a swing", async () => {
    mockHitscanHits();
    mockViewModelCapture();
    const callbacks = await bootMain();
    pressKey("keydown", "KeyV");
    callbacks.update(FRAME_S);
    mocks.viewModelEvents.length = 0;
    callbacks.render(0, FRAME_S);
    expect(mocks.viewModelEvents[0]).toContainEqual({ kind: "targetHit", targetId: KNIFE_TARGET_ID, damage: KNIFE.DAMAGE, head: false, knife: true });
  });

  it("does not fire when nothing is pressed", async () => {
    mockHitscan();
    const callbacks = await bootMain();
    stepFor(callbacks, WALK_STEPS);
    expect(mocks.shotCalls).toHaveLength(0);
    expect(mocks.knifeCalls).toHaveLength(0);
  });
});

const loadZombieConfig = async () => await import(/* @vite-ignore */ ZOMBIE_CONFIG_MODULE);
const ZOMBIE_SLOT = SHOT_TARGET_ID;
const CHASE_STEPS = 1200;
const ROUND_SPAWN_STEPS = Math.ceil((ROUND_CONFIG.ROUND_BASE_COUNT * ROUND_CONFIG.ROUND_SPAWN_INTERVAL_S + 0.5) / FRAME_S);
const GAME_OVER_STEPS = 2400;
const BREACH_STEPS = Math.ceil((BARRICADE.PLANKS_PER_WINDOW * BARRICADE.TEAR_INTERVAL_S) / FRAME_S);

const zombieGroups = (scene: THREE.Scene): THREE.Object3D[] => scene.getObjectByName("zombies")?.children ?? [];

const pressFire = (): void => {
  document.querySelector('[data-touch-button="fire"]')?.dispatchEvent(new PointerEvent("pointerdown", { pointerId: 5, bubbles: true }));
};

describe("main zombies", () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });
  afterEach(() => {
    vi.doUnmock("@/logic/combat/hitscan");
    vi.doUnmock("@/render/weapon/viewModel");
    Reflect.deleteProperty(window, "matchMedia");
    vi.restoreAllMocks();
  });

  it("renders the pooled zombie views and shows the round 1 zombies as they spawn", async () => {
    const { ZOMBIE_CONFIG } = await loadZombieConfig();
    const callbacks = await bootMain();
    const { scene } = renderedScene();
    expect(zombieGroups(scene)).toHaveLength(ZOMBIE_CONFIG.ZOMBIE_MAX_ALIVE);
    expect(zombieGroups(scene).filter((group) => group.visible)).toHaveLength(0);
    stepFor(callbacks, ROUND_SPAWN_STEPS);
    expect(zombieGroups(scene).filter((group) => group.visible)).toHaveLength(ROUND_CONFIG.ROUND_BASE_COUNT);
  });

  it("moves the round zombies toward the player as the simulation runs", async () => {
    const callbacks = await bootMain();
    const { scene } = renderedScene();
    stepFor(callbacks, ROUND_SPAWN_STEPS + BREACH_STEPS - WALK_STEPS * 2);
    const distances = (): number[] => zombieGroups(scene).filter((group) => group.visible).map((group) => Math.hypot(group.position.x - STATION_LAYOUT.PLAYER_START.x, group.position.z - STATION_LAYOUT.PLAYER_START.z));
    const before = distances();
    expect(before.length).toBeGreaterThan(0);
    stepFor(callbacks, WALK_STEPS * 4);
    const after = distances();
    expect(after).toHaveLength(before.length);
    after.forEach((distance, index) => expect(distance).toBeLessThan((before[index] ?? 0) - 0.5));
  });

  it("hands the zombie hit with the weapon damage to the view model", async () => {
    mockHitscanHits();
    mockViewModelCapture();
    const callbacks = await bootMain();
    stepFor(callbacks, ROUND_SPAWN_STEPS);
    pressFire();
    callbacks.update(FRAME_S);
    mocks.viewModelEvents.length = 0;
    callbacks.render(0, FRAME_S);
    expect(mocks.viewModelEvents[0]).toContainEqual({
      kind: "zombieHit",
      id: SHOT_TARGET_ID,
      damage: WEAPONS.pistol.DAMAGE * WEAPONS.pistol.HEAD_MULTIPLIER,
      head: true,
      knife: false,
    });
  });

  it("kills a zombie with repeated hits then returns its pooled view to hidden", async () => {
    const { ZOMBIE_CONFIG } = await loadZombieConfig();
    mockHitscanHits();
    mockViewModelCapture();
    const callbacks = await bootMain();
    const { scene } = renderedScene();
    stepFor(callbacks, ROUND_SPAWN_STEPS);
    pressFire();
    const killAndFallSteps = WALK_STEPS + Math.ceil(ZOMBIE_CONFIG.ZOMBIE_DEATH_S / FRAME_S);
    for (let i = 0; i < killAndFallSteps; i++) {
      callbacks.update(FRAME_S);
      callbacks.render(0, FRAME_S);
    }
    const killed = mocks.viewModelEvents.flat().filter((event) => (event as { kind: string }).kind === "zombieKilled");
    expect(killed).toContainEqual({ kind: "zombieKilled", id: ZOMBIE_SLOT, headshot: true });
    expect(zombieGroups(scene)[ZOMBIE_SLOT]?.visible).toBe(false);
  });

  it("lets the horde reach the player and hand a playerHit to the view model", async () => {
    const { ZOMBIE_CONFIG } = await loadZombieConfig();
    mockViewModelCapture();
    const callbacks = await bootMain();
    for (let i = 0; i < CHASE_STEPS; i++) {
      callbacks.update(FRAME_S);
      callbacks.render(0, FRAME_S);
    }
    const hits = mocks.viewModelEvents.flat().filter((event) => (event as { kind: string }).kind === "playerHit");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]).toEqual({ kind: "playerHit", damage: ZOMBIE_CONFIG.ZOMBIE_ATTACK_DAMAGE, x: expect.any(Number), z: expect.any(Number) });
  });

  it("hands the round 1 announcement to the view model on the first frame", async () => {
    mockViewModelCapture();
    await bootMain();
    expect(mocks.viewModelEvents[0]).toContainEqual({ kind: "roundStarted", round: 1 });
  });

  it("freezes the player once the horde has killed them", async () => {
    const callbacks = await bootMain();
    const { camera } = renderedScene();
    for (let i = 0; i < GAME_OVER_STEPS; i++) callbacks.update(FRAME_S);
    callbacks.render(0, FRAME_S);
    const frozenZ = camera.position.z;
    pressKey("keydown", "KeyW");
    stepFor(callbacks, WALK_STEPS);
    pressKey("keyup", "KeyW");
    expect(camera.position.z).toBe(frozenZ);
  });
});

const HURT_CLASS = "is-hurt";
const START_POINTS = 500;

const hudNode = (name: string): HTMLElement => {
  const found = document.querySelector<HTMLElement>(`#app [data-hud-${name}]`);
  if (!found) throw new Error(`hud ${name} missing`);
  return found;
};

const menuVisible = (name: string): boolean => document.querySelector(`#app [data-menu="${name}"]`)?.classList.contains("is-visible") === true;

const clickMenuButton = (name: string): void => {
  document.querySelector<HTMLElement>(`#app [data-menu-button="${name}"]`)?.click();
};

const walkForward = (callbacks: LoopCallbacks, camera: THREE.Camera): number => {
  const before = camera.position.z;
  pressKey("keydown", "KeyW");
  stepFor(callbacks, WALK_STEPS);
  pressKey("keyup", "KeyW");
  return before - camera.position.z;
};

const playUntilGameOver = (callbacks: LoopCallbacks): void => {
  for (let i = 0; i < GAME_OVER_STEPS; i++) callbacks.update(FRAME_S);
  callbacks.render(0, FRAME_S);
};

describe("main menus and HUD", () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });
  afterEach(() => {
    vi.doUnmock("@/logic/combat/hitscan");
    Reflect.deleteProperty(window, "matchMedia");
    vi.restoreAllMocks();
  });

  it("shows the start menu with Jouer over the station on load", async () => {
    await bootMain(false);
    expect(menuVisible("start")).toBe(true);
    expect(document.querySelector('#app [data-menu-button="play"]')?.textContent).toBe(TEXTS.play);
    expect(menuVisible("end")).toBe(false);
    expect(menuVisible("portrait")).toBe(false);
  });

  it("keeps the simulation frozen while the start menu is up", async () => {
    const callbacks = await bootMain(false);
    const { camera } = renderedScene();
    expect(walkForward(callbacks, camera)).toBe(0);
    stepFor(callbacks, ROUND_SPAWN_STEPS);
    expect(zombieGroups(renderedScene().scene).filter((group) => group.visible)).toHaveLength(0);
  });

  it("starts a round 1 game with 500 points when Jouer is tapped", async () => {
    const callbacks = await bootMain(false);
    const { camera } = renderedScene();
    clickMenuButton("play");
    stepFor(callbacks, 1);
    expect(menuVisible("start")).toBe(false);
    expect(hudNode("round").textContent).toBe(TEXTS.round(1));
    expect(hudNode("points").textContent).toBe(TEXTS.points(START_POINTS));
    expect(walkForward(callbacks, camera)).toBeGreaterThan(1);
  });

  it("mounts the HUD nodes in the host and fills the full magazine", async () => {
    await bootMain();
    for (const name of ["points", "round", "ammo", "vignette"]) expect(document.querySelectorAll(`#app [data-hud-${name}]`)).toHaveLength(1);
    expect(hudNode("ammo").textContent).toBe(TEXTS.ammo(WEAPONS.pistol.MAG_SIZE, WEAPONS.pistol.RESERVE_AMMO));
  });

  it("fills the touch button labels from TEXTS", async () => {
    await bootMain();
    const label = (name: string): string | undefined => document.querySelector<HTMLElement>(`#app [data-touch-button="${name}"]`)?.textContent ?? undefined;
    expect(label("fire")).toBe(TEXTS.buttonLabels.labelFire);
    expect(label("aim")).toBe(TEXTS.buttonLabels.labelAim);
    expect(label("reload")).toBe(TEXTS.buttonLabels.labelReload);
    expect(label("knife")).toBe(TEXTS.buttonLabels.labelKnife);
    expect(label("interact")).toBe(TEXTS.buttonLabels.labelInteract);
    expect(label("swap")).toBe(TEXTS.buttonLabels.labelSwap);
  });

  it("updates the points and ammo readouts in render after a hit", async () => {
    mockHitscanHits();
    const callbacks = await bootMain();
    stepFor(callbacks, ROUND_SPAWN_STEPS);
    pressFire();
    callbacks.update(FRAME_S);
    callbacks.render(0, FRAME_S);
    expect(Number(/\d+/.exec(hudNode("points").textContent ?? "")?.[0])).toBeGreaterThan(START_POINTS);
    expect(hudNode("ammo").textContent).toBe(TEXTS.ammo(WEAPONS.pistol.MAG_SIZE - 1, WEAPONS.pistol.RESERVE_AMMO));
  });

  it("shows the damage vignette once the horde hurts the player", async () => {
    const callbacks = await bootMain();
    expect(hudNode("vignette").classList.contains(HURT_CLASS)).toBe(false);
    let hurtSeen = false;
    for (let i = 0; i < CHASE_STEPS && !hurtSeen; i++) {
      callbacks.update(FRAME_S);
      callbacks.render(0, FRAME_S);
      hurtSeen = hudNode("vignette").classList.contains(HURT_CLASS);
    }
    expect(hurtSeen).toBe(true);
  });

  it("shows the end screen with the round reached once the player is dead", async () => {
    const callbacks = await bootMain();
    playUntilGameOver(callbacks);
    const reached = Number(/\d+/.exec(hudNode("round").textContent ?? "")?.[0]);
    expect(menuVisible("end")).toBe(true);
    expect(document.querySelector('#app [data-menu="end"]')?.textContent).toContain(TEXTS.gameOver(reached));
    expect(document.querySelector('#app [data-menu-button="replay"]')?.textContent).toBe(TEXTS.replay);
  });

  it("restarts a fresh game at round 1 with 500 points on Rejouer", async () => {
    const callbacks = await bootMain();
    const { camera } = renderedScene();
    playUntilGameOver(callbacks);
    clickMenuButton("replay");
    stepFor(callbacks, 1);
    expect(menuVisible("end")).toBe(false);
    expect(hudNode("round").textContent).toBe(TEXTS.round(1));
    expect(hudNode("points").textContent).toBe(TEXTS.points(START_POINTS));
    expect(hudNode("vignette").classList.contains(HURT_CLASS)).toBe(false);
    expect(walkForward(callbacks, camera)).toBeGreaterThan(1);
  });

  it("pauses the simulation while the device is in portrait and resumes in landscape", async () => {
    const state = { portrait: true };
    Object.defineProperty(window, "matchMedia", { value: (query: string) => ({
        get matches() {
          return state.portrait && query.includes("portrait");
        },
      }), configurable: true });
    const callbacks = await bootMain();
    const { camera } = renderedScene();
    expect(walkForward(callbacks, camera)).toBe(0);
    expect(menuVisible("portrait")).toBe(true);
    expect(document.querySelector('#app [data-menu="portrait"]')?.textContent).toContain(TEXTS.rotateDevice);
    state.portrait = false;
    expect(walkForward(callbacks, camera)).toBeGreaterThan(1);
    expect(menuVisible("portrait")).toBe(false);
  });
});

const AUDIO_CONFIG_MODULE = "@/config/audioConfig";
const loadAudioConfig = async () => (await import(/* @vite-ignore */ AUDIO_CONFIG_MODULE)).AUDIO_CONFIG;

const audioMocks = vi.hoisted(() => ({
  contexts: [] as unknown[],
  oscillators: [] as unknown[],
}));

class FakeMainAudioContext {
  state = "suspended";
  currentTime = 0;
  sampleRate = 44100;
  destination = {};
  resume = vi.fn(() => Promise.resolve());
  listener = {
    positionX: { value: 0 },
    positionY: { value: 0 },
    positionZ: { value: 0 },
    forwardX: { value: 0 },
    forwardY: { value: 0 },
    forwardZ: { value: 0 },
    upX: { value: 0 },
    upY: { value: 0 },
    upZ: { value: 0 },
  };
  constructor() {
    audioMocks.contexts.push(this);
  }
  private param() {
    return { value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() };
  }
  private node(extra: Record<string, unknown> = {}) {
    return { connect: vi.fn(), disconnect: vi.fn(), ...extra };
  }
  createGain() {
    return this.node({ gain: this.param() });
  }
  createBiquadFilter() {
    return this.node({ frequency: this.param(), Q: this.param() });
  }
  createPanner() {
    return this.node({ positionX: this.param(), positionY: this.param(), positionZ: this.param() });
  }
  createBuffer(_channels: number, length: number) {
    return { getChannelData: () => new Float32Array(length) };
  }
  createBufferSource() {
    return this.node({ start: vi.fn(), stop: vi.fn(), onended: null });
  }
  createOscillator() {
    const oscillator = this.node({ frequency: this.param(), start: vi.fn(), stop: vi.fn(), onended: null });
    audioMocks.oscillators.push(oscillator);
    return oscillator;
  }
}

const lastAudioContext = (): FakeMainAudioContext => audioMocks.contexts[audioMocks.contexts.length - 1] as FakeMainAudioContext;

describe("main audio", () => {
  beforeEach(() => {
    audioMocks.contexts.length = 0;
    audioMocks.oscillators.length = 0;
    vi.stubGlobal("AudioContext", FakeMainAudioContext);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(HOST_RECT);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("keeps the audio context untouched and silent until the start menu is tapped", async () => {
    const callbacks = await bootMain(false);
    callbacks.render(0, FRAME_S);
    callbacks.render(0, FRAME_S);
    expect(audioMocks.contexts).toHaveLength(0);
    expect(audioMocks.oscillators).toHaveLength(0);
  });

  it("unlocks the audio context on the start tap and plays the round jingle once", async () => {
    const AUDIO_CONFIG = await loadAudioConfig();
    const callbacks = await bootMain();
    expect(audioMocks.contexts).toHaveLength(1);
    expect(lastAudioContext().resume).toHaveBeenCalledTimes(1);
    expect(audioMocks.oscillators).toHaveLength(0);
    callbacks.render(0, FRAME_S);
    expect(audioMocks.oscillators).toHaveLength(AUDIO_CONFIG.SOUNDS.ROUND_JINGLE.tones.length);
    callbacks.render(0, FRAME_S);
    callbacks.render(0, FRAME_S);
    expect(audioMocks.oscillators).toHaveLength(AUDIO_CONFIG.SOUNDS.ROUND_JINGLE.tones.length);
  });

  it("follows the camera with the audio listener on every render", async () => {
    const PLAYER_CONFIG = await loadPlayerConfig();
    const callbacks = await bootMain();
    callbacks.render(0, FRAME_S);
    const { camera } = renderedScene();
    const { listener } = lastAudioContext();
    expect(listener.positionX.value).toBeCloseTo(camera.position.x, 6);
    expect(listener.positionY.value).toBeCloseTo(GAME_CONFIG.PLAYER_EYE_HEIGHT_M, 6);
    expect(listener.positionZ.value).toBeCloseTo(camera.position.z, 6);
    touch("pointerdown", 1, LEFT_X_PX, TOUCH_Y_PX);
    touch("pointermove", 1, LEFT_X_PX, TOUCH_Y_PX - PLAYER_CONFIG.STICK_MAX_TRAVEL_PX);
    stepFor(callbacks, WALK_STEPS);
    expect(listener.positionZ.value).toBeCloseTo(camera.position.z, 6);
    expect(listener.positionZ.value).toBeLessThan(STATION_LAYOUT.PLAYER_START.z);
    expect(listener.forwardX.value).toBeCloseTo(-Math.sin(camera.rotation.y), 6);
    expect(listener.forwardZ.value).toBeCloseTo(-Math.cos(camera.rotation.y), 6);
  });

  it("plays footsteps while the player walks", async () => {
    const PLAYER_CONFIG = await loadPlayerConfig();
    const callbacks = await bootMain();
    callbacks.render(0, FRAME_S);
    const afterJingle = audioMocks.oscillators.length;
    touch("pointerdown", 1, LEFT_X_PX, TOUCH_Y_PX);
    touch("pointermove", 1, LEFT_X_PX, TOUCH_Y_PX - PLAYER_CONFIG.STICK_MAX_TRAVEL_PX);
    for (let frame = 0; frame < WALK_STEPS; frame++) {
      callbacks.update(FRAME_S);
      callbacks.render(0, FRAME_S);
    }
    expect(audioMocks.oscillators.length).toBeGreaterThan(afterJingle);
  });

  it("still boots and starts without any AudioContext on the platform", async () => {
    vi.unstubAllGlobals();
    vi.stubGlobal("AudioContext", undefined);
    const callbacks = await bootMain();
    expect(() => stepFor(callbacks, WALK_STEPS)).not.toThrow();
    expect(audioMocks.contexts).toHaveLength(0);
  });
});

const SHOTGUN_SPOT = WALL_BUYS.find((buy) => buy.weaponId === "shotgun");
const WALK_TO_SPOT_STEPS = 60;
const WALK_AWAY_STEPS = 120;
const FRAME_WINDOW_STEPS = 5;
const DENIED_CLASS = "is-denied";
const VISIBLE_CLASS = "is-visible";

const interactButton = (): HTMLElement => {
  const found = document.querySelector<HTMLElement>('#app [data-touch-button="interact"]');
  if (!found) throw new Error("interact button missing");
  return found;
};

const walkKey = (callbacks: LoopCallbacks, code: string, steps: number): void => {
  pressKey("keydown", code);
  stepFor(callbacks, steps);
  pressKey("keyup", code);
};

describe("main wall buys", () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });
  afterEach(() => {
    Reflect.deleteProperty(window, "matchMedia");
    vi.restoreAllMocks();
  });

  it("mounts one silhouette mesh, one plate mesh and one label per wall spot in the scene", async () => {
    await bootMain();
    const { scene } = renderedScene();
    expect(scene.getObjectByName("wallBuySilhouettes")).toBeInstanceOf(THREE.Mesh);
    expect(scene.getObjectByName("wallBuyPlates")).toBeInstanceOf(THREE.Mesh);
    expect(scene.getObjectByName("wallBuyLabels")?.children).toHaveLength(WALL_BUYS.length);
  });

  it("hides the touch Interact button and the prompt while out of reach of every spot", async () => {
    const callbacks = await bootMain();
    stepFor(callbacks, 1);
    expect(interactButton().style.display).toBe("none");
    expect(hudNode("prompt").classList.contains(VISIBLE_CLASS)).toBe(false);
  });

  it("shows the Acheter prompt and the Interact button within reach of a wall spot", async () => {
    if (!SHOTGUN_SPOT) throw new Error("shotgun spot missing");
    const callbacks = await bootMain();
    walkKey(callbacks, "KeyS", WALK_TO_SPOT_STEPS);
    expect(interactButton().style.display).not.toBe("none");
    expect(hudNode("prompt").classList.contains(VISIBLE_CLASS)).toBe(true);
    expect(hudNode("prompt").textContent).toBe(TEXTS.buyWeapon(TEXTS.weaponNames.shotgun, WEAPONS.shotgun.WALL_PRICE_POINTS));
  });

  it("carries the denied style when the points fall short of the price", async () => {
    const callbacks = await bootMain();
    walkKey(callbacks, "KeyS", WALK_TO_SPOT_STEPS);
    expect(WEAPONS.shotgun.WALL_PRICE_POINTS).toBeGreaterThan(START_POINTS);
    expect(hudNode("prompt").classList.contains(DENIED_CLASS)).toBe(true);
  });

  it("hides the prompt and the Interact button again after walking away", async () => {
    const callbacks = await bootMain();
    walkKey(callbacks, "KeyS", WALK_TO_SPOT_STEPS);
    walkKey(callbacks, "KeyW", WALK_AWAY_STEPS);
    expect(interactButton().style.display).toBe("none");
    expect(hudNode("prompt").classList.contains(VISIBLE_CLASS)).toBe(false);
  });

  it("only writes the Interact button when the prompt availability changes", async () => {
    const callbacks = await bootMain();
    walkKey(callbacks, "KeyS", WALK_TO_SPOT_STEPS);
    const observer = new MutationObserver(() => undefined);
    observer.observe(interactButton(), { attributes: true });
    for (let frame = 0; frame < FRAME_WINDOW_STEPS; frame++) callbacks.render(0, FRAME_S);
    expect(observer.takeRecords()).toHaveLength(0);
    observer.disconnect();
  });
});

const PLANK_NAME_PREFIX = "barricade-";
const DOORS_PER_STATION = ZONE_IDS.length;
const SIMULATED_BREACH_STEPS = ROUND_SPAWN_STEPS + Math.ceil((2 * BARRICADE.TEAR_INTERVAL_S) / FRAME_S);
const ALONG_TOLERANCE_M = 1e-6;

const latestDoors = (): ZoneDoors => {
  const doors = mocks.doorStates.at(-1) as ZoneDoors | undefined;
  if (!doors) throw new Error("door view never updated");
  return doors;
};

const latestBarricades = (): Barricades => {
  const barricades = mocks.barricadeStates.at(-1) as Barricades | undefined;
  if (!barricades) throw new Error("barricade view never updated");
  return barricades;
};

const visiblePlanksOf = (scene: THREE.Scene, windowId: string): number => (scene.getObjectByName(`${PLANK_NAME_PREFIX}${windowId}`)?.children ?? []).filter((plank) => plank.visible).length;

describe("main doors and barricades", () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });
  afterEach(() => {
    Reflect.deleteProperty(window, "matchMedia");
    vi.restoreAllMocks();
  });

  it("mounts one door group per entrance and PLANKS_PER_WINDOW planks per window of the layout", async () => {
    await bootMain();
    const { scene } = renderedScene();
    expect(scene.getObjectByName("doors")?.children).toHaveLength(DOORS_PER_STATION);
    const layout = createStationLayout();
    expect(scene.getObjectByName("barricades")?.children).toHaveLength(layout.windows.length);
    for (const windowSpec of layout.windows) expect(visiblePlanksOf(scene, windowSpec.id)).toBe(BARRICADE.PLANKS_PER_WINDOW);
  });

  it("updates both views every frame with the session doors and barricades", async () => {
    const callbacks = await bootMain();
    const doorFrames = mocks.doorStates.length;
    const barricadeFrames = mocks.barricadeStates.length;
    stepFor(callbacks, 0);
    for (let frame = 0; frame < FRAME_WINDOW_STEPS; frame++) callbacks.render(0, FRAME_S);
    expect(mocks.doorStates.length).toBe(doorFrames + FRAME_WINDOW_STEPS + 1);
    expect(mocks.barricadeStates.length).toBe(barricadeFrames + FRAME_WINDOW_STEPS + 1);
    expect(Object.keys(latestDoors()).sort()).toEqual([...ZONE_IDS].sort());
    expect(latestBarricades().windows).toHaveLength(createStationLayout().windows.length);
  });

  it("hides the debris pile and slides the door aside when the session doors open", async () => {
    const callbacks = await bootMain();
    const { scene } = renderedScene();
    const slab = scene.getObjectByName("doorSlab");
    if (!slab) throw new Error("door slab missing");
    const closedAt = slab.getWorldPosition(new THREE.Vector3());
    callbacks.render(0, FRAME_S);
    const doors = latestDoors();
    doors.north = { kind: "open" };
    doors.east = { kind: "open" };
    callbacks.render(0, FRAME_S);
    expect(scene.getObjectByName("door-north")?.visible).toBe(false);
    expect(scene.getObjectByName("door-west")?.visible).toBe(true);
    expect(scene.getObjectByName("door-east")?.visible).toBe(true);
    const openAt = slab.getWorldPosition(new THREE.Vector3());
    expect(closedAt.distanceTo(openAt)).toBeGreaterThan(ALONG_TOLERANCE_M);
  });

  it("shows exactly the planks the session barricades hold", async () => {
    const callbacks = await bootMain();
    const { scene } = renderedScene();
    callbacks.render(0, FRAME_S);
    const barricades = latestBarricades();
    const target = barricades.windows[0];
    if (!target) throw new Error("no window");
    target.planks = 2;
    callbacks.render(0, FRAME_S);
    expect(visiblePlanksOf(scene, target.id)).toBe(2);
    for (const other of barricades.windows.slice(1)) expect(visiblePlanksOf(scene, other.id)).toBe(other.planks);
  });

  it("removes planks on screen as the round zombies tear them off", async () => {
    const callbacks = await bootMain();
    const { scene } = renderedScene();
    stepFor(callbacks, SIMULATED_BREACH_STEPS);
    const barricades = latestBarricades();
    const torn = barricades.windows.filter((barricadeWindow) => barricadeWindow.planks < BARRICADE.PLANKS_PER_WINDOW);
    expect(torn.length).toBeGreaterThan(0);
    for (const barricadeWindow of barricades.windows) expect(visiblePlanksOf(scene, barricadeWindow.id)).toBe(barricadeWindow.planks);
  });
});

const BOX_FRAMES = 30;
const BOX_ROLL_FRAMES = 90;
const LID_OPEN_RAD = 1;

const latestBox = (): MysteryBox => {
  const call = mocks.boxCalls.at(-1);
  if (!call) throw new Error("box view never updated");
  return call.box as MysteryBox;
};

const objectNamed = (scene: THREE.Scene, name: string): THREE.Object3D => {
  const found = scene.getObjectByName(name);
  if (!found) throw new Error(`${name} missing`);
  return found;
};

describe("main mystery box", () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });
  afterEach(() => {
    Reflect.deleteProperty(window, "matchMedia");
    vi.restoreAllMocks();
  });

  it("mounts the chest at the starting spot of the session box", async () => {
    await bootMain();
    const { scene } = renderedScene();
    const spot = BOX_SPOTS[0];
    if (!spot) throw new Error("no spot");
    const root = objectNamed(scene, "mysteryBox");
    expect(root.position.x).toBeCloseTo(spot.x, 6);
    expect(root.position.z).toBeCloseTo(spot.z, 6);
    expect(objectNamed(scene, "boxBeam").visible).toBe(true);
  });

  it("updates the view every frame with the live session box and the frame time", async () => {
    const callbacks = await bootMain();
    callbacks.render(0, FRAME_S);
    const frames = mocks.boxCalls.length;
    const box = latestBox();
    for (let frame = 0; frame < BOX_FRAMES; frame++) callbacks.render(0, FRAME_S);
    expect(mocks.boxCalls.length).toBe(frames + BOX_FRAMES);
    expect(mocks.boxCalls.at(-1)?.frameS).toBe(FRAME_S);
    expect(latestBox()).toBe(box);
    expect(Object.keys(box).sort()).toEqual(["rolls", "spot", "state"]);
  });

  it("feeds the view the box of the session started by Jouer", async () => {
    const callbacks = await bootMain(false);
    callbacks.render(0, FRAME_S);
    const menuBox = latestBox();
    startGame();
    callbacks.render(0, FRAME_S);
    expect(latestBox()).not.toBe(menuBox);
  });

  it("opens the lid and shows silhouettes when the session box is rolling", async () => {
    const callbacks = await bootMain();
    const { scene } = renderedScene();
    callbacks.render(0, FRAME_S);
    latestBox().state = { kind: "rolling", remainingS: 1e9 };
    for (let frame = 0; frame < BOX_ROLL_FRAMES; frame++) callbacks.render(0, FRAME_S);
    expect(Math.abs(objectNamed(scene, "boxLid").rotation.x)).toBeGreaterThan(LID_OPEN_RAD);
    expect(objectNamed(scene, "boxSilhouettes").visible).toBe(true);
  });

  it("moves the chest and its beam to the new spot of the session box", async () => {
    const callbacks = await bootMain();
    const { scene } = renderedScene();
    callbacks.render(0, FRAME_S);
    latestBox().spot = 1;
    callbacks.render(0, FRAME_S);
    const spot = BOX_SPOTS[1];
    if (!spot) throw new Error("no second spot");
    const root = objectNamed(scene, "mysteryBox");
    expect(root.position.x).toBeCloseTo(spot.x, 6);
    expect(root.position.z).toBeCloseTo(spot.z, 6);
    scene.updateMatrixWorld(true);
    const beam = objectNamed(scene, "boxBeam").getWorldPosition(new THREE.Vector3());
    expect(beam.x).toBeCloseTo(spot.x, 6);
    expect(beam.z).toBeCloseTo(spot.z, 6);
  });
});

const POWER_UP_X = 4.5;
const POWER_UP_Z = -3.5;
const POWER_UP_LIFETIME_S = 20;

const latestPowerUps = (): PowerUps => {
  const call = mocks.powerUpCalls.at(-1);
  if (!call) throw new Error("power-up view never updated");
  return call.powerUps as PowerUps;
};

describe("main power-ups", () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });
  afterEach(() => {
    Reflect.deleteProperty(window, "matchMedia");
    vi.restoreAllMocks();
  });

  it("mounts the power-up pool in the scene with every token hidden", async () => {
    await bootMain();
    const { scene } = renderedScene();
    const pool = objectNamed(scene, "powerUps");
    expect(pool.children.length).toBeGreaterThan(0);
    expect(pool.children.filter((token) => token.visible)).toHaveLength(0);
  });

  it("updates the view every frame with the live session power-ups and the frame time", async () => {
    const callbacks = await bootMain();
    callbacks.render(0, FRAME_S);
    const frames = mocks.powerUpCalls.length;
    const powerUps = latestPowerUps();
    for (let frame = 0; frame < BOX_FRAMES; frame++) callbacks.render(0, FRAME_S);
    expect(mocks.powerUpCalls.length).toBe(frames + BOX_FRAMES);
    expect(mocks.powerUpCalls.at(-1)?.frameS).toBe(FRAME_S);
    expect(latestPowerUps()).toBe(powerUps);
    expect(Object.keys(powerUps).sort()).toEqual(["drops", "dropsThisRound", "timers"]);
  });

  it("feeds the view the power-ups of the session started by Jouer", async () => {
    const callbacks = await bootMain(false);
    callbacks.render(0, FRAME_S);
    const menuPowerUps = latestPowerUps();
    startGame();
    callbacks.render(0, FRAME_S);
    expect(latestPowerUps()).not.toBe(menuPowerUps);
  });

  it("shows a floating token at the position of a drop of the session", async () => {
    const callbacks = await bootMain();
    const { scene } = renderedScene();
    callbacks.render(0, FRAME_S);
    const drop = latestPowerUps().drops[0];
    if (!drop) throw new Error("no drop slot");
    Object.assign(drop, { active: true, kind: "nuke", x: POWER_UP_X, z: POWER_UP_Z, remainingS: POWER_UP_LIFETIME_S });
    callbacks.render(0, FRAME_S);
    scene.updateMatrixWorld(true);
    const shown = objectNamed(scene, "powerUps").children.filter((token) => token.visible);
    expect(shown).toHaveLength(1);
    const world = shown[0]?.getWorldPosition(new THREE.Vector3());
    expect(world?.x).toBeCloseTo(POWER_UP_X, 6);
    expect(world?.z).toBeCloseTo(POWER_UP_Z, 6);
    expect(world?.y).toBeGreaterThan(0);
  });
});

const crosshairRoot = (): HTMLElement => {
  const found = document.querySelector<HTMLElement>(".crosshair");
  if (!found) throw new Error("crosshair missing");
  return found;
};
const crosshairMarker = (): HTMLElement => {
  const found = document.querySelector<HTMLElement>(".crosshair__marker");
  if (!found) throw new Error("crosshair marker missing");
  return found;
};
const crosshairGap = (): number => Number.parseFloat(crosshairRoot().style.getPropertyValue("--gap"));

describe("main crosshair", () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });
  afterEach(() => {
    vi.doUnmock("@/logic/combat/hitscan");
    Reflect.deleteProperty(window, "matchMedia");
    vi.restoreAllMocks();
  });

  it("mounts one crosshair with its marker in the host at the rest gap", async () => {
    await bootMain();
    expect(document.querySelectorAll("#app .crosshair")).toHaveLength(1);
    expect(document.querySelectorAll("#app .crosshair__marker")).toHaveLength(1);
    expect(crosshairGap()).toBe(VISUAL_CONFIG.CROSSHAIR.REST_GAP_PX);
  });

  it("widens the gap on the frame a shot is fired, before the events are cleared", async () => {
    const callbacks = await bootMain();
    pressFire();
    callbacks.update(FRAME_S);
    callbacks.render(0, FRAME_S);
    expect(crosshairGap()).toBeGreaterThan(VISUAL_CONFIG.CROSSHAIR.REST_GAP_PX);
    document.querySelector('[data-touch-button="fire"]')?.dispatchEvent(new PointerEvent("pointerup", { pointerId: 5, bubbles: true }));
    for (let frame = 0; frame < WALK_STEPS; frame++) {
      callbacks.update(FRAME_S);
      callbacks.render(0, FRAME_S);
    }
    expect(crosshairGap()).toBe(VISUAL_CONFIG.CROSSHAIR.REST_GAP_PX);
  });

  it("widens the gap while the stick is pushed", async () => {
    const callbacks = await bootMain();
    pressKey("keydown", "KeyW");
    stepFor(callbacks, 2);
    expect(crosshairGap()).toBeGreaterThan(VISUAL_CONFIG.CROSSHAIR.REST_GAP_PX);
    pressKey("keyup", "KeyW");
    stepFor(callbacks, 2);
    expect(crosshairGap()).toBe(VISUAL_CONFIG.CROSSHAIR.REST_GAP_PX);
  });

  it("shows the marker on the frame a bullet hits a zombie", async () => {
    mockHitscanHits();
    const callbacks = await bootMain();
    stepFor(callbacks, ROUND_SPAWN_STEPS);
    expect(crosshairMarker().classList.contains("is-visible")).toBe(false);
    pressFire();
    callbacks.update(FRAME_S);
    callbacks.render(0, FRAME_S);
    expect(crosshairMarker().classList.contains("is-visible")).toBe(true);
    expect(crosshairMarker().classList.contains("is-kill")).toBe(false);
  });

  it("turns the marker red on the frame a hit kills the zombie", async () => {
    mockHitscanHits();
    const callbacks = await bootMain();
    stepFor(callbacks, ROUND_SPAWN_STEPS);
    pressFire();
    let sawKill = false;
    for (let frame = 0; frame < WALK_STEPS * 2; frame++) {
      callbacks.update(FRAME_S);
      callbacks.render(0, FRAME_S);
      sawKill = sawKill || crosshairMarker().classList.contains("is-kill");
    }
    expect(sawKill).toBe(true);
  });
});

const arcNodes = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>("#app .damage-arc")];
const activeArcs = (): HTMLElement[] => arcNodes().filter((arc) => arc.classList.contains("is-active"));

describe("main damage indicator", () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });
  afterEach(() => {
    vi.doUnmock("@/render/weapon/viewModel");
    Reflect.deleteProperty(window, "matchMedia");
    vi.restoreAllMocks();
  });

  it("mounts the pooled arcs in the host with none showing at the start", async () => {
    await bootMain();
    expect(document.querySelectorAll("#app .damage-indicator")).toHaveLength(1);
    expect(arcNodes()).toHaveLength(VISUAL_CONFIG.DAMAGE_ARC.POOL_SIZE);
    expect(activeArcs()).toHaveLength(0);
  });

  it("raises a directed arc on the frame a zombie hits, before the events are cleared", async () => {
    const callbacks = await bootMain();
    let shown = 0;
    for (let i = 0; i < CHASE_STEPS && shown === 0; i++) {
      callbacks.update(FRAME_S);
      callbacks.render(0, FRAME_S);
      shown = activeArcs().length;
    }
    expect(shown).toBeGreaterThan(0);
    expect(Number.isFinite(Number.parseFloat(activeArcs()[0]?.style.getPropertyValue("--arc-angle") ?? "NaN"))).toBe(true);
  });
});

const SPOT_PAUSE_FRAMES = 3;

const denialsAndPurchases = (): unknown[] =>
  mocks.viewModelEvents.flat().filter((event) => ["purchaseDenied", "purchaseDone"].includes((event as { kind: string }).kind));

const tapInteractKey = (): void => {
  pressKey("keydown", "KeyE");
  pressKey("keyup", "KeyE");
};

const bootAtShotgunSpot = async (): Promise<LoopCallbacks> => {
  mockViewModelCapture();
  const callbacks = await bootMain();
  walkKey(callbacks, "KeyS", WALK_TO_SPOT_STEPS);
  mocks.viewModelEvents.length = 0;
  return callbacks;
};

describe("main input latches across pause and blur", () => {
  const portraitState = { portrait: false };
  beforeEach(() => {
    portraitState.portrait = false;
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    Object.defineProperty(window, "matchMedia", {
      value: (query: string) => ({
        get matches() {
          return portraitState.portrait && query.includes("portrait");
        },
      }),
      configurable: true,
    });
  });
  afterEach(() => {
    vi.doUnmock("@/render/weapon/viewModel");
    Reflect.deleteProperty(window, "matchMedia");
    vi.restoreAllMocks();
  });

  it("registers a tapped E at a wall buy when the game runs", async () => {
    const callbacks = await bootAtShotgunSpot();
    tapInteractKey();
    stepFor(callbacks, SPOT_PAUSE_FRAMES);
    expect(denialsAndPurchases().length).toBeGreaterThan(0);
  });

  it("drops an E pressed while paused instead of buying on resume", async () => {
    const callbacks = await bootAtShotgunSpot();
    portraitState.portrait = true;
    stepFor(callbacks, 1);
    tapInteractKey();
    stepFor(callbacks, SPOT_PAUSE_FRAMES);
    portraitState.portrait = false;
    stepFor(callbacks, SPOT_PAUSE_FRAMES);
    expect(denialsAndPurchases()).toHaveLength(0);
  });

  it("drops an E pressed before the window loses focus", async () => {
    const callbacks = await bootAtShotgunSpot();
    tapInteractKey();
    window.dispatchEvent(new Event("blur"));
    stepFor(callbacks, SPOT_PAUSE_FRAMES);
    expect(denialsAndPurchases()).toHaveLength(0);
  });
});

const LONG_FRAME_S = 1;
const DECAL_ZOMBIE_REACH_M = 1;

const dustPositions = (scene: THREE.Scene): Float32Array => {
  const points = objectNamed(scene, "dust") as THREE.Points;
  return points.geometry.getAttribute("position").array as Float32Array;
};

describe("main ambience effects", () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });
  afterEach(() => {
    vi.doUnmock("@/logic/combat/hitscan");
    Reflect.deleteProperty(window, "matchMedia");
    vi.restoreAllMocks();
  });

  it("mounts one dust cloud with the configured particle count and keeps it around the camera each frame", async () => {
    const callbacks = await bootMain();
    const { scene, camera } = renderedScene();
    const dust = objectNamed(scene, "dust") as THREE.Points;
    expect(dust).toBeInstanceOf(THREE.Points);
    expect(dust.geometry.getAttribute("position").count).toBe(VISUAL_CONFIG.DUST.COUNT);
    const half = VISUAL_CONFIG.DUST.BOX_M / 2;
    const buffer = dustPositions(scene);
    callbacks.render(0, FRAME_S);
    for (let index = 0; index < VISUAL_CONFIG.DUST.COUNT; index++) {
      expect(Math.abs((buffer[index * 3] as number) - camera.position.x)).toBeLessThanOrEqual(half + 1e-4);
      expect(Math.abs((buffer[index * 3 + 1] as number) - camera.position.y)).toBeLessThanOrEqual(half + 1e-4);
      expect(Math.abs((buffer[index * 3 + 2] as number) - camera.position.z)).toBeLessThanOrEqual(half + 1e-4);
    }
    expect(dustPositions(scene)).toBe(buffer);
  });

  it("drifts the dust with the frame time handed to render", async () => {
    const callbacks = await bootMain();
    const { scene } = renderedScene();
    callbacks.render(0, FRAME_S);
    const before = Float32Array.from(dustPositions(scene));
    callbacks.render(0, 0);
    expect(Array.from(dustPositions(scene))).toEqual(Array.from(before));
    callbacks.render(0, LONG_FRAME_S);
    expect(Array.from(dustPositions(scene))).not.toEqual(Array.from(before));
  });

  it("mounts the blood decal pool hidden next to the dust", async () => {
    await bootMain();
    const { scene } = renderedScene();
    const pool = objectNamed(scene, "bloodDecals");
    expect(pool.children).toHaveLength(VISUAL_CONFIG.BLOOD_DECAL.POOL_SIZE);
    expect(pool.children.filter((decal) => decal.visible)).toHaveLength(0);
  });

  it("shows a decal under the zombie the player just hit, fed by the live events and horde of the frame", async () => {
    mockHitscanHits();
    const callbacks = await bootMain();
    const { scene } = renderedScene();
    stepFor(callbacks, ROUND_SPAWN_STEPS);
    expect(objectNamed(scene, "bloodDecals").children.filter((decal) => decal.visible)).toHaveLength(0);
    pressFire();
    callbacks.update(FRAME_S);
    callbacks.render(0, FRAME_S);
    scene.updateMatrixWorld(true);
    const shown = objectNamed(scene, "bloodDecals").children.filter((decal) => decal.visible);
    expect(shown.length).toBeGreaterThanOrEqual(1);
    const zombie = zombieGroups(scene)[SHOT_TARGET_ID];
    if (!zombie) throw new Error("zombie group missing");
    const floorDecal = shown.find((decal) => Math.abs(decal.rotation.x + Math.PI / 2) < 1e-6);
    expect(floorDecal).toBeDefined();
    expect(Math.hypot((floorDecal as THREE.Object3D).position.x - zombie.position.x, (floorDecal as THREE.Object3D).position.z - zombie.position.z)).toBeLessThan(DECAL_ZOMBIE_REACH_M);
  });
});

const DEBUG_SELECTOR = ".debug-counter";
const DEBUG_FPS_FRAME_S = 1 / 50;
const DEBUG_DRAW_CALLS = 37;

describe("main debug overlay", () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState(null, "", "/");
  });

  it("mounts no counter without the debug parameter", async () => {
    window.history.replaceState(null, "", "/");
    await bootMain();
    expect(document.querySelector(DEBUG_SELECTOR)).toBeNull();
  });

  it("mounts a counter with ?debug=1 fed by frame time and renderer draw calls", async () => {
    window.history.replaceState(null, "", "/?debug=1");
    mocks.drawCalls.count = DEBUG_DRAW_CALLS;
    const callbacks = await bootMain();
    callbacks.render(0, DEBUG_FPS_FRAME_S);
    const counter = document.querySelector(DEBUG_SELECTOR);
    expect(counter).not.toBeNull();
    expect(counter?.textContent).toBe(TEXTS.debugCounter(Math.round(1 / DEBUG_FPS_FRAME_S), DEBUG_DRAW_CALLS));
    mocks.drawCalls.count = 0;
  });
});

const QA_DRAW_CALLS = 52;
const QA_TRIANGLES = 18340;
const QA_FRAME_S = 1 / 40;
const QA_SPAWN_STEPS = 5;
const QA_DEVICE_PIXEL_RATIO = 2;
const QA_SLOW_FRAME_S = 0.05;

type QaWindow = Window & { __qa?: () => Record<string, unknown> };

const readQa = (): Record<string, unknown> => {
  const qa = (window as QaWindow).__qa;
  if (!qa) throw new Error("__qa missing");
  return qa();
};

describe("main QA hook and adaptive quality", () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    mocks.setPixelRatio.mockClear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    mocks.drawCalls.count = 0;
    mocks.triangles.count = 0;
    Object.defineProperty(window, "devicePixelRatio", { value: 1, configurable: true });
    delete (window as QaWindow).__qa;
  });

  it("exposes window.__qa with fps, draw calls, triangles, phase, round and alive count of the current frame", async () => {
    mocks.drawCalls.count = QA_DRAW_CALLS;
    mocks.triangles.count = QA_TRIANGLES;
    const callbacks = await bootMain();
    callbacks.render(0, QA_FRAME_S);
    expect(readQa()).toEqual({ fps: 1 / QA_FRAME_S, drawCalls: QA_DRAW_CALLS, triangles: QA_TRIANGLES, phase: "playing", round: 1, alive: 0 });
    stepFor(callbacks, QA_SPAWN_STEPS);
    const alive = readQa().alive as number;
    expect(alive).toBeGreaterThan(0);
    mocks.drawCalls.count = QA_DRAW_CALLS + 1;
    callbacks.render(0, QA_FRAME_S);
    expect(readQa().drawCalls).toBe(QA_DRAW_CALLS + 1);
    expect(readQa().alive).toBe(alive);
  });

  it("leaves the dying zombies out of the QA alive count", async () => {
    const callbacks = await bootMain();
    stepFor(callbacks, QA_SPAWN_STEPS);
    expect(readQa().alive as number).toBeGreaterThan(0);
    const drop = latestPowerUps().drops[0];
    if (!drop) throw new Error("no drop slot");
    Object.assign(drop, { active: true, kind: "nuke", x: STATION_LAYOUT.PLAYER_START.x, z: STATION_LAYOUT.PLAYER_START.z, remainingS: POWER_UP_LIFETIME_S });
    stepFor(callbacks, 1);
    expect(readQa().alive).toBe(0);
  });

  it("lowers the renderer pixel ratio when the frames stay over budget", async () => {
    Object.defineProperty(window, "devicePixelRatio", { value: QA_DEVICE_PIXEL_RATIO, configurable: true });
    const callbacks = await bootMain();
    expect(mocks.setPixelRatio).not.toHaveBeenCalled();
    for (let frame = 0; frame < Math.ceil((VISUAL_CONFIG.QUALITY.WINDOW_S / QA_SLOW_FRAME_S) * 2); frame++) callbacks.render(0, QA_SLOW_FRAME_S);
    const lastCall = mocks.setPixelRatio.mock.calls.at(-1);
    expect(lastCall?.[0]).toBeLessThan(QA_DEVICE_PIXEL_RATIO);
    expect(lastCall?.[0]).toBeGreaterThanOrEqual(VISUAL_CONFIG.QUALITY.PIXEL_RATIO_FLOOR);
  });
});

const BLOOD_REACH_M = 1;
const SHAKE_SETTLE_FRAMES = 60;
const HIT_PILE_FRAMES = 3;

const bloodLiveIndexes = (scene: THREE.Scene): number[] => {
  const points = objectNamed(scene, "bloodParticles") as THREE.Points;
  const buffer = points.geometry.getAttribute("position").array as Float32Array;
  const live: number[] = [];
  for (let index = 0; index < buffer.length / 3; index++) if (buffer[index * 3 + 1] !== VISUAL_CONFIG.BLOOD_PARTICLES.HIDDEN_Y_M) live.push(index);
  return live;
};

describe("main hit feedback", () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });
  afterEach(() => {
    vi.doUnmock("@/logic/combat/hitscan");
    vi.doUnmock("@/render/weapon/viewModel");
    Reflect.deleteProperty(window, "matchMedia");
    vi.restoreAllMocks();
  });

  it("mounts the blood particle pool hidden with its configured size", async () => {
    await bootMain();
    const { scene } = renderedScene();
    const points = objectNamed(scene, "bloodParticles") as THREE.Points;
    expect(points).toBeInstanceOf(THREE.Points);
    expect(points.geometry.getAttribute("position").count).toBe(VISUAL_CONFIG.BLOOD_PARTICLES.POOL_SIZE);
    expect(bloodLiveIndexes(scene)).toHaveLength(0);
  });

  it("sprays blood at the zombie that a shot hits, then lets it fall and fade", async () => {
    mockHitscanHits();
    const callbacks = await bootMain();
    const { scene } = renderedScene();
    stepFor(callbacks, ROUND_SPAWN_STEPS);
    pressFire();
    callbacks.update(FRAME_S);
    callbacks.render(0, FRAME_S);
    const live = bloodLiveIndexes(scene);
    expect(live.length).toBeGreaterThanOrEqual(ZOMBIE_VISUAL.HIT_BLOOD_HEAD_COUNT);
    const zombie = zombieGroups(scene)[SHOT_TARGET_ID];
    if (!zombie) throw new Error("zombie group missing");
    const buffer = (objectNamed(scene, "bloodParticles") as THREE.Points).geometry.getAttribute("position").array as Float32Array;
    const first = live[0] as number;
    expect(Math.hypot((buffer[first * 3] as number) - zombie.position.x, (buffer[first * 3 + 2] as number) - zombie.position.z)).toBeLessThan(BLOOD_REACH_M);
    for (let frame = 0; frame < SHAKE_SETTLE_FRAMES * HIT_PILE_FRAMES; frame++) callbacks.render(0, FRAME_S);
    expect(bloodLiveIndexes(scene)).toHaveLength(0);
  });

  it("shakes the camera on the frame of a playerHit then returns exactly to the player view", async () => {
    mockViewModelCapture();
    const callbacks = await bootMain();
    const { camera } = renderedScene();
    const baseX = camera.rotation.x;
    let shaken = false;
    for (let i = 0; i < CHASE_STEPS && !shaken; i++) {
      callbacks.update(FRAME_S);
      mocks.viewModelEvents.length = 0;
      callbacks.render(0, FRAME_S);
      const hurt = (mocks.viewModelEvents[0] ?? []).some((event) => (event as { kind: string }).kind === "playerHit");
      if (!hurt) continue;
      shaken = true;
      expect(Math.abs(camera.rotation.x - baseX) + Math.abs(camera.rotation.z)).toBeGreaterThan(0);
    }
    expect(shaken).toBe(true);
    for (let frame = 0; frame < SHAKE_SETTLE_FRAMES; frame++) callbacks.render(0, FRAME_S);
    expect(camera.rotation.x).toBe(baseX);
    expect(camera.rotation.z).toBe(0);
  });
});
