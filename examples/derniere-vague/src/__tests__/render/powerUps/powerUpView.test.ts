import * as THREE from "three";
import { DROP_BLINK_S, DROP_LIFETIME_S, MAX_DROPS_PER_ROUND, POWER_UP_KINDS } from "@/config/powerUpConfig";
import type { PowerUpKind } from "@/config/powerUpConfig";
import { createPowerUps } from "@/logic/powerUps/powerUps";
import type { PowerUps } from "@/logic/powerUps/powerUps";

const VIEW_MODULE = "@/render/powerUps/powerUpView";
const VISUAL_MODULE = "@/config/visualConfig";
const FRAME_S = 1 / 60;
const DROP_X = 3.5;
const DROP_Z = -2.25;
const OTHER_X = -6;
const OTHER_Z = 4;
const POSITION_TOLERANCE_M = 1e-6;
const MOTION_FRAMES = 90;
const BLINK_FRAMES = 120;
const BLINKING_REMAINING_S = DROP_BLINK_S - 0.1;

type PowerUpViewHandle = { update: (powerUps: PowerUps, frameS: number) => void; dispose: () => void };

const load = async () => {
  const viewModule = await import(/* @vite-ignore */ VIEW_MODULE);
  const visual = (await import(/* @vite-ignore */ VISUAL_MODULE)).VISUAL_CONFIG.POWER_UP;
  const scene = new THREE.Scene();
  const view: PowerUpViewHandle = viewModule.createPowerUpView(scene);
  const powerUps = createPowerUps();
  const root = (): THREE.Object3D => {
    const found = scene.getObjectByName("powerUps");
    if (!found) throw new Error("powerUps group missing");
    return found;
  };
  const tokens = (): THREE.Object3D[] => root().children;
  const visibleTokens = (): THREE.Object3D[] => tokens().filter((token) => token.visible);
  const drop = (slot: number, kind: PowerUpKind, x: number, z: number, remainingS = DROP_LIFETIME_S): void => {
    const target = powerUps.drops[slot];
    if (!target) throw new Error("slot missing");
    Object.assign(target, { active: true, kind, x, z, remainingS });
  };
  const worldOf = (token: THREE.Object3D): THREE.Vector3 => {
    scene.updateMatrixWorld(true);
    return token.getWorldPosition(new THREE.Vector3());
  };
  return { scene, view, powerUps, visual, root, tokens, visibleTokens, drop, worldOf };
};

