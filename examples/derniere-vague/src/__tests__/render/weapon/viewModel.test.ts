import * as THREE from "three";

const VIEW_MODULE = "@/render/weapon/viewModel";
const WEAPON_MODULE = "@/logic/weapons/weaponState";
const INPUT_MODULE = "@/logic/input/inputState";

type Kind = "shotFired" | "reloadStarted" | "reloadDone" | "knifeSwung";
type Event = { kind: Kind };
type Player = { x: number; z: number; yaw: number; pitch: number };

const FRAME_S = 1 / 60;
const SETTLE_FRAMES = 240;

const load = async () => {
  const viewModule = await import(/* @vite-ignore */ VIEW_MODULE);
  const weaponModule = await import(/* @vite-ignore */ WEAPON_MODULE);
  const inputModule = await import(/* @vite-ignore */ INPUT_MODULE);
  const camera = new THREE.PerspectiveCamera();
  const viewModel: { group: THREE.Group; update: (...args: unknown[]) => void } = viewModule.createViewModel(camera);
  const weapon = weaponModule.createWeapon("pistol");
  const input = inputModule.createInputState();
  const player: Player = { x: 0, z: 0, yaw: 0, pitch: 0 };
  const noEvents: Event[] = [];
  const frame = (events: Event[] = noEvents): void => viewModel.update(FRAME_S, player, weapon, events, input);
  const settle = (frames = SETTLE_FRAMES): void => {
    for (let i = 0; i < frames; i++) frame();
  };
  const named = (name: string): THREE.Object3D | undefined => viewModel.group.getObjectByName(name);
  return { camera, viewModel, weapon, input, player, frame, settle, named };
};

describe("viewModel", () => {
  it("attaches a pistol built from primitive meshes to the camera", async () => {
    const { camera, viewModel } = await load();
    expect(camera.children).toContain(viewModel.group);
    const meshes: THREE.Mesh[] = [];
    viewModel.group.traverse((object) => {
      if (object instanceof THREE.Mesh) meshes.push(object);
    });
    expect(meshes.length).toBeGreaterThanOrEqual(4);
    for (const mesh of meshes) expect(mesh.material).not.toHaveProperty("map", expect.anything());
  });

  it("stays still while the player stands and sways while walking", async () => {
    const { viewModel, player, frame, settle } = await load();
    settle();
    const rest = viewModel.group.position.clone();
    let standingDrift = 0;
    for (let i = 0; i < 60; i++) {
      frame();
      standingDrift = Math.max(standingDrift, viewModel.group.position.distanceTo(rest));
    }
    expect(standingDrift).toBeLessThan(1e-6);
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < 120; i++) {
      player.z -= 3.2 * FRAME_S;
      frame();
      minY = Math.min(minY, viewModel.group.position.y);
      maxY = Math.max(maxY, viewModel.group.position.y);
    }
    expect(maxY - minY).toBeGreaterThan(0.004);
  });

  it("kicks back on shotFired then settles", async () => {
    const { viewModel, settle, frame } = await load();
    settle();
    const rest = viewModel.group.position.clone();
    const restPitch = viewModel.group.rotation.x;
    frame([{ kind: "shotFired" }]);
    expect(viewModel.group.position.z).toBeGreaterThan(rest.z + 0.005);
    expect(viewModel.group.rotation.x).toBeGreaterThan(restPitch + 0.005);
    settle();
    expect(viewModel.group.position.distanceTo(rest)).toBeLessThan(1e-3);
    expect(viewModel.group.rotation.x).toBeCloseTo(restPitch, 3);
  });

  it("flashes the muzzle briefly on a shot", async () => {
    const { frame, settle, named } = await load();
    settle();
    const flash = named("muzzleFlash");
    expect(flash?.visible).toBe(false);
    frame([{ kind: "shotFired" }]);
    expect(flash?.visible).toBe(true);
    settle();
    expect(flash?.visible).toBe(false);
  });

  it("dips during the reload and comes back", async () => {
    const { viewModel, settle, frame } = await load();
    settle();
    const restY = viewModel.group.position.y;
    frame([{ kind: "reloadStarted" }]);
    let minY = viewModel.group.position.y;
    for (let i = 0; i < 90; i++) {
      frame();
      minY = Math.min(minY, viewModel.group.position.y);
    }
    expect(minY).toBeLessThan(restY - 0.03);
    settle();
    expect(viewModel.group.position.y).toBeCloseTo(restY, 3);
  });

  it("slashes the knife on knifeSwung and hides it afterwards", async () => {
    const { frame, settle, named } = await load();
    settle();
    const knife = named("knife");
    expect(knife?.visible).toBe(false);
    frame([{ kind: "knifeSwung" }]);
    for (let i = 0; i < 6; i++) frame();
    expect(knife?.visible).toBe(true);
    const slashRotation = knife?.parent?.rotation.z ?? 0;
    expect(Math.abs(slashRotation)).toBeGreaterThan(0.05);
    settle();
    expect(knife?.visible).toBe(false);
  });

  it("moves the pistol toward the centre when aiming", async () => {
    const { viewModel, input, settle } = await load();
    settle();
    const restX = viewModel.group.position.x;
    input.aim = true;
    settle();
    expect(Math.abs(viewModel.group.position.x)).toBeLessThan(Math.abs(restX) - 0.05);
    input.aim = false;
    settle();
    expect(viewModel.group.position.x).toBeCloseTo(restX, 3);
  });

  it("locks the slide back when the magazine is empty", async () => {
    const { weapon, settle, named } = await load();
    settle();
    const slide = named("slide");
    const loadedZ = slide?.position.z ?? 0;
    weapon.mag = 0;
    settle();
    expect(slide?.position.z).toBeGreaterThan(loadedZ + 0.01);
  });
});

