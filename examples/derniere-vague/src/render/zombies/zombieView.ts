import * as THREE from "three";
import { ZOMBIE_VISUAL } from "@/config/visualConfig";
import { ZOMBIE_CONFIG } from "@/config/zombieConfig";
import type { GameEvent } from "@/logic/game/gameEvents";
import type { BloodParticles } from "@/render/effects/bloodParticles";
import { buildZombie, poseZombie } from "@/render/models/zombieModel";
import type { ZombieGait, ZombieParts, ZombieReaction, ZombieVariant } from "@/render/models/zombieModel";
import type { Horde } from "@/logic/zombies/zombieHorde";

const VARIANT_COUNT = ZOMBIE_VISUAL.VARIANTS.length;
const VIS = ZOMBIE_VISUAL;
const reaction: ZombieReaction = { recoil: 0, headSnap: 0 };

export type ZombieView = {
  group: THREE.Group;
  update: (horde: Readonly<Horde>, events: readonly GameEvent[], alpha: number, frameS: number) => void;
  dispose: () => void;
};

export const createZombieView = (scene: THREE.Scene, parts: ZombieParts, bloodParticles: BloodParticles): ZombieView => {
  const group = new THREE.Group();
  group.name = "zombies";
  const pooled: THREE.Group[] = [];
  const walkPhaseS = new Float32Array(ZOMBIE_CONFIG.ZOMBIE_MAX_ALIVE);
  const reactionS = new Float32Array(ZOMBIE_CONFIG.ZOMBIE_MAX_ALIVE);
  const headHit = new Uint8Array(ZOMBIE_CONFIG.ZOMBIE_MAX_ALIVE);
  for (let index = 0; index < ZOMBIE_CONFIG.ZOMBIE_MAX_ALIVE; index++) {
    const zombieGroup = buildZombie(parts, (index % VARIANT_COUNT) as ZombieVariant);
    zombieGroup.visible = false;
    pooled.push(zombieGroup);
    group.add(zombieGroup);
  }
  scene.add(group);

  const startReactions = (horde: Readonly<Horde>, events: readonly GameEvent[]): void => {
    for (let index = 0; index < events.length; index++) {
      const event = events[index] as GameEvent;
      if (event.kind !== "zombieHit") continue;
      const zombie = horde.zombies[event.id];
      if (!zombie || !zombie.alive) continue;
      reactionS[event.id] = VIS.HIT_REACTION_S;
      headHit[event.id] = event.head ? 1 : 0;
      bloodParticles.emit(zombie.x, event.head ? VIS.HIT_HEAD_Y_M : VIS.HIT_TORSO_Y_M, zombie.z, event.head ? VIS.HIT_BLOOD_HEAD_COUNT : VIS.HIT_BLOOD_TORSO_COUNT);
    }
  };

  const update: ZombieView["update"] = (horde, events, alpha, frameS) => {
    startReactions(horde, events);
    for (let index = 0; index < pooled.length; index++) {
      const zombieGroup = pooled[index];
      const zombie = horde.zombies[index];
      if (!zombieGroup || !zombie) continue;
      zombieGroup.visible = zombie.alive;
      if (!zombie.alive) {
        walkPhaseS[index] = 0;
        reactionS[index] = 0;
        continue;
      }
      zombieGroup.position.x = zombie.prevX + (zombie.x - zombie.prevX) * alpha;
      zombieGroup.position.z = zombie.prevZ + (zombie.z - zombie.prevZ) * alpha;
      zombieGroup.rotation.y = zombie.yaw;
      if (zombie.state === "chasing") walkPhaseS[index] = (walkPhaseS[index] ?? 0) + (frameS * zombie.speedMps) / ZOMBIE_CONFIG.ZOMBIE_SPEEDS_MPS.walk;
      const gait: ZombieGait = zombie.speedMps >= ZOMBIE_CONFIG.ZOMBIE_SPEEDS_MPS.run ? "run" : "walk";
      const leftS = reactionS[index] ?? 0;
      const ratio = leftS / VIS.HIT_REACTION_S;
      reaction.recoil = ratio * ratio;
      reaction.headSnap = headHit[index] ? reaction.recoil : 0;
      poseZombie(zombieGroup, zombie.state, zombie.state === "chasing" ? (walkPhaseS[index] ?? 0) : zombie.stateTimeS, gait, reaction);
      reactionS[index] = Math.max(0, leftS - frameS);
    }
  };

  const dispose = (): void => {
    scene.remove(group);
  };

  return { group, update, dispose };
};
