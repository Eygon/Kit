import * as THREE from "three";

const HAND_MODULE = "@/render/models/handModel";
const VISUAL_MODULE = "@/config/visualConfig";
const FINGER_COUNT = 4;

type HandPart = { name: string; kind: string };

const load = async () => {
  const handModule = await import(/* @vite-ignore */ HAND_MODULE);
  const visualModule = await import(/* @vite-ignore */ VISUAL_MODULE);
  const hand: THREE.Group = handModule.buildGlovedHand();
  const meshes: THREE.Mesh[] = [];
  hand.traverse((object) => {
    if (object instanceof THREE.Mesh) meshes.push(object);
  });
  const named = (name: string): THREE.Mesh | undefined => meshes.find((mesh) => mesh.name === name);
  const config = visualModule.VISUAL_CONFIG.VIEW_MODEL.HAND;
  return { hand, meshes, named, config };
};

describe("buildGlovedHand", () => {
  it("returns a group named glovedHand built from one mesh per configured part", async () => {
    const { hand, meshes, config } = await load();
    expect(hand).toBeInstanceOf(THREE.Group);
    expect(hand.name).toBe("glovedHand");
    expect(meshes).toHaveLength(config.PARTS.length);
  });

  it("has a palm, four fingers, a thumb, a cuff and a forearm sleeve", async () => {
    const { named } = await load();
    for (const name of ["palm", "thumb", "cuff", "forearm"]) expect(named(name)).toBeDefined();
    for (let index = 0; index < FINGER_COUNT; index++) expect(named(`finger${index}`)).toBeDefined();
  });

  it("uses the configured glove color and roughness on every mesh", async () => {
    const { meshes, config } = await load();
    expect(config.GLOVE_COLOR).toBeTypeOf("number");
    for (const mesh of meshes) {
      const material = mesh.material as THREE.MeshStandardMaterial;
      expect(material.color.getHex()).toBe(config.GLOVE_COLOR);
      expect(material.roughness).toBe(config.GLOVE_ROUGHNESS);
    }
  });

  it("builds both box and capsule primitives", async () => {
    const { meshes, config } = await load();
    const kinds = new Set((config.PARTS as HandPart[]).map((part) => part.kind));
    expect(kinds).toEqual(new Set(["box", "capsule"]));
    expect(meshes.some((mesh) => mesh.geometry instanceof THREE.BoxGeometry)).toBe(true);
    expect(meshes.some((mesh) => mesh.geometry instanceof THREE.CapsuleGeometry)).toBe(true);
  });

  it("shares one geometry between the four fingers", async () => {
    const { named } = await load();
    const first = named("finger0")?.geometry;
    expect(first).toBeDefined();
    for (let index = 1; index < FINGER_COUNT; index++) expect(named(`finger${index}`)?.geometry).toBe(first);
  });

  it("places the forearm behind the palm and the fingers in front of the cuff", async () => {
    const { named } = await load();
    const palmZ = named("palm")?.position.z ?? 0;
    expect(named("forearm")?.position.z ?? 0).toBeGreaterThan(palmZ);
    expect(named("cuff")?.position.z ?? 0).toBeGreaterThan(palmZ);
    expect(named("finger0")?.position.z ?? 0).toBeLessThan(named("cuff")?.position.z ?? 0);
  });

  it("gives the hand a non-empty volume and fresh meshes at every call", async () => {
    const { hand } = await load();
    const size = new THREE.Box3().setFromObject(hand).getSize(new THREE.Vector3());
    expect(size.x).toBeGreaterThan(0);
    expect(size.y).toBeGreaterThan(0);
    expect(size.z).toBeGreaterThan(0);
    const second = await load();
    expect(second.hand).not.toBe(hand);
  });
});

describe("buildGlovedHand wrapped fingers and rounded cuff", () => {
  it("wraps four capsule fingertips around the side of the grip, behind the fingers and ahead of the cuff", async () => {
    const { named, config } = await load();
    const first = named("fingerTip0")?.geometry;
    expect(first).toBeInstanceOf(THREE.CapsuleGeometry);
    for (let index = 0; index < FINGER_COUNT; index++) {
      const tip = named(`fingerTip${index}`);
      expect(tip).toBeDefined();
      expect(tip?.geometry).toBe(first);
      expect(tip?.position.x ?? 0).toBeGreaterThan(0);
      expect(tip?.position.z ?? 0).toBeGreaterThan(named(`finger${index}`)?.position.z ?? 0);
      expect(tip?.position.z ?? 0).toBeLessThan(named("cuff")?.position.z ?? 0);
      expect(tip?.position.y).toBe(named(`finger${index}`)?.position.y);
    }
    expect((config.PARTS as HandPart[]).filter((part) => part.name.startsWith("fingerTip"))).toHaveLength(FINGER_COUNT);
  });

  it("rounds the cuff as a capsule instead of a box", async () => {
    const { named, config } = await load();
    expect((config.PARTS as HandPart[]).find((part) => part.name === "cuff")?.kind).toBe("capsule");
    expect(named("cuff")?.geometry).toBeInstanceOf(THREE.CapsuleGeometry);
  });
});
