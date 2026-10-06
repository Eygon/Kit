import { createAmbience } from "@/audio/ambience";
import type { AudioEngine } from "@/audio/audioEngine";
import {
  playBoxRoll,
  playBoxTeddy,
  playDeny,
  playDoor,
  playDryClick,
  playFootstep,
  playGroan,
  playHitMarker,
  playHurt,
  playKillMarker,
  playKnife,
  playNuke,
  playPlankRepaired,
  playPlankTorn,
  playPowerUpTaken,
  playPurchase,
  playReload,
  playRoundEnd,
  playRoundJingle,
  playShot,
  playZombieAttack,
} from "@/audio/soundVoices";
import { AUDIO_CONFIG } from "@/config/audioConfig";
import type { GameEvent } from "@/logic/game/gameEvents";
import type { GameSession } from "@/logic/game/gameSession";
import { createRandom } from "@/logic/random";
import type { RoundPhase } from "@/logic/rounds/roundDirector";
import type { Zombie } from "@/logic/zombies/zombieHorde";

export type DirectorSession = Pick<GameSession, "events" | "player" | "weapon" | "rounds"> & { readonly horde: { readonly zombies: readonly Pick<Zombie, "id" | "alive" | "state" | "x" | "z">[] } };

export type AudioDirector = {
  update: (session: DirectorSession, frameS: number) => void;
};

const MAX_GROAN_DISTANCE_SQ_M = AUDIO_CONFIG.GROAN_MAX_DISTANCE_M * AUDIO_CONFIG.GROAN_MAX_DISTANCE_M;

export const createAudioDirector = (audio: AudioEngine): AudioDirector => {
  const random = createRandom(AUDIO_CONFIG.PRESENTATION_SEED);
  const ambience = createAmbience(audio);
  let previousPhase: RoundPhase["kind"] | null = null;
  const groanTimersS = new Map<number, number>();
  const previousStates = new Map<number, string>();
  let lastX: number | null = null;
  let lastZ: number | null = null;
  let walkedM = 0;

  const nextGroanDelayS = (): number => random.range(AUDIO_CONFIG.GROAN_MIN_S, AUDIO_CONFIG.GROAN_MAX_S);

  const playEvent = (event: GameEvent, session: DirectorSession): void => {
    if (event.kind === "shotFired") playShot(audio, session.weapon.weaponId);
    else if (event.kind === "dryFired") playDryClick(audio);
    else if (event.kind === "reloadStarted") playReload(audio);
    else if (event.kind === "knifeSwung") playKnife(audio);
    else if (event.kind === "playerHit") playHurt(audio);
    else if (event.kind === "roundStarted") playRoundJingle(audio);
    else if (event.kind === "purchaseDone") playPurchase(audio);
    else if (event.kind === "purchaseDenied") playDeny(audio);
    else if (event.kind === "doorOpening") playDoor(audio);
    else if (event.kind === "plankTorn") playPlankTorn(audio, event.x, event.z);
    else if (event.kind === "plankRepaired") playPlankRepaired(audio, event.x, event.z);
    else if (event.kind === "boxOpened") playBoxRoll(audio);
    else if (event.kind === "boxTeddy") playBoxTeddy(audio);
    else if (event.kind === "powerUpTaken") playPowerUpTaken(audio);
    else if (event.kind === "nukeDetonated") playNuke(audio);
    else if (event.kind === "zombieKilled") playKillMarker(audio);
  };

  const playHitMarkerOnce = (events: readonly GameEvent[]): void => {
    if (events.some((event) => event.kind === "zombieKilled")) return;
    if (events.some((event) => event.kind === "targetHit")) playHitMarker(audio);
  };

  const trackFootsteps = (x: number, z: number): void => {
    if (lastX !== null && lastZ !== null) {
      const stepM = Math.hypot(x - lastX, z - lastZ);
      if (stepM <= AUDIO_CONFIG.FOOTSTEP_MAX_JUMP_M) walkedM += stepM;
    }
    lastX = x;
    lastZ = z;
    if (walkedM < AUDIO_CONFIG.FOOTSTEP_STRIDE_M) return;
    walkedM -= AUDIO_CONFIG.FOOTSTEP_STRIDE_M;
    playFootstep(audio);
  };

  const trackGroan = (zombie: DirectorSession["horde"]["zombies"][number], playerX: number, playerZ: number, frameS: number): void => {
    const dx = zombie.x - playerX;
    const dz = zombie.z - playerZ;
    if (zombie.state !== "chasing" || dx * dx + dz * dz > MAX_GROAN_DISTANCE_SQ_M) {
      groanTimersS.delete(zombie.id);
      return;
    }
    const remainingS = (groanTimersS.get(zombie.id) ?? nextGroanDelayS()) - frameS;
    if (remainingS > 0) {
      groanTimersS.set(zombie.id, remainingS);
      return;
    }
    playGroan(audio, zombie.x, zombie.z);
    groanTimersS.set(zombie.id, nextGroanDelayS());
  };

  const trackZombie = (zombie: DirectorSession["horde"]["zombies"][number], playerX: number, playerZ: number, frameS: number): void => {
    if (!zombie.alive) {
      groanTimersS.delete(zombie.id);
      previousStates.delete(zombie.id);
      return;
    }
    if (zombie.state === "attacking" && previousStates.get(zombie.id) !== "attacking") playZombieAttack(audio, zombie.x, zombie.z);
    previousStates.set(zombie.id, zombie.state);
    trackGroan(zombie, playerX, playerZ, frameS);
  };

  const trackRoundEnd = (phase: RoundPhase): void => {
    if (previousPhase === "active" && phase.kind === "intermission") playRoundEnd(audio);
    previousPhase = phase.kind;
  };

  const update = (session: DirectorSession, frameS: number): void => {
    session.events.forEach((event) => playEvent(event, session));
    trackRoundEnd(session.rounds.phase);
    ambience.update(session.rounds.number, frameS);
    playHitMarkerOnce(session.events);
    trackFootsteps(session.player.x, session.player.z);
    session.horde.zombies.forEach((zombie) => trackZombie(zombie, session.player.x, session.player.z, frameS));
  };

  return { update };
};
