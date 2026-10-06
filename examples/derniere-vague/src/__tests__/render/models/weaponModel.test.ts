import * as THREE from "three";

const MODEL_MODULE = "@/render/models/weaponModel";
const VISUAL_MODULE = "@/config/visualConfig";
const WEAPON_IDS = ["pistol", "smg", "carbine", "shotgun", "lmg", "rayGun"] as const;
type WeaponIdName = (typeof WEAPON_IDS)[number];
const MATERIAL_KINDS = ["emissive", "metal", "polymer", "wood"];
const MIN_MESHES = 8;

type Built = { group: THREE.Group; materials: Record<string, THREE.MeshStandardMaterial>; muzzle: THREE.Object3D };
type PartSpec = { name: string; shape: string; material: string; chamfer: number; slide: boolean };

const load = async (id: WeaponIdName) => {
  const model = await import(/* @vite-ignore */ MODEL_MODULE);
  const visual = (await import(/* @vite-ignore */ VISUAL_MODULE)).VISUAL_CONFIG.VIEW_MODEL;
  const built: Built = model.buildWeaponModel(id);
  const meshes: THREE.Mesh[] = [];
  built.group.traverse((object) => {
    if (object instanceof THREE.Mesh) meshes.push(object);
  });
  const specs: PartSpec[] = visual.WEAPON_MODELS[id];
  const named = (name: string): THREE.Mesh => {
    const found = meshes.find((mesh) => mesh.name === name);
    if (!found) throw new Error(`${name} missing`);
    return found;
  };
  return { built, meshes, specs, visual, named };
};

describe("buildWeaponModel", () => {
  it("declares part specs for every weapon with the allowed shapes and material kinds", async () => {
    const { visual } = await load("pistol");
    expect(Object.keys(visual.WEAPON_MODELS).sort()).toEqual([...WEAPON_IDS].sort());
    for (const id of WEAPON_IDS) {
      for (const spec of visual.WEAPON_MODELS[id] as PartSpec[]) {
        expect(["lathe", "cylinder", "extrude"]).toContain(spec.shape);
        expect(MATERIAL_KINDS).toContain(spec.material);
      }
    }
  });

  it.each(WEAPON_IDS)("returns a group named %s with one mesh per spec and a muzzle at the configured tip", async (id) => {
    const { built, meshes, specs, visual } = await load(id);
    expect(built.group).toBeInstanceOf(THREE.Group);
    expect(built.group.name).toBe(id);
    expect(meshes).toHaveLength(specs.length);
    expect(meshes.length).toBeGreaterThanOrEqual(MIN_MESHES);
    expect(built.muzzle.parent).toBe(built.group);
    expect(built.muzzle.position.y).toBe(visual.MUZZLE_Y_M[id]);
    expect(built.muzzle.position.z).toBe(visual.MUZZLE_Z_M[id]);
  });

  it.each(WEAPON_IDS)("builds %s only from rounded geometries, never a plain box", async (id) => {
    const { meshes, specs } = await load(id);
    for (const mesh of meshes) {
      expect(mesh.geometry).not.toBeInstanceOf(THREE.BoxGeometry);
      const rounded = [THREE.LatheGeometry, THREE.CylinderGeometry, THREE.ExtrudeGeometry].some((kind) => mesh.geometry instanceof kind);
      expect(rounded).toBe(true);
    }
    for (const spec of specs) {
      if (spec.shape !== "cylinder") expect(spec.chamfer).toBeGreaterThan(0);
    }
  });

  it("builds every part with the geometry of its declared shape and uses each shape at least once", async () => {
    const expected: Record<string, unknown> = { lathe: THREE.LatheGeometry, cylinder: THREE.CylinderGeometry, extrude: THREE.ExtrudeGeometry };
    const used = new Set<string>();
    for (const id of WEAPON_IDS) {
      const { meshes, specs } = await load(id);
      for (const spec of specs) {
        const mesh = meshes.find((candidate) => candidate.name === spec.name);
        const kind = expected[spec.shape] as new () => THREE.BufferGeometry;
        expect(mesh?.geometry).toBeInstanceOf(kind);
        if (spec.shape !== "lathe") expect(mesh?.geometry).not.toBeInstanceOf(THREE.LatheGeometry);
        if (spec.shape !== "cylinder") expect(mesh?.geometry).not.toBeInstanceOf(THREE.CylinderGeometry);
        if (spec.shape !== "extrude") expect(mesh?.geometry).not.toBeInstanceOf(THREE.ExtrudeGeometry);
        used.add(spec.shape);
      }
    }
    expect([...used].sort()).toEqual(["cylinder", "extrude", "lathe"]);
  });

  it.each(WEAPON_IDS)("shares one material per kind across the parts of %s", async (id) => {
    const { built, meshes, specs } = await load(id);
    expect(Object.keys(built.materials).sort()).toEqual(MATERIAL_KINDS);
    for (const spec of specs) {
      const mesh = meshes.find((candidate) => candidate.name === spec.name);
      expect(mesh?.material).toBe(built.materials[spec.material]);
    }
    expect(new Set(meshes.map((mesh) => mesh.material)).size).toBeLessThanOrEqual(MATERIAL_KINDS.length);
  });

  it("gives the shotgun stock and pump a wood material distinct from the metal barrel", async () => {
    const { built, named } = await load("shotgun");
    expect(named("stock").material).toBe(built.materials.wood);
    expect(named("pump").material).toBe(built.materials.wood);
    expect(named("barrel").material).toBe(built.materials.metal);
    expect(built.materials.wood).not.toBe(built.materials.metal);
    expect(built.materials.wood?.color.getHex()).not.toBe(built.materials.metal?.color.getHex());
  });

  it("lights the energy weapon with an emissive material and no other weapon", async () => {
    const energy = await load("rayGun");
    const glowing = energy.meshes.filter((mesh) => mesh.material === energy.built.materials.emissive);
    expect(glowing.length).toBeGreaterThanOrEqual(2);
    expect(energy.built.materials.emissive?.emissiveIntensity).toBeGreaterThan(0);
    const pistol = await load("pistol");
    expect(pistol.meshes.some((mesh) => mesh.material === pistol.built.materials.emissive)).toBe(false);
  });

  it("keeps the slide parts flagged in the specs present in the model", async () => {
    const { specs, named } = await load("pistol");
    const sliding = specs.filter((spec) => spec.slide);
    expect(sliding.length).toBeGreaterThan(0);
    for (const spec of sliding) expect(named(spec.name)).toBeDefined();
  });

  it("builds fresh geometries and materials at every call", async () => {
    const first = await load("smg");
    const second = await load("smg");
    expect(second.built.group).not.toBe(first.built.group);
    expect(second.built.materials.metal).not.toBe(first.built.materials.metal);
    expect(second.meshes[0]?.geometry).not.toBe(first.meshes[0]?.geometry);
  });
});