const VISUAL_MODULE = "@/config/visualConfig";
const WEAPON_IDS = ["pistol", "smg", "carbine", "shotgun", "lmg", "rayGun"] as const;
type WeaponIdName = (typeof WEAPON_IDS)[number];
const MIN_WEAPON_MESHES = 4;
const SIZE_PRECISION = 3;
const MUZZLE_BEHIND_M = 0.05;
const MUZZLE_AHEAD_M = 0.2;
const SLIDE_SHIFT_M = 0.01;

const loadWith = async (weaponId: WeaponIdName) => {
  const base = await load();
  const weaponModule = await import(/* @vite-ignore */ WEAPON_MODULE);
  const visualModule = await import(/* @vite-ignore */ VISUAL_MODULE);
  const weapon = weaponModule.createWeapon(weaponId);
  const frameWith = (events: Event[] = []): void => base.viewModel.update(FRAME_S, base.player, weapon, events, base.input);
  const settleWith = (frames = SETTLE_FRAMES): void => {
    for (let i = 0; i < frames; i++) frameWith();
  };
  const group = (id: string): THREE.Object3D => {
    const found = base.named(id);
    if (!found) throw new Error(`${id} group missing`);
    return found;
  };
  return { ...base, weapon, frameWith, settleWith, group, visual: visualModule.VISUAL_CONFIG };
};

const meshesOf = (root: THREE.Object3D): THREE.Mesh[] => {
  const meshes: THREE.Mesh[] = [];
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) meshes.push(object);
  });
  return meshes;
};

const worldBox = (root: THREE.Object3D): THREE.Box3 => {
  root.updateWorldMatrix(true, true);
  return new THREE.Box3().setFromObject(root);
};