describe("powerUpView", () => {
  it("builds one hidden token per slot and kind under one group at load", async () => {
    const { tokens, visibleTokens, scene } = await load();
    expect(scene.getObjectByName("powerUps")).toBeDefined();
    expect(tokens()).toHaveLength(MAX_DROPS_PER_ROUND * POWER_UP_KINDS.length);
    expect(visibleTokens()).toHaveLength(0);
    for (const kind of POWER_UP_KINDS) expect(tokens().filter((token) => token.name === `powerUp-${kind}`)).toHaveLength(MAX_DROPS_PER_ROUND);
  });

  it("shows nothing while no drop is active", async () => {
    const { view, powerUps, visibleTokens } = await load();
    view.update(powerUps, FRAME_S);
    expect(visibleTokens()).toHaveLength(0);
  });

  it("shows exactly one token at the x and z of an active drop, floating above the floor", async () => {
    const { view, powerUps, drop, visibleTokens, worldOf, visual } = await load();
    drop(0, "nuke", DROP_X, DROP_Z);
    view.update(powerUps, FRAME_S);
    const shown = visibleTokens();
    expect(shown).toHaveLength(1);
    const world = worldOf(shown[0] as THREE.Object3D);
    expect(world.x).toBeCloseTo(DROP_X, 6);
    expect(world.z).toBeCloseTo(DROP_Z, 6);
    expect(world.y).toBeGreaterThanOrEqual(visual.FLOAT_Y_M - visual.BOB_M - POSITION_TOLERANCE_M);
    expect(world.y).toBeLessThanOrEqual(visual.FLOAT_Y_M + visual.BOB_M + POSITION_TOLERANCE_M);
  });

  it.each(POWER_UP_KINDS)("shows the %s token and no other for a drop of that kind", async (kind) => {
    const { view, powerUps, drop, visibleTokens } = await load();
    drop(1, kind, DROP_X, DROP_Z);
    view.update(powerUps, FRAME_S);
    expect(visibleTokens().map((token) => token.name)).toEqual([`powerUp-${kind}`]);
  });

  it("shows one token per active drop at its own position", async () => {
    const { view, powerUps, drop, visibleTokens, worldOf } = await load();
    drop(0, "maxAmmo", DROP_X, DROP_Z);
    drop(2, "instaKill", OTHER_X, OTHER_Z);
    view.update(powerUps, FRAME_S);
    const spots = visibleTokens().map((token) => {
      const world = worldOf(token);
      return [Math.round(world.x * 100) / 100, Math.round(world.z * 100) / 100];
    });
    expect(spots).toHaveLength(2);
    expect(spots).toContainEqual([DROP_X, DROP_Z]);
    expect(spots).toContainEqual([OTHER_X, OTHER_Z]);
  });

  it("floats and spins the token while keeping it on its x and z", async () => {
    const { view, powerUps, drop, visibleTokens, worldOf } = await load();
    drop(0, "doublePoints", DROP_X, DROP_Z);
    const heights = new Set<number>();
    const yaws = new Set<number>();
    for (let frame = 0; frame < MOTION_FRAMES; frame++) {
      view.update(powerUps, FRAME_S);
      const token = visibleTokens()[0] as THREE.Object3D;
      const world = worldOf(token);
      heights.add(Math.round(world.y * 1e4));
      yaws.add(Math.round(token.rotation.y * 1e4));
      expect(world.x).toBeCloseTo(DROP_X, 6);
      expect(world.z).toBeCloseTo(DROP_Z, 6);
    }
    expect(heights.size).toBeGreaterThan(5);
    expect(yaws.size).toBeGreaterThan(5);
  });

  it("keeps a fresh drop visible on every frame", async () => {
    const { view, powerUps, drop, visibleTokens } = await load();
    drop(0, "nuke", DROP_X, DROP_Z, DROP_LIFETIME_S);
    for (let frame = 0; frame < BLINK_FRAMES; frame++) {
      view.update(powerUps, FRAME_S);
      expect(visibleTokens()).toHaveLength(1);
    }
  });

  it("alternates visible and hidden while less than DROP_BLINK_S remains", async () => {
    const { view, powerUps, drop, visibleTokens } = await load();
    drop(0, "nuke", DROP_X, DROP_Z, BLINKING_REMAINING_S);
    const states: boolean[] = [];
    for (let frame = 0; frame < BLINK_FRAMES; frame++) {
      view.update(powerUps, FRAME_S);
      states.push(visibleTokens().length === 1);
      const live = powerUps.drops[0];
      if (live) live.remainingS -= FRAME_S;
    }
    expect(states).toContain(true);
    expect(states).toContain(false);
    let flips = 0;
    for (let index = 1; index < states.length; index++) if (states[index] !== states[index - 1]) flips++;
    expect(flips).toBeGreaterThanOrEqual(4);
  });

  it("hides the token again once the drop is taken or expired", async () => {
    const { view, powerUps, drop, visibleTokens } = await load();
    drop(0, "maxAmmo", DROP_X, DROP_Z);
    view.update(powerUps, FRAME_S);
    expect(visibleTokens()).toHaveLength(1);
    const live = powerUps.drops[0];
    if (live) live.active = false;
    view.update(powerUps, FRAME_S);
    expect(visibleTokens()).toHaveLength(0);
  });

  it("swaps the token when a slot is reused by another kind", async () => {
    const { view, powerUps, drop, visibleTokens } = await load();
    drop(0, "maxAmmo", DROP_X, DROP_Z);
    view.update(powerUps, FRAME_S);
    drop(0, "nuke", OTHER_X, OTHER_Z);
    view.update(powerUps, FRAME_S);
    expect(visibleTokens().map((token) => token.name)).toEqual(["powerUp-nuke"]);
  });

  it("builds emissive tokens in a distinct color per kind and adds no light", async () => {
    const { scene, tokens, visual } = await load();
    const lights: THREE.Object3D[] = [];
    scene.traverse((object) => {
      if (object instanceof THREE.Light) lights.push(object);
    });
    expect(lights).toHaveLength(0);
    const emissives = new Set<number>();
    for (const kind of POWER_UP_KINDS) {
      const token = tokens().find((entry) => entry.name === `powerUp-${kind}`) as THREE.Object3D;
      const meshes: THREE.Mesh[] = [];
      token.traverse((object) => {
        if (object instanceof THREE.Mesh) meshes.push(object);
      });
      expect(meshes.length).toBeGreaterThan(0);
      const material = meshes[0]?.material as THREE.MeshStandardMaterial;
      expect(material.emissive.getHex()).not.toBe(0);
      emissives.add(material.emissive.getHex());
      expect(visual.COLORS[kind]).toBeDefined();
    }
    expect(emissives.size).toBe(POWER_UP_KINDS.length);
  });

  it("keeps the same pooled tokens across frames without creating objects", async () => {
    const { view, powerUps, drop, tokens } = await load();
    const before = [...tokens()];
    drop(0, "instaKill", DROP_X, DROP_Z);
    for (let frame = 0; frame < MOTION_FRAMES; frame++) view.update(powerUps, FRAME_S);
    expect(tokens()).toHaveLength(before.length);
    tokens().forEach((token, index) => expect(token).toBe(before[index]));
  });

  it("removes its group from the scene on dispose", async () => {
    const { view, scene } = await load();
    view.dispose();
    expect(scene.getObjectByName("powerUps")).toBeUndefined();
  });
});
