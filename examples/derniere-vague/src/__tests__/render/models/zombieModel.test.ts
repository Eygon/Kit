import * as THREE from "three";
import { BARRICADE } from "@/config/mapConfig";
import { ZOMBIE_CONFIG } from "@/config/zombieConfig";

const MODEL_MODULE = "@/render/models/zombieModel";
const VISUAL_MODULE = "@/config/visualConfig";
const MAX_TEXTURE_PX = 512;
const MAX_MATERIALS = 6;
const VARIANT_COUNT = 3;
const MATERIALS_PER_VARIANT = 3;
const SHARED_MATERIALS = 1;
const MIN_LIMP_GAP_RAD = 0.05;
const QUARTER_TURN = Math.PI / 2;
const EPSILON = 1e-6;

const load = async () => {
  const model = await import(/* @vite-ignore */ MODEL_MODULE);
  const visual = (await import(/* @vite-ignore */ VISUAL_MODULE)).ZOMBIE_VISUAL;
  const parts = model.createZombieParts();
  const group: THREE.Group = model.buildZombie(parts, 0);
  const joint = (name: string): THREE.Object3D => {
    const found = group.getObjectByName(name);
    if (!found) throw new Error(`missing ${name}`);
    return found;
  };
  const pose = (state: string, phaseS: number, gait?: string): void => model.poseZombie(group, state, phaseS, gait);
  const skinMaterialOf = (root: THREE.Object3D): THREE.Material | THREE.Material[] | undefined => (root.getObjectByName("skull") as THREE.Mesh | undefined)?.material;
  return { model, visual, parts, group, joint, pose, skinMaterialOf };
};

const meshesOf = (root: THREE.Object3D): THREE.Mesh[] => {
  const meshes: THREE.Mesh[] = [];
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) meshes.push(object);
  });
  return meshes;
};