describe("viewModel per weapon", () => {
  it("builds one group per weapon at creation, each from several primitive meshes", async () => {
    const { group, visual } = await loadWith("pistol");
    expect(Object.keys(visual.VIEW_MODEL.WEAPON_MODELS).sort()).toEqual([...WEAPON_IDS].sort());
    for (const id of WEAPON_IDS) {
      expect(meshesOf(group(id)).filter((mesh) => mesh.name !== "muzzleFlash").length).toBeGreaterThanOrEqual(MIN_WEAPON_MESHES);
    }
  });

  it.each(WEAPON_IDS)("shows only the group of %s while it is in hand", async (id) => {
    const { group, frameWith } = await loadWith(id);
    frameWith();
    for (const other of WEAPON_IDS) expect(group(other).visible).toBe(other === id);
  });

  it("swaps the first-person model on the frame after the weapon in hand changes", async () => {
    const { group, weapon, frameWith, settleWith } = await loadWith("pistol");
    settleWith();
    for (const id of WEAPON_IDS) {
      weapon.weaponId = id;
      frameWith();
      for (const other of WEAPON_IDS) expect(group(other).visible).toBe(other === id);
    }
  });

  it("gives every weapon its own silhouette", async () => {
    const { group, viewModel } = await loadWith("pistol");
    viewModel.group.position.set(0, 0, 0);
    const signatures = WEAPON_IDS.map((id) => {
      const size = worldBox(group(id)).getSize(new THREE.Vector3());
      return [size.x, size.y, size.z].map((value) => value.toFixed(SIZE_PRECISION)).join("/");
    });
    expect(new Set(signatures).size).toBe(WEAPON_IDS.length);
  });

  it("makes the shotgun and the machine gun longer than the pistol", async () => {
    const { group } = await loadWith("pistol");
    const lengthOf = (id: WeaponIdName): number => worldBox(group(id)).getSize(new THREE.Vector3()).z;
    expect(lengthOf("shotgun")).toBeGreaterThan(lengthOf("pistol"));
    expect(lengthOf("lmg")).toBeGreaterThan(lengthOf("pistol"));
    expect(lengthOf("carbine")).toBeGreaterThan(lengthOf("smg"));
  });

  it.each(WEAPON_IDS)("places the muzzle flash of %s at its barrel tip", async (id) => {
    const { group, frameWith, named, visual } = await loadWith(id);
    frameWith();
    const flash = named("muzzleFlash");
    if (!flash) throw new Error("flash missing");
    expect(flash.position.z).toBe(visual.VIEW_MODEL.MUZZLE_Z_M[id]);
    const front = worldBox(group(id)).min.z;
    const flashZ = flash.getWorldPosition(new THREE.Vector3()).z;
    expect(flashZ).toBeLessThan(front + MUZZLE_BEHIND_M);
    expect(flashZ).toBeGreaterThan(front - MUZZLE_AHEAD_M);
  });

  it.each(WEAPON_IDS)("flashes the muzzle when %s fires and kicks back", async (id) => {
    const { frameWith, settleWith, named, viewModel } = await loadWith(id);
    settleWith();
    const flash = named("muzzleFlash");
    const restZ = viewModel.group.position.z;
    frameWith([{ kind: "shotFired" }]);
    expect(flash?.visible).toBe(true);
    expect(viewModel.group.position.z).toBeGreaterThan(restZ + 0.005);
    settleWith();
    expect(flash?.visible).toBe(false);
  });

  it.each(WEAPON_IDS)("moves a part of %s back when the magazine is empty", async (id) => {
    const { group, weapon, settleWith } = await loadWith(id);
    settleWith();
    const zs = (): number[] => meshesOf(group(id)).map((mesh) => mesh.position.z);
    const loaded = zs();
    weapon.mag = 0;
    settleWith();
    const locked = zs();
    expect(locked.some((z, index) => z > (loaded[index] ?? 0) + SLIDE_SHIFT_M)).toBe(true);
  });

  it.each(WEAPON_IDS)("hides the %s during the knife slash and brings it back", async (id) => {
    const { group, frameWith, settleWith, named } = await loadWith(id);
    settleWith();
    frameWith([{ kind: "knifeSwung" }]);
    for (let i = 0; i < 6; i++) frameWith();
    expect(named("knife")?.visible).toBe(true);
    for (const other of WEAPON_IDS) expect(group(other).visible).toBe(false);
    settleWith();
    expect(group(id).visible).toBe(true);
  });
});

const BODY_NAMES = ["slide", "receiver", "body"];
const FRONT_SIGHT_NAMES = ["frontSight", "beadSight"];
const REQUIRED_PARTS = ["barrel", "grip", "triggerGuard", "magazine", "rearSight"];

const partNames = (root: THREE.Object3D): string[] => meshesOf(root).map((mesh) => mesh.name);

