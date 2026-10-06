import type * as THREE from "three";
import { VISUAL_CONFIG } from "@/config/visualConfig";
import type { GameEvent } from "@/logic/game/gameEvents";

export type CameraShake = {
  trigger: (events: readonly GameEvent[]) => void;
  apply: (camera: THREE.Camera, frameS: number) => void;
};

const SHAKE = VISUAL_CONFIG.CAMERA_SHAKE;
const FULL_TURN_RAD = Math.PI * 2;

const amplitudeOf = (event: GameEvent): number => {
  if (event.kind === "nukeDetonated") return SHAKE.NUKE_AMPLITUDE_RAD;
  if (event.kind === "playerHit") return SHAKE.HIT_AMPLITUDE_RAD;
  return 0;
};

export const createCameraShake = (): CameraShake => {
  let amplitudeRad = 0;
  let timeS = 0;

  const trigger: CameraShake["trigger"] = (events) => {
    for (let index = 0; index < events.length; index++) {
      amplitudeRad = Math.min(SHAKE.MAX_AMPLITUDE_RAD, Math.max(amplitudeRad, amplitudeOf(events[index] as GameEvent)));
    }
  };

  const apply: CameraShake["apply"] = (camera, frameS) => {
    if (amplitudeRad <= 0) {
      timeS = 0;
      return;
    }
    const phase = timeS * SHAKE.FREQUENCY_HZ * FULL_TURN_RAD;
    camera.rotation.x += amplitudeRad * Math.cos(phase);
    camera.rotation.z += amplitudeRad * Math.sin(phase);
    const stepS = Math.max(0, frameS);
    timeS += stepS;
    amplitudeRad = Math.max(0, amplitudeRad - SHAKE.DECAY_RAD_PER_S * stepS);
  };

  return { trigger, apply };
};