describe("zombieModel", () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("builds a skin texture of at most 512px and a handful of shared materials", async () => {
    const { parts } = await load();
    expect(parts.skinTexture).toBeInstanceOf(THREE.CanvasTexture);
    expect(parts.skinTexture.image.width).toBeLessThanOrEqual(MAX_TEXTURE_PX);
    expect(parts.skinTexture.image.height).toBeLessThanOrEqual(MAX_TEXTURE_PX);
    expect(parts.skinTexture.generateMipmaps).toBe(true);
    expect(parts.materials.length).toBeGreaterThan(0);
    expect(parts.materials.length).toBeLessThanOrEqual(VARIANT_COUNT * MATERIALS_PER_VARIANT + SHARED_MATERIALS);
  });

  it("builds torso and limbs from capsules and the head from a lathe", async () => {
    const { group } = await load();
    for (const name of ["torso", "arm", "leg"]) {
      const meshes = meshesOf(group).filter((mesh) => mesh.name === name);
      expect(meshes.length).toBeGreaterThan(0);
      for (const mesh of meshes) expect(mesh.geometry).toBeInstanceOf(THREE.CapsuleGeometry);
    }
    const skull = meshesOf(group).find((mesh) => mesh.name === "skull");
    expect(skull?.geometry).toBeInstanceOf(THREE.LatheGeometry);
    expect(group.getObjectByName("jaw")).toBeDefined();
  });

  it("layers torn cloth shells over the torso with a different material than the skin", async () => {
    const { group, skinMaterialOf } = await load();
    const shells = meshesOf(group).filter((mesh) => mesh.name === "shell");
    expect(shells.length).toBeGreaterThanOrEqual(2);
    for (const shell of shells) expect(shell.material).not.toBe(skinMaterialOf(group));
  });

  it("offers exactly three variants whose skin, shirt and trousers colours all differ", async () => {
    const { visual, model, parts } = await load();
    expect(visual.VARIANTS).toHaveLength(VARIANT_COUNT);
    for (const key of ["skinColor", "shirtColor", "trousersColor"]) expect(new Set(visual.VARIANTS.map((variant: Record<string, number>) => variant[key])).size).toBe(VARIANT_COUNT);
    const skins = [0, 1, 2].map((variant) => (model.buildZombie(parts, variant) as THREE.Group).getObjectByName("skull") as THREE.Mesh);
    expect(new Set(skins.map((mesh) => mesh.material)).size).toBe(VARIANT_COUNT);
    skins.forEach((mesh, variant) => expect((mesh.material as THREE.MeshStandardMaterial).color.getHex()).toBe(visual.VARIANTS[variant].skinColor));
  });

  it("dresses each variant in its own shirt and trousers colours", async () => {
    const { visual, model, parts } = await load();
    for (const variant of [0, 1, 2]) {
      const zombie: THREE.Group = model.buildZombie(parts, variant);
      const torso = zombie.getObjectByName("torso") as THREE.Mesh;
      const leg = meshesOf(zombie).find((mesh) => mesh.name === "leg") as THREE.Mesh;
      expect((torso.material as THREE.MeshStandardMaterial).color.getHex()).toBe(visual.VARIANTS[variant].shirtColor);
      expect((leg.material as THREE.MeshStandardMaterial).color.getHex()).toBe(visual.VARIANTS[variant].trousersColor);
    }
  });

  it("assembles torso, head, two arms and two legs from primitives", async () => {
    const { group, joint } = await load();
    for (const name of ["rig", "torso", "head", "armLeft", "armRight", "legLeft", "legRight"]) expect(joint(name)).toBeDefined();
    expect(meshesOf(group).length).toBeGreaterThanOrEqual(6);
    for (const mesh of meshesOf(group)) expect(mesh.geometry).toBeInstanceOf(THREE.BufferGeometry);
  });

  it("shares geometries and materials between two zombies", async () => {
    const { model, parts, group } = await load();
    const other: THREE.Group = model.buildZombie(parts, 0);
    const first: THREE.Group = model.buildZombie(parts, 0);
    expect(group).toBeDefined();
    const geometries = new Set(meshesOf(first).map((mesh) => mesh.geometry));
    const otherGeometries = new Set(meshesOf(other).map((mesh) => mesh.geometry));
    expect([...otherGeometries].every((geometry) => geometries.has(geometry))).toBe(true);
    const materials = new Set(meshesOf(first).map((mesh) => mesh.material));
    expect([...meshesOf(other).map((mesh) => mesh.material)].every((material) => materials.has(material))).toBe(true);
    expect(materials.size).toBeLessThanOrEqual(MAX_MATERIALS);
  });

  it("swings the legs in opposition during the walk cycle within the configured amplitude", async () => {
    const { joint, pose, visual } = await load();
    const quarterCycleS = QUARTER_TURN / visual.WALK_RAD_PER_S;
    pose("chasing", quarterCycleS);
    const left = joint("legLeft").rotation.x;
    const right = joint("legRight").rotation.x;
    expect(Math.abs(left)).toBeGreaterThan(visual.LEG_SWING_RAD * 0.9);
    expect(Math.abs(left)).toBeLessThanOrEqual(visual.LEG_SWING_RAD + EPSILON);
    expect(Math.sign(left)).toBe(-Math.sign(right));
    pose("chasing", quarterCycleS * 3);
    expect(joint("legLeft").rotation.x).toBeCloseTo(-left, 6);
  });

  it("limps at walk speed: the legs swing with asymmetric amplitude set by the limp ratio", async () => {
    const { joint, pose, visual } = await load();
    pose("chasing", QUARTER_TURN / visual.WALK_RAD_PER_S, "walk");
    const left = Math.abs(joint("legLeft").rotation.x);
    const right = Math.abs(joint("legRight").rotation.x);
    expect(visual.LIMP_RATIO).toBeGreaterThan(0);
    expect(visual.LIMP_RATIO).toBeLessThan(1);
    expect(Math.abs(left - right)).toBeGreaterThan(MIN_LIMP_GAP_RAD);
    expect(Math.min(left, right) / Math.max(left, right)).toBeCloseTo(visual.LIMP_RATIO, 6);
  });

  it("walks by default when no gait is given", async () => {
    const { joint, pose, visual } = await load();
    pose("chasing", 0);
    expect(joint("rig").rotation.x).toBeCloseTo(-visual.WALK_LEAN_RAD, 6);
  });

  it("runs leaning further forward, with a longer symmetric stride and the arms stretched forward", async () => {
    const { joint, pose, visual } = await load();
    const quarterCycleS = QUARTER_TURN / visual.WALK_RAD_PER_S;
    pose("chasing", quarterCycleS, "walk");
    const walkLean = joint("rig").rotation.x;
    const walkStride = Math.abs(joint("legLeft").rotation.x);
    pose("chasing", quarterCycleS, "run");
    expect(joint("rig").rotation.x).toBeLessThan(walkLean);
    expect(joint("rig").rotation.x).toBeCloseTo(-visual.RUN_LEAN_RAD, 6);
    expect(Math.abs(joint("legLeft").rotation.x)).toBeGreaterThan(walkStride);
    expect(joint("legLeft").rotation.x).toBeCloseTo(-joint("legRight").rotation.x, 6);
    pose("chasing", 0, "run");
    expect(joint("armLeft").rotation.x).toBeGreaterThanOrEqual(visual.ARM_RAISE_RAD);
    expect(joint("armRight").rotation.x).toBeGreaterThanOrEqual(visual.ARM_RAISE_RAD);
  });

  it("ignores the gait outside the chase", async () => {
    const { joint, pose } = await load();
    pose("attacking", 0.2, "walk");
    const walkArm = joint("armLeft").rotation.x;
    pose("attacking", 0.2, "run");
    expect(joint("armLeft").rotation.x).toBeCloseTo(walkArm, 6);
  });

  it("reaches the arms forward while chasing", async () => {
    const { joint, pose, visual } = await load();
    pose("chasing", 0);
    expect(joint("armLeft").rotation.x).toBeGreaterThan(visual.ARM_RAISE_RAD - visual.ARM_SWAY_RAD - EPSILON);
    expect(joint("armRight").rotation.x).toBeGreaterThan(visual.ARM_RAISE_RAD - visual.ARM_SWAY_RAD - EPSILON);
  });

  it("raises the arms overhead during the wind-up then slams them down at the end of the swing", async () => {
    const { joint, pose, visual } = await load();
    pose("attacking", 0);
    const start = joint("armLeft").rotation.x;
    pose("attacking", ZOMBIE_CONFIG.ZOMBIE_ATTACK_WINDUP_S);
    const raised = joint("armLeft").rotation.x;
    expect(raised).toBeCloseTo(visual.ATTACK_RAISE_RAD, 6);
    expect(raised).toBeGreaterThan(start);
    pose("attacking", ZOMBIE_CONFIG.ZOMBIE_ATTACK_DURATION_S);
    expect(joint("armLeft").rotation.x).toBeCloseTo(visual.ATTACK_SLAM_RAD, 6);
  });

  it("falls on its back during the death animation and stays down", async () => {
    const { joint, pose, visual } = await load();
    pose("dying", 0);
    expect(joint("rig").rotation.x).toBeCloseTo(0, 6);
    pose("dying", visual.DEATH_FALL_S * 0.5);
    const halfway = joint("rig").rotation.x;
    expect(halfway).toBeGreaterThan(0);
    expect(halfway).toBeLessThan(QUARTER_TURN);
    pose("dying", visual.DEATH_FALL_S);
    expect(joint("rig").rotation.x).toBeCloseTo(QUARTER_TURN, 6);
    expect(joint("rig").position.y).toBeCloseTo(visual.DEATH_LIFT_M, 6);
    pose("dying", ZOMBIE_CONFIG.ZOMBIE_DEATH_S);
    expect(joint("rig").rotation.x).toBeCloseTo(QUARTER_TURN, 6);
  });

  it("hops over the window sill while spawning, lifting the rig and leaning forward", async () => {
    const { joint, pose, visual } = await load();
    pose("spawning", ZOMBIE_CONFIG.ZOMBIE_SPAWN_S / 2);
    expect(joint("rig").position.y).toBeCloseTo(visual.CLIMB_LIFT_M, 6);
    expect(joint("rig").rotation.x).toBeLessThan(0);
    pose("spawning", 0);
    expect(joint("rig").position.y).toBeCloseTo(0, 6);
  });

  it("leans toward the window and keeps its feet down while breaching, unlike the climb", async () => {
    const { joint, pose, visual } = await load();
    pose("breaching", BARRICADE.TEAR_INTERVAL_S / 2);
    expect(joint("rig").position.y).toBeCloseTo(0, 6);
    expect(joint("rig").rotation.x).toBeLessThan(0);
    expect(joint("rig").rotation.x).toBeGreaterThanOrEqual(-visual.BREACH_LEAN_RAD - EPSILON);
    expect(joint("legLeft").rotation.x).toBeCloseTo(0, 6);
  });

  it("reaches both arms out to the planks then hauls them back before the plank tears", async () => {
    const { joint, pose, visual } = await load();
    pose("breaching", 0);
    expect(joint("armLeft").rotation.x).toBeCloseTo(visual.BREACH_REACH_RAD, 6);
    const reachLean = joint("rig").rotation.x;
    pose("breaching", BARRICADE.TEAR_INTERVAL_S);
    expect(joint("armLeft").rotation.x).toBeCloseTo(visual.BREACH_PULL_RAD, 6);
    expect(joint("armRight").rotation.x).toBeCloseTo(visual.BREACH_PULL_RAD, 6);
    expect(joint("rig").rotation.x).toBeGreaterThan(reachLean);
    expect(visual.BREACH_REACH_RAD).toBeGreaterThan(visual.BREACH_PULL_RAD);
  });

  it("staggers the two arms mid pull and trembles the body", async () => {
    const { joint, pose } = await load();
    pose("breaching", BARRICADE.TEAR_INTERVAL_S * 0.5);
    expect(joint("armLeft").rotation.x).not.toBeCloseTo(joint("armRight").rotation.x, 3);
    const tremble = new Set<number>();
    for (let sample = 1; sample <= 8; sample++) {
      pose("breaching", (BARRICADE.TEAR_INTERVAL_S * 0.7 * sample) / 8 + 0.3);
      tremble.add(joint("rig").rotation.z);
    }
    expect(tremble.size).toBeGreaterThan(1);
  });

  it("resets the rig when going from death back to walking in a recycled group", async () => {
    const { joint, pose, visual } = await load();
    pose("dying", ZOMBIE_CONFIG.ZOMBIE_DEATH_S);
    pose("chasing", 0);
    expect(joint("rig").rotation.x).toBeCloseTo(-visual.WALK_LEAN_RAD, 6);
    expect(joint("rig").position.y).toBeLessThanOrEqual(visual.WALK_BOB_M + EPSILON);
  });

  it("does nothing on a group that was not built by the model", async () => {
    const { model } = await load();
    const stranger = new THREE.Group();
    expect(() => model.poseZombie(stranger, "chasing", 1)).not.toThrow();
  });

  it("disposes every shared geometry, material and the skin texture once", async () => {
    const { parts } = await load();
    const textureSpy = vi.spyOn(parts.skinTexture, "dispose");
    const materialSpies = parts.materials.map((material: THREE.Material) => vi.spyOn(material, "dispose"));
    parts.dispose();
    expect(textureSpy).toHaveBeenCalledTimes(1);
    for (const spy of materialSpies) expect(spy).toHaveBeenCalledTimes(1);
  });
});