describe("viewModel gloved hand and weapon details", () => {
  it.each(WEAPON_IDS)("gives %s a body, barrel, both sights, trigger guard, grip and magazine", async (id) => {
    const { group } = await loadWith(id);
    const names = partNames(group(id));
    for (const required of REQUIRED_PARTS) expect(names).toContain(required);
    expect(names.some((name) => BODY_NAMES.includes(name))).toBe(true);
    expect(names.some((name) => FRONT_SIGHT_NAMES.includes(name))).toBe(true);
    expect(names.filter((name) => name === "magazine")).toHaveLength(1);
  });

  it.each(WEAPON_IDS)("gives %s at least eight detail meshes", async (id) => {
    const { group } = await loadWith(id);
    expect(meshesOf(group(id)).length).toBeGreaterThanOrEqual(8);
  });

  it("mounts one gloved hand under heldWeapons at HAND_POSITION", async () => {
    const { viewModel, group, visual } = await loadWith("pistol");
    const hands = meshesOf(viewModel.group).filter((mesh) => mesh.name === "palm");
    expect(hands).toHaveLength(1);
    const hand = group("glovedHand");
    expect(hand.parent?.name).toBe("heldWeapons");
    const spec = visual.VIEW_MODEL.HAND_POSITION;
    expect(hand.position.toArray()).toEqual([spec.x, spec.y, spec.z]);
  });

  it.each(WEAPON_IDS)("shows the gloved hand with palm, fingers and forearm while %s is in hand", async (id) => {
    const { group, frameWith } = await loadWith(id);
    frameWith();
    const hand = group("glovedHand");
    expect(hand.visible).toBe(true);
    const names = partNames(hand);
    for (const part of ["palm", "finger0", "finger3", "thumb", "forearm"]) expect(names).toContain(part);
  });

  it("hides the hand with the weapon during the knife slash and brings it back", async () => {
    const { group, frameWith, settleWith } = await loadWith("pistol");
    settleWith();
    frameWith([{ kind: "knifeSwung" }]);
    for (let i = 0; i < 6; i++) frameWith();
    expect(group("glovedHand").visible).toBe(false);
    settleWith();
    expect(group("glovedHand").visible).toBe(true);
  });
});

const WEAPON_CONFIG_MODULE = "@/config/weaponConfig";
const PORT_TOLERANCE_M = 0.05;
const DROP_TOLERANCE = 0.1;
const SHOTS = 20;

const loadReload = async (id: WeaponIdName) => {
  const ctx = await loadWith(id);
  const weaponConfig = await import(/* @vite-ignore */ WEAPON_CONFIG_MODULE);
  const reloadFrames: number = Math.round(weaponConfig.WEAPONS[id].RELOAD_S / FRAME_S);
  const magazine = ctx.group(id).getObjectByName("magazine");
  if (!magazine) throw new Error(`${id} magazine missing`);
  return { ...ctx, magazine, reloadFrames };
};

const CASING_WEAPON_IDS = WEAPON_IDS.filter((id) => id !== "rayGun");

const casingsOf = (root: THREE.Object3D): THREE.Mesh[] => meshesOf(root).filter((mesh) => mesh.name === "casing");

describe("viewModel magazine drop during reload", () => {
  it("declares an eject port for every weapon and a positive magazine drop", async () => {
    const { visual } = await loadWith("pistol");
    expect(Object.keys(visual.VIEW_MODEL.EJECT_PORT).sort()).toEqual([...WEAPON_IDS].sort());
    expect(visual.VIEW_MODEL.MAG_DROP_M).toBeGreaterThan(0);
  });

  it.each(WEAPON_IDS)("moves the %s magazine down over the first half and back over the second half", async (id) => {
    const { magazine, frameWith, settleWith, reloadFrames, visual } = await loadReload(id);
    settleWith();
    const baseY = magazine.position.y;
    const drop: number = visual.VIEW_MODEL.MAG_DROP_M;
    const ys: number[] = [];
    frameWith([{ kind: "reloadStarted" }]);
    ys.push(magazine.position.y);
    for (let i = 1; i < reloadFrames; i++) {
      frameWith();
      ys.push(magazine.position.y);
    }
    const at = (ratio: number): number => ys[Math.floor(ratio * (ys.length - 1))] ?? baseY;
    expect(at(0.25)).toBeLessThan(baseY - drop * 0.3);
    expect(at(0.5)).toBeLessThan(baseY - drop * (1 - DROP_TOLERANCE));
    expect(at(0.5)).toBeGreaterThan(baseY - drop * (1 + DROP_TOLERANCE));
    expect(at(0.75)).toBeGreaterThan(at(0.5));
    expect(at(0.75)).toBeLessThan(baseY - drop * 0.3);
    expect(Math.min(...ys)).toBeGreaterThan(baseY - drop * (1 + DROP_TOLERANCE));
    settleWith();
    expect(magazine.position.y).toBeCloseTo(baseY, 6);
  });

  it.each(WEAPON_IDS)("keeps the %s magazine still when no reload runs", async (id) => {
    const { magazine, settleWith } = await loadReload(id);
    settleWith();
    const baseY = magazine.position.y;
    settleWith(30);
    expect(magazine.position.y).toBe(baseY);
  });
});

