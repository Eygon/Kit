import * as THREE from "three";
import type { GameEvent } from "@/logic/game/gameEvents";

const SHAKE_MODULE = "@/render/cameraShake";
const VISUAL_MODULE = "@/config/visualConfig";
const FRAME_S = 1 / 60;
const BASE = { x: 0.1, y: 0.5, px: 3, py: 1.7, pz: -2 };
const SETTLE_MARGIN_S = 0.3;
const EDGE_FRAMES = 3;

const HIT: GameEvent = { kind: "playerHit", damage: 20, x: 0, z: 0 };
const NUKE: GameEvent = { kind: "nukeDetonated" };
const OTHER: GameEvent = { kind: "zombieHit", id: 0, damage: 10, head: false, knife: false };

const mount = async () => {
  const shakeModule = await import(/* @vite-ignore */ SHAKE_MODULE);
  const visual = (await import(/* @vite-ignore */ VISUAL_MODULE)).VISUAL_CONFIG.CAMERA_SHAKE;
  const shake = shakeModule.createCameraShake();
  const camera = new THREE.PerspectiveCamera();
  camera.rotation.order = "YXZ";
  const syncCamera = (): void => {
    camera.position.set(BASE.px, BASE.py, BASE.pz);
    camera.rotation.set(BASE.x, BASE.y, 0);
  };
  const offsetNow = (): number => Math.hypot(camera.rotation.x - BASE.x, camera.rotation.z);
  const offsets = (seconds: number): number[] => {
    const values: number[] = [];
    for (let elapsed = 0; elapsed < seconds; elapsed += FRAME_S) {
      syncCamera();
      shake.apply(camera, FRAME_S);
      values.push(offsetNow());
    }
    return values;
  };
  syncCamera();
  return { shake, camera, visual, syncCamera, offsetNow, offsets };
};

const peak = (values: number[]): number => Math.max(...values);

describe("cameraShake", () => {
  it("leaves the camera exactly on the player view with no event", async () => {
    const { shake, camera, syncCamera } = await mount();
    shake.trigger([OTHER]);
    syncCamera();
    shake.apply(camera, FRAME_S);
    expect(camera.rotation.x).toBe(BASE.x);
    expect(camera.rotation.y).toBe(BASE.y);
    expect(camera.rotation.z).toBe(0);
    expect(camera.position.toArray()).toEqual([BASE.px, BASE.py, BASE.pz]);
  });

  it("offsets the camera after a playerHit within the configured hit amplitude", async () => {
    const { shake, offsets, visual } = await mount();
    shake.trigger([HIT]);
    const values = offsets(visual.HIT_AMPLITUDE_RAD / visual.DECAY_RAD_PER_S);
    expect(values[0]).toBeGreaterThan(0);
    expect(peak(values)).toBeLessThanOrEqual(visual.HIT_AMPLITUDE_RAD * Math.SQRT2 + 1e-9);
  });

  it("shakes harder for a nuke than for a player hit", async () => {
    const hit = await mount();
    hit.shake.trigger([HIT]);
    const nuke = await mount();
    nuke.shake.trigger([NUKE]);
    expect(nuke.visual.NUKE_AMPLITUDE_RAD).toBeGreaterThan(nuke.visual.HIT_AMPLITUDE_RAD);
    expect(peak(nuke.offsets(0.3))).toBeGreaterThan(peak(hit.offsets(0.3)));
  });

  it("keeps the strongest amplitude whatever the order of the events", async () => {
    const together = await mount();
    together.shake.trigger([HIT, NUKE, HIT]);
    const sequence = await mount();
    sequence.shake.trigger([NUKE]);
    sequence.shake.trigger([HIT]);
    const alone = await mount();
    alone.shake.trigger([NUKE]);
    const reference = alone.offsets(0.3);
    expect(together.offsets(0.3)).toEqual(reference);
    expect(sequence.offsets(0.3)).toEqual(reference);
  });

  it("never exceeds the configured maximum", async () => {
    const { shake, offsets, visual } = await mount();
    shake.trigger(Array.from({ length: 50 }, () => NUKE));
    expect(peak(offsets(0.3))).toBeLessThanOrEqual(visual.MAX_AMPLITUDE_RAD * Math.SQRT2 + 1e-9);
  });

  it("decays over time", async () => {
    const { shake, offsets, visual } = await mount();
    shake.trigger([NUKE]);
    const values = offsets(visual.NUKE_AMPLITUDE_RAD / visual.DECAY_RAD_PER_S);
    expect(peak(values.slice(0, EDGE_FRAMES))).toBeGreaterThan(peak(values.slice(-EDGE_FRAMES * 4)));
  });

  it("returns exactly to the player view once the shake is over", async () => {
    const { shake, camera, syncCamera, offsets, visual } = await mount();
    shake.trigger([NUKE]);
    offsets(visual.NUKE_AMPLITUDE_RAD / visual.DECAY_RAD_PER_S + SETTLE_MARGIN_S);
    syncCamera();
    shake.apply(camera, FRAME_S);
    expect(camera.rotation.x).toBe(BASE.x);
    expect(camera.rotation.y).toBe(BASE.y);
    expect(camera.rotation.z).toBe(0);
    expect(camera.position.toArray()).toEqual([BASE.px, BASE.py, BASE.pz]);
  });

  it("does not decay while the frame time is zero", async () => {
    const { shake, camera, syncCamera, visual } = await mount();
    shake.trigger([HIT]);
    for (let frame = 0; frame < 100; frame++) {
      syncCamera();
      shake.apply(camera, 0);
    }
    syncCamera();
    shake.apply(camera, 0);
    expect(Math.hypot(camera.rotation.x - BASE.x, camera.rotation.z)).toBeCloseTo(visual.HIT_AMPLITUDE_RAD, 6);
  });
});