const REACTION_TOLERANCE = 1e-6;
const NO_HIT = { recoil: 0, headSnap: 0 };

describe("zombieModel hit reaction", () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const poseReacting = (model: { poseZombie: (...args: unknown[]) => void }, group: THREE.Group, state: string, reaction: { recoil: number; headSnap: number }): void => {
    model.poseZombie(group, state, 0, "walk", reaction);
  };

  it("pitches the torso back by the recoil angle on top of the state pose", async () => {
    const { model, group, joint, visual } = await load();
    poseReacting(model, group, "chasing", NO_HIT);
    const baseRig = joint("rig").rotation.x;
    const baseHead = joint("head").rotation.x;
    poseReacting(model, group, "chasing", { recoil: 1, headSnap: 0 });
    expect(joint("rig").rotation.x - baseRig).toBeCloseTo(visual.HIT_RECOIL_RAD, 6);
    expect(Math.abs(joint("head").rotation.x - baseHead)).toBeLessThan(REACTION_TOLERANCE);
  });

  it("snaps the head back further than the body recoil", async () => {
    const { model, group, joint, visual } = await load();
    poseReacting(model, group, "chasing", NO_HIT);
    const baseRig = joint("rig").rotation.x;
    const baseHead = joint("head").rotation.x;
    poseReacting(model, group, "chasing", { recoil: 1, headSnap: 1 });
    const headDelta = joint("head").rotation.x - baseHead;
    const bodyDelta = joint("rig").rotation.x - baseRig;
    expect(headDelta).toBeCloseTo(visual.HEAD_SNAP_RAD, 6);
    expect(visual.HEAD_SNAP_RAD).toBeGreaterThan(visual.HIT_RECOIL_RAD);
    expect(headDelta).toBeGreaterThan(bodyDelta);
  });

  it("scales the reaction with the input ratio", async () => {
    const { model, group, joint, visual } = await load();
    poseReacting(model, group, "chasing", NO_HIT);
    const baseRig = joint("rig").rotation.x;
    poseReacting(model, group, "chasing", { recoil: 0.5, headSnap: 0 });
    expect(joint("rig").rotation.x - baseRig).toBeCloseTo(visual.HIT_RECOIL_RAD / 2, 6);
  });

  it("returns exactly to the state pose when the reaction is dropped", async () => {
    const { model, group, joint } = await load();
    poseReacting(model, group, "chasing", NO_HIT);
    const baseRig = joint("rig").rotation.x;
    const baseHead = joint("head").rotation.x;
    poseReacting(model, group, "chasing", { recoil: 1, headSnap: 1 });
    poseReacting(model, group, "chasing", NO_HIT);
    expect(joint("rig").rotation.x).toBe(baseRig);
    expect(joint("head").rotation.x).toBe(baseHead);
    model.poseZombie(group, "chasing", 0);
    expect(joint("rig").rotation.x).toBe(baseRig);
  });

  it("applies after the dying pose without cancelling the fall", async () => {
    const { model, group, joint, visual } = await load();
    poseReacting(model, group, "dying", NO_HIT);
    const fallen = joint("rig").rotation.x;
    poseReacting(model, group, "dying", { recoil: 1, headSnap: 0 });
    expect(joint("rig").rotation.x).toBeCloseTo(fallen + visual.HIT_RECOIL_RAD, 6);
  });
});