describe("viewModel casing ejection", () => {
  it("mounts a fixed pool of hidden casings under heldWeapons", async () => {
    const { group, visual } = await loadWith("pistol");
    const casings = casingsOf(group("heldWeapons"));
    expect(casings).toHaveLength(visual.VIEW_MODEL.CASING.POOL_SIZE);
    for (const casing of casings) {
      expect(casing.parent?.name).toBe("heldWeapons");
      expect(casing.visible).toBe(false);
    }
  });

  it.each(CASING_WEAPON_IDS)("ejects one casing at the %s port on shotFired", async (id) => {
    const { group, frameWith, settleWith, visual } = await loadWith(id);
    settleWith();
    frameWith([{ kind: "shotFired" }]);
    const shown = casingsOf(group("heldWeapons")).filter((mesh) => mesh.visible);
    expect(shown).toHaveLength(1);
    const port = visual.VIEW_MODEL.EJECT_PORT[id];
    expect(Math.abs((shown[0]?.position.x ?? 0) - port.x)).toBeLessThan(PORT_TOLERANCE_M);
    expect(Math.abs((shown[0]?.position.y ?? 0) - port.y)).toBeLessThan(PORT_TOLERANCE_M);
    expect(Math.abs((shown[0]?.position.z ?? 0) - port.z)).toBeLessThan(PORT_TOLERANCE_M);
  });

  it("ejects no casing from the energy rayGun but still shows its flash", async () => {
    const { group, named, frameWith, settleWith } = await loadWith("rayGun");
    settleWith();
    frameWith([{ kind: "shotFired" }]);
    expect(named("muzzleFlash")?.visible).toBe(true);
    expect(casingsOf(group("heldWeapons")).filter((mesh) => mesh.visible)).toHaveLength(0);
  });

  it("makes the casing fall and vanish", async () => {
    const { group, frameWith, settleWith, visual } = await loadWith("pistol");
    settleWith();
    frameWith([{ kind: "shotFired" }]);
    const casing = casingsOf(group("heldWeapons")).find((mesh) => mesh.visible);
    const startY = casing?.position.y ?? 0;
    for (let i = 0; i < 24; i++) frameWith();
    expect(casing?.position.y ?? 0).toBeLessThan(startY - 0.01);
    settleWith();
    expect(casingsOf(group("heldWeapons")).filter((mesh) => mesh.visible)).toHaveLength(0);
    expect(visual.VIEW_MODEL.CASING.LIFETIME_S).toBeLessThan(SETTLE_FRAMES * FRAME_S);
  });

  it("reuses the fixed pool however many shots are fired", async () => {
    const { group, frameWith, visual } = await loadWith("smg");
    for (let i = 0; i < SHOTS; i++) frameWith([{ kind: "shotFired" }]);
    expect(casingsOf(group("heldWeapons"))).toHaveLength(visual.VIEW_MODEL.CASING.POOL_SIZE);
  });

  it.each(WEAPON_IDS)("keeps the flash at the %s muzzle height and depth", async (id) => {
    const { named, frameWith, visual } = await loadWith(id);
    frameWith([{ kind: "shotFired" }]);
    const flash = named("muzzleFlash");
    expect(flash?.visible).toBe(true);
    expect(flash?.position.y).toBe(visual.VIEW_MODEL.MUZZLE_Y_M[id]);
    expect(flash?.position.z).toBe(visual.VIEW_MODEL.MUZZLE_Z_M[id]);
  });
});

const GAME_CONFIG_MODULE = "@/config/gameConfig";
const PHONE_WIDTH_PX = 844;
const PHONE_HEIGHT_PX = 390;
const OLD_REST = { x: 0.2, y: -0.2 };
const PULSE_SECONDS = 4;
const PULSE_TOLERANCE = 0.05;

