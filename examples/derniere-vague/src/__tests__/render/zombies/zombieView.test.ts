import * as THREE from "three";
import { createRandom } from "@/logic/random";
import { BARRICADE } from "@/config/mapConfig";
import { createStationLayout } from "@/logic/map/stationLayout";
import type { GameEvent } from "@/logic/game/gameEvents";

const VIEW_MODULE = "@/render/zombies/zombieView";
const MODEL_MODULE = "@/render/models/zombieModel";
const HORDE_MODULE = "@/logic/zombies/zombieHorde";
const CONFIG_MODULE = "@/config/zombieConfig";
const VISUAL_MODULE = "@/config/visualConfig";
const VARIANT_COUNT = 3;
const MAX_SHARED_GEOMETRIES = 12;
const MAX_SHARED_MATERIALS = 10;
const FRAME_S = 1 / 60;
const HP = 100;
const PLAYER = { x: 0, z: 2.5 };
const HALF = 0.5;
const NO_EVENTS: readonly GameEvent[] = [];
const BLOOD_MODULE = "@/render/effects/bloodParticles";
const BLOOD_BURST_SAMPLES = 50;
const RECOIL_TOLERANCE_RAD = 1e-6;

const hitEvent = (id: number, head: boolean): GameEvent => ({ kind: "zombieHit", id, damage: 20, head, knife: false });

const load = async () => {
  const viewModule = await import(/* @vite-ignore */ VIEW_MODULE);
  const modelModule = await import(/* @vite-ignore */ MODEL_MODULE);
  const hordeModule = await import(/* @vite-ignore */ HORDE_MODULE);
  const config = (await import(/* @vite-ignore */ CONFIG_MODULE)).ZOMBIE_CONFIG;
  const visual = (await import(/* @vite-ignore */ VISUAL_MODULE)).ZOMBIE_VISUAL;
  const scene = new THREE.Scene();
  const parts = modelModule.createZombieParts();
  const bloodModule = await import(/* @vite-ignore */ BLOOD_MODULE);
  const blood = bloodModule.createBloodParticles(scene);
  const emitSpy = vi.spyOn(blood, "emit");
  const view = viewModule.createZombieView(scene, parts, blood);
  const horde = hordeModule.createHorde();
  const layout = createStationLayout();
  const random = createRandom(11);
  const events: GameEvent[] = [];
  const zombieGroups = (): THREE.Object3D[] => scene.getObjectByName("zombies")?.children ?? [];
  const visibleCount = (): number => zombieGroups().filter((group) => group.visible).length;
  const step = (count = 1): void => {
    for (let i = 0; i < count; i++) hordeModule.updateHorde(horde, PLAYER, FRAME_S, layout, events);
  };
  const spawn = (count = 1): void => {
    for (let i = 0; i < count; i++) hordeModule.requestSpawn(horde, HP, "walk", layout, random);
  };
  return { view, scene, parts, blood, emitSpy, horde, hordeModule, config, visual, layout, events, zombieGroups, visibleCount, step, spawn };
};

