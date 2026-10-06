import * as THREE from "three";
import { DROP_BLINK_S, MAX_DROPS_PER_ROUND, POWER_UP_KINDS } from "@/config/powerUpConfig";
import { VISUAL_CONFIG } from "@/config/visualConfig";
import type { PowerUps } from "@/logic/powerUps/powerUps";
import { createPowerUpModel } from "@/render/models/powerUpModel";

export type PowerUpView = {
  update: (powerUps: Readonly<PowerUps>, frameS: number) => void;
  dispose: () => void;
};

const POWER_UP = VISUAL_CONFIG.POWER_UP;
const BLINK_PHASES_PER_CYCLE = 2;

const isBlinkVisible = (remainingS: number): boolean => remainingS >= DROP_BLINK_S || Math.floor(remainingS * POWER_UP.BLINK_HZ * BLINK_PHASES_PER_CYCLE) % BLINK_PHASES_PER_CYCLE === 0;

export const createPowerUpView = (scene: THREE.Scene): PowerUpView => {
  const model = createPowerUpModel();
  const group = new THREE.Group();
  group.name = "powerUps";
  const slots: THREE.Group[][] = [];
  for (let slot = 0; slot < MAX_DROPS_PER_ROUND; slot++) {
    const tokens = POWER_UP_KINDS.map((kind) => {
      const token = model.build(kind);
      token.visible = false;
      group.add(token);
      return token;
    });
    slots.push(tokens);
  }
  scene.add(group);

  let timeS = 0;

  const update: PowerUpView["update"] = (powerUps, frameS) => {
    timeS += frameS;
    const floatY = POWER_UP.FLOAT_Y_M + Math.sin(timeS * POWER_UP.BOB_RAD_S) * POWER_UP.BOB_M;
    const spinRad = timeS * POWER_UP.SPIN_RAD_S;
    for (let slot = 0; slot < slots.length; slot++) {
      const drop = powerUps.drops[slot];
      const tokens = slots[slot];
      if (!tokens) continue;
      const shown = drop !== undefined && drop.active && isBlinkVisible(drop.remainingS);
      for (let index = 0; index < tokens.length; index++) {
        const token = tokens[index];
        if (!token) continue;
        const visible = shown && POWER_UP_KINDS[index] === drop.kind;
        token.visible = visible;
        if (!visible) continue;
        token.position.set(drop.x, floatY, drop.z);
        token.rotation.y = spinRad;
      }
    }
  };

  const dispose = (): void => {
    scene.remove(group);
    model.dispose();
  };

  return { update, dispose };
};