const ndcBounds = (root: THREE.Object3D, camera: THREE.PerspectiveCamera) => {
  camera.updateMatrixWorld(true);
  const bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
  const point = new THREE.Vector3();
  for (const mesh of meshesOf(root)) {
    const positions = mesh.geometry.getAttribute("position");
    for (let index = 0; index < positions.count; index++) {
      point.fromBufferAttribute(positions, index).applyMatrix4(mesh.matrixWorld).project(camera);
      bounds.minX = Math.min(bounds.minX, point.x);
      bounds.maxX = Math.max(bounds.maxX, point.x);
      bounds.minY = Math.min(bounds.minY, point.y);
      bounds.maxY = Math.max(bounds.maxY, point.y);
    }
  }
  return bounds;
};

describe("viewModel premium weapon rendering", () => {
  it.each(WEAPON_IDS)("builds every mesh of %s from rounded geometry with no plain box", async (id) => {
    const { group } = await loadWith(id);
    for (const mesh of meshesOf(group(id))) {
      expect(mesh.geometry).not.toBeInstanceOf(THREE.BoxGeometry);
    }
  });

  it("gives the shotgun stock and pump wood distinct from the barrel metal", async () => {
    const { group } = await loadWith("shotgun");
    const material = (name: string): THREE.MeshStandardMaterial => {
      const found = group("shotgun").getObjectByName(name);
      if (!(found instanceof THREE.Mesh)) throw new Error(`${name} missing`);
      return found.material as THREE.MeshStandardMaterial;
    };
    expect(material("stock")).toBe(material("pump"));
    expect(material("stock")).not.toBe(material("barrel"));
    expect(material("stock").color.getHex()).not.toBe(material("barrel").color.getHex());
    expect(material("stock").metalness).toBeLessThan(material("barrel").metalness);
  });

  it("pulses the energy weapon emissive between the configured minimum and maximum", async () => {
    const { group, frameWith, visual } = await loadWith("rayGun");
    const glow = meshesOf(group("rayGun")).find((mesh) => mesh.name === "emitter");
    const material = glow?.material as THREE.MeshStandardMaterial;
    const { ENERGY_EMISSIVE_MIN: min, ENERGY_EMISSIVE_MAX: max } = visual.VIEW_MODEL;
    expect(min).toBeLessThan(max);
    let low = Infinity;
    let high = -Infinity;
    for (let i = 0; i < PULSE_SECONDS / FRAME_S; i++) {
      frameWith();
      low = Math.min(low, material.emissiveIntensity);
      high = Math.max(high, material.emissiveIntensity);
    }
    expect(low).toBeGreaterThanOrEqual(min - 1e-6);
    expect(low).toBeLessThan(min + (max - min) * PULSE_TOLERANCE);
    expect(high).toBeLessThanOrEqual(max + 1e-6);
    expect(high).toBeGreaterThan(max - (max - min) * PULSE_TOLERANCE);
  });

  it("rests lower and further right than before", async () => {
    const { visual } = await loadWith("pistol");
    expect(visual.VIEW_MODEL.REST_POSITION.x).toBeGreaterThan(OLD_REST.x);
    expect(visual.VIEW_MODEL.REST_POSITION.y).toBeLessThan(OLD_REST.y);
  });

  it.each(WEAPON_IDS)("keeps the idle %s out of the central aiming area on an 844x390 viewport", async (id) => {
    const { camera, group, settleWith, visual } = await loadWith(id);
    const gameModule = await import(/* @vite-ignore */ GAME_CONFIG_MODULE);
    camera.fov = gameModule.GAME_CONFIG.CAMERA_FOV_DEG;
    camera.near = gameModule.GAME_CONFIG.CAMERA_NEAR_M;
    camera.aspect = PHONE_WIDTH_PX / PHONE_HEIGHT_PX;
    camera.updateProjectionMatrix();
    settleWith();
    const area = visual.VIEW_MODEL.AIM_CLEAR_AREA_NDC;
    expect(area.x).toBeGreaterThan(0);
    expect(area.y).toBeGreaterThan(0);
    const bounds = ndcBounds(group(id), camera);
    const overlaps = bounds.minX < area.x && bounds.maxX > -area.x && bounds.minY < area.y && bounds.maxY > -area.y;
    expect(overlaps).toBe(false);
  });
});
