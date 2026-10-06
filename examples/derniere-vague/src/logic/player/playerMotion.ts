import { PLAYER_CONFIG } from "@/config/playerConfig";
import type { InputState } from "@/logic/input/inputState";
import { resolveMovement } from "@/logic/map/stationLayout";
import type { StationLayout, Vec2 } from "@/logic/map/stationLayout";

export type PlayerState = {
  x: number;
  z: number;
  yaw: number;
  pitch: number;
};

const scratchDelta: Vec2 = { x: 0, z: 0 };
const scratchFrom: Vec2 = { x: 0, z: 0 };
const scratchOut: Vec2 = { x: 0, z: 0 };

export const createPlayer = (start: Readonly<Vec2>): PlayerState => ({ x: start.x, z: start.z, yaw: 0, pitch: 0 });

const applyLook = (player: PlayerState, input: InputState): void => {
  player.yaw -= input.look.dx * PLAYER_CONFIG.LOOK_SENSITIVITY_RAD_PER_PX;
  const pitch = player.pitch - input.look.dy * PLAYER_CONFIG.LOOK_SENSITIVITY_RAD_PER_PX;
  player.pitch = Math.min(PLAYER_CONFIG.LOOK_PITCH_MAX_RAD, Math.max(-PLAYER_CONFIG.LOOK_PITCH_MAX_RAD, pitch));
};

const applyWalk = (player: PlayerState, input: InputState, stepS: number, layout: StationLayout): void => {
  const magnitude = Math.hypot(input.move.x, input.move.y);
  if (magnitude === 0) return;
  const scale = (magnitude > 1 ? 1 / magnitude : 1) * PLAYER_CONFIG.PLAYER_WALK_SPEED_MPS * stepS;
  const sin = Math.sin(player.yaw);
  const cos = Math.cos(player.yaw);
  scratchDelta.x = (cos * input.move.x - sin * input.move.y) * scale;
  scratchDelta.z = (-sin * input.move.x - cos * input.move.y) * scale;
  scratchFrom.x = player.x;
  scratchFrom.z = player.z;
  resolveMovement(layout, scratchFrom, scratchDelta, PLAYER_CONFIG.PLAYER_RADIUS_M, scratchOut);
  player.x = scratchOut.x;
  player.z = scratchOut.z;
};

export const updatePlayerMotion = (player: PlayerState, input: InputState, stepS: number, layout: StationLayout): void => {
  applyLook(player, input);
  applyWalk(player, input, stepS, layout);
};
