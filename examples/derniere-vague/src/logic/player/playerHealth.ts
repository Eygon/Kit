import { PLAYER_CONFIG } from "@/config/playerConfig";

export type PlayerHealth = { status: "alive"; hitsTaken: number; sinceHitS: number } | { status: "dead" };

export const createHealth = (): PlayerHealth => ({ status: "alive", hitsTaken: 0, sinceHitS: 0 });

export const applyPlayerHit = (health: PlayerHealth): PlayerHealth => {
  if (health.status === "dead") return health;
  health.hitsTaken++;
  health.sinceHitS = 0;
  return health.hitsTaken >= PLAYER_CONFIG.PLAYER_HITS_TO_DIE ? { status: "dead" } : health;
};

export const updateHealth = (health: PlayerHealth, stepS: number): PlayerHealth => {
  if (health.status === "dead" || health.hitsTaken === 0) return health;
  health.sinceHitS += stepS;
  if (health.sinceHitS < PLAYER_CONFIG.PLAYER_REGEN_DELAY_S) return health;
  health.hitsTaken = 0;
  health.sinceHitS = 0;
  return health;
};