describe("zombieView", () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates ZOMBIE_MAX_ALIVE hidden pooled groups under one parent at load", async () => {
    const { zombieGroups, config, visibleCount } = await load();
    expect(zombieGroups()).toHaveLength(config.ZOMBIE_MAX_ALIVE);
    expect(visibleCount()).toBe(0);
  });

  it("shows exactly the alive slots", async () => {
    const { view, horde, spawn, step, visibleCount, zombieGroups } = await load();
    spawn(3);
    step();
    view.update(horde, NO_EVENTS, 1, FRAME_S);
    expect(visibleCount()).toBe(3);
    expect(zombieGroups().slice(0, 3).every((group) => group.visible)).toBe(true);
    expect(zombieGroups().slice(3).every((group) => !group.visible)).toBe(true);
  });

  it("mirrors position and interpolates between the previous and the current step", async () => {
    const { view, horde, spawn, step, zombieGroups } = await load();
    spawn(1);
    step(Math.round(1.6 / FRAME_S));
    const zombie = horde.zombies[0];
    zombie.prevX = 2;
    zombie.prevZ = -1;
    zombie.x = 4;
    zombie.z = -3;
    view.update(horde, NO_EVENTS, HALF, FRAME_S);
    const group = zombieGroups()[0];
    expect(group?.position.x).toBeCloseTo(3, 6);
    expect(group?.position.z).toBeCloseTo(-2, 6);
    view.update(horde, NO_EVENTS, 1, FRAME_S);
    expect(group?.position.x).toBeCloseTo(4, 6);
  });

  it("faces the zombie yaw", async () => {
    const { view, horde, spawn, step, zombieGroups } = await load();
    spawn(1);
    step(Math.round(1.6 / FRAME_S));
    view.update(horde, NO_EVENTS, 1, FRAME_S);
    expect(zombieGroups()[0]?.rotation.y).toBeCloseTo(horde.zombies[0].yaw, 6);
  });

  it("poses the attack swing from the state timer", async () => {
    const { view, horde, spawn, zombieGroups, config } = await load();
    spawn(1);
    const zombie = horde.zombies[0];
    zombie.state = "attacking";
    zombie.stateTimeS = config.ZOMBIE_ATTACK_WINDUP_S;
    view.update(horde, NO_EVENTS, 1, FRAME_S);
    const raised = zombieGroups()[0]?.getObjectByName("armLeft")?.rotation.x ?? 0;
    zombie.state = "chasing";
    view.update(horde, NO_EVENTS, 1, FRAME_S);
    const chasing = zombieGroups()[0]?.getObjectByName("armLeft")?.rotation.x ?? 0;
    expect(raised).toBeGreaterThan(chasing);
  });

  it("poses a breaching zombie hauling at the planks instead of climbing", async () => {
    const { view, horde, spawn, zombieGroups } = await load();
    spawn(1);
    const zombie = horde.zombies[0];
    expect(zombie.state).toBe("breaching");
    zombie.stateTimeS = 0;
    view.update(horde, NO_EVENTS, 1, FRAME_S);
    const reach = zombieGroups()[0]?.getObjectByName("armLeft")?.rotation.x ?? 0;
    zombie.stateTimeS = BARRICADE.TEAR_INTERVAL_S * 0.9;
    view.update(horde, NO_EVENTS, 1, FRAME_S);
    const rig = zombieGroups()[0]?.getObjectByName("rig");
    const pull = zombieGroups()[0]?.getObjectByName("armLeft")?.rotation.x ?? 0;
    expect(reach).toBeGreaterThan(pull);
    expect(rig?.position.y).toBeCloseTo(0, 6);
    expect(rig?.rotation.x).toBeLessThan(0);
  });

  it("lays a dying zombie down and hides the slot once it returns to the pool", async () => {
    const { view, horde, spawn, step, hordeModule, events, zombieGroups, config, visibleCount } = await load();
    spawn(1);
    step(Math.round(config.ZOMBIE_SPAWN_S / FRAME_S) + 5);
    hordeModule.damageZombie(horde, 0, HP, false, false, events);
    step(Math.round(config.ZOMBIE_DEATH_S * HALF / FRAME_S));
    view.update(horde, NO_EVENTS, 1, FRAME_S);
    expect(zombieGroups()[0]?.visible).toBe(true);
    expect(zombieGroups()[0]?.getObjectByName("rig")?.rotation.x).toBeGreaterThan(0);
    step(Math.round(config.ZOMBIE_DEATH_S / FRAME_S));
    view.update(horde, NO_EVENTS, 1, FRAME_S);
    expect(visibleCount()).toBe(0);
  });

  it("advances the walk phase with time so the legs move between frames", async () => {
    const { view, horde, spawn, step, zombieGroups, config } = await load();
    spawn(1);
    step(Math.round(config.ZOMBIE_SPAWN_S / FRAME_S) + 5);
    const angles = new Set<number>();
    for (let i = 0; i < 20; i++) {
      step();
      view.update(horde, NO_EVENTS, 1, FRAME_S);
      angles.add(zombieGroups()[0]?.getObjectByName("legLeft")?.rotation.x ?? 0);
    }
    expect(angles.size).toBeGreaterThan(5);
  });

  it("does not add or remove scene objects while updating", async () => {
    const { view, horde, spawn, step, scene } = await load();
    spawn(5);
    let count = 0;
    scene.traverse(() => count++);
    for (let i = 0; i < 120; i++) {
      step();
      view.update(horde, NO_EVENTS, 1, FRAME_S);
    }
    let after = 0;
    scene.traverse(() => after++);
    expect(after).toBe(count);
  });

  it("reuses the shared geometries and materials of the parts for every pooled group", async () => {
    const { zombieGroups } = await load();
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material | THREE.Material[]>();
    zombieGroups().forEach((group) =>
      group.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        geometries.add(object.geometry);
        materials.add(object.material);
      }),
    );
    expect(geometries.size).toBeLessThanOrEqual(MAX_SHARED_GEOMETRIES);
    expect(materials.size).toBeLessThanOrEqual(MAX_SHARED_MATERIALS);
  });

  it("distributes exactly three variants across the pool, slot i wearing variant i modulo 3", async () => {
    const { zombieGroups } = await load();
    const skinOf = (group: THREE.Object3D | undefined): THREE.Material | THREE.Material[] | undefined => (group?.getObjectByName("skull") as THREE.Mesh | undefined)?.material;
    const groups = zombieGroups();
    expect(new Set(groups.map((group) => skinOf(group))).size).toBe(VARIANT_COUNT);
    groups.forEach((group, index) => expect(skinOf(group)).toBe(skinOf(groups[index % VARIANT_COUNT])));
    expect(skinOf(groups[0])).not.toBe(skinOf(groups[1]));
  });

  it("poses a chasing zombie at run speed with the run lean and at walk speed with the walk lean", async () => {
    const { view, horde, spawn, zombieGroups, config, visual } = await load();
    spawn(1);
    const zombie = horde.zombies[0];
    zombie.state = "chasing";
    zombie.stateTimeS = 0;
    zombie.speedMps = config.ZOMBIE_SPEEDS_MPS.walk;
    view.update(horde, NO_EVENTS, 1, 0);
    const rig = zombieGroups()[0]?.getObjectByName("rig");
    expect(rig?.rotation.x).toBeCloseTo(-visual.WALK_LEAN_RAD, 6);
    zombie.speedMps = config.ZOMBIE_SPEEDS_MPS.run;
    view.update(horde, NO_EVENTS, 1, 0);
    expect(rig?.rotation.x).toBeCloseTo(-visual.RUN_LEAN_RAD, 6);
    zombie.speedMps = config.ZOMBIE_SPEEDS_MPS.sprint;
    view.update(horde, NO_EVENTS, 1, 0);
    expect(rig?.rotation.x).toBeCloseTo(-visual.RUN_LEAN_RAD, 6);
  });

  it("limps while chasing at walk speed", async () => {
    const { view, horde, spawn, zombieGroups, config } = await load();
    spawn(1);
    const zombie = horde.zombies[0];
    zombie.state = "chasing";
    zombie.speedMps = config.ZOMBIE_SPEEDS_MPS.walk;
    let leftMax = 0;
    let rightMax = 0;
    for (let i = 0; i < 120; i++) {
      view.update(horde, NO_EVENTS, 1, FRAME_S);
      leftMax = Math.max(leftMax, Math.abs(zombieGroups()[0]?.getObjectByName("legLeft")?.rotation.x ?? 0));
      rightMax = Math.max(rightMax, Math.abs(zombieGroups()[0]?.getObjectByName("legRight")?.rotation.x ?? 0));
    }
    expect(Math.abs(leftMax - rightMax)).toBeGreaterThan(0.05);
  });

  it("removes the pool from the scene on dispose without disposing the shared parts", async () => {
    const { view, scene, parts } = await load();
    const spy = vi.spyOn(parts.skinTexture, "dispose");
    view.dispose();
    expect(scene.getObjectByName("zombies")).toBeUndefined();
    expect(spy).not.toHaveBeenCalled();
  });

  const chaseSetup = async () => {
    const ctx = await load();
    ctx.spawn(1);
    const zombie = ctx.horde.zombies[0];
    zombie.state = "chasing";
    zombie.speedMps = ctx.config.ZOMBIE_SPEEDS_MPS.walk;
    const rig = ctx.zombieGroups()[0]?.getObjectByName("rig") as THREE.Object3D;
    const head = ctx.zombieGroups()[0]?.getObjectByName("head") as THREE.Object3D;
    ctx.view.update(ctx.horde, NO_EVENTS, 1, 0);
    return { ...ctx, zombie, rig, head, baseRig: rig.rotation.x, baseHead: head.rotation.x };
  };

  it("recoils a zombie hit in the body for the configured duration then returns to its pose", async () => {
    const { view, horde, rig, head, baseRig, baseHead, visual } = await chaseSetup();
    const halfS = visual.HIT_REACTION_S * HALF;
    view.update(horde, [hitEvent(0, false)], 1, halfS);
    expect(rig.rotation.x - baseRig).toBeCloseTo(visual.HIT_RECOIL_RAD, 6);
    expect(Math.abs(head.rotation.x - baseHead)).toBeLessThan(RECOIL_TOLERANCE_RAD);
    view.update(horde, NO_EVENTS, 1, halfS);
    const fading = rig.rotation.x - baseRig;
    expect(fading).toBeGreaterThan(RECOIL_TOLERANCE_RAD);
    expect(fading).toBeLessThan(visual.HIT_RECOIL_RAD);
    view.update(horde, NO_EVENTS, 1, 0);
    expect(rig.rotation.x).toBe(baseRig);
    expect(head.rotation.x).toBe(baseHead);
  });

  it("snaps the head back beyond the body recoil when the hit is a headshot", async () => {
    const { view, horde, rig, head, baseRig, baseHead, visual } = await chaseSetup();
    view.update(horde, [hitEvent(0, true)], 1, FRAME_S);
    const headDelta = head.rotation.x - baseHead;
    expect(headDelta).toBeCloseTo(visual.HEAD_SNAP_RAD, 6);
    expect(headDelta).toBeGreaterThan(rig.rotation.x - baseRig);
  });

  it("restarts the reaction timer when the same zombie is hit again", async () => {
    const { view, horde, rig, baseRig, visual } = await chaseSetup();
    view.update(horde, [hitEvent(0, false)], 1, visual.HIT_REACTION_S * 0.9);
    view.update(horde, [hitEvent(0, false)], 1, 0);
    expect(rig.rotation.x - baseRig).toBeCloseTo(visual.HIT_RECOIL_RAD, 6);
  });

  it("emits blood at the zombie x and z at torso height for a body hit and head height for a headshot", async () => {
    const { view, horde, zombie, emitSpy, visual } = await chaseSetup();
    view.update(horde, [hitEvent(0, false)], 1, FRAME_S);
    expect(emitSpy).toHaveBeenLastCalledWith(zombie.x, visual.HIT_TORSO_Y_M, zombie.z, visual.HIT_BLOOD_TORSO_COUNT);
    view.update(horde, [hitEvent(0, true)], 1, FRAME_S);
    expect(emitSpy).toHaveBeenLastCalledWith(zombie.x, visual.HIT_HEAD_Y_M, zombie.z, visual.HIT_BLOOD_HEAD_COUNT);
    expect(visual.HIT_HEAD_Y_M).toBeGreaterThan(visual.HIT_TORSO_Y_M);
    expect(emitSpy).toHaveBeenCalledTimes(2);
  });

  it("ignores other events and hits on a slot that is not alive", async () => {
    const { view, horde, emitSpy } = await chaseSetup();
    view.update(horde, [{ kind: "playerHit", damage: 5, x: 0, z: 0 }, hitEvent(5, false), hitEvent(9999, true)], 1, FRAME_S);
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it("keeps the blood pool at its configured size however many hits land", async () => {
    const { view, horde, blood, scene, emitSpy } = await chaseSetup();
    const points = scene.getObjectByName("bloodParticles") as THREE.Points;
    const count = points.geometry.getAttribute("position").count;
    const buffer = points.geometry.getAttribute("position").array;
    const burst: GameEvent[] = Array.from({ length: BLOOD_BURST_SAMPLES }, () => hitEvent(0, true));
    for (let frame = 0; frame < 10; frame++) view.update(horde, burst, 1, FRAME_S);
    expect(emitSpy).toHaveBeenCalledTimes(BLOOD_BURST_SAMPLES * 10);
    expect(points.geometry.getAttribute("position").count).toBe(count);
    expect(points.geometry.getAttribute("position").array).toBe(buffer);
    expect(blood).toBeDefined();
  });

  it("keeps a dying zombie visible while it rotates to the ground over the dying duration", async () => {
    const { view, horde, spawn, step, hordeModule, events, zombieGroups, config, visual } = await load();
    spawn(1);
    step(Math.round(config.ZOMBIE_SPAWN_S / FRAME_S) + 5);
    hordeModule.damageZombie(horde, 0, HP, false, false, events);
    const rig = zombieGroups()[0]?.getObjectByName("rig") as THREE.Object3D;
    const angles: number[] = [];
    for (let elapsed = 0; elapsed < visual.DEATH_FALL_S + 0.1; elapsed += FRAME_S) {
      step();
      view.update(horde, NO_EVENTS, 1, FRAME_S);
      expect(zombieGroups()[0]?.visible).toBe(true);
      angles.push(rig.rotation.x);
    }
    expect(angles.at(-1)).toBeCloseTo(Math.PI / 2, 6);
    expect(angles[0]).toBeLessThan(angles.at(-1) as number);
  });

});
