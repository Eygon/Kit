export {};

const MOTION_MODULE = "@/logic/player/playerMotion";
const INPUT_MODULE = "@/logic/input/inputState";
const LAYOUT_MODULE = "@/logic/map/stationLayout";
const PLAYER_CONFIG_MODULE = "@/config/playerConfig";
const MAP_CONFIG_MODULE = "@/config/mapConfig";
const STEP_S = 1 / 60;
const EPSILON_M = 1e-3;
const ONE_SECOND_STEPS = 60;
const LONG_WALK_STEPS = 600;

type Player = { x: number; z: number; yaw: number; pitch: number };
type Input = { move: { x: number; y: number }; look: { dx: number; dy: number } };

const load = async () => {
  const motion = await import(/* @vite-ignore */ MOTION_MODULE);
  const inputModule = await import(/* @vite-ignore */ INPUT_MODULE);
  const layoutModule = await import(/* @vite-ignore */ LAYOUT_MODULE);
  const playerConfig = await import(/* @vite-ignore */ PLAYER_CONFIG_MODULE);
  const mapConfig = await import(/* @vite-ignore */ MAP_CONFIG_MODULE);
  const layout = layoutModule.createStationLayout();
  const input: Input = inputModule.createInputState();
  const player: Player = motion.createPlayer(layout.playerStart);
  const step = (count: number, stepS = STEP_S): void => {
    for (let i = 0; i < count; i++) motion.updatePlayerMotion(player, input, stepS, layout);
  };
  return { player, input, layout, step, config: playerConfig.PLAYER_CONFIG, room: mapConfig.STATION_LAYOUT };
};

describe("createInputState", () => {
  it("starts idle with every control released", async () => {
    const { input } = await load();
    expect(input).toEqual({
      move: { x: 0, y: 0 },
      look: { dx: 0, dy: 0 },
      fire: false,
      aim: false,
      reload: false,
      knife: false,
      interact: false,
      swap: false,
      pressed: { fire: false, knife: false, interact: false },
    });
  });
});

describe("createPlayer", () => {
  it("spawns at the layout start looking straight ahead", async () => {
    const { player, layout } = await load();
    expect(player.x).toBe(layout.playerStart.x);
    expect(player.z).toBe(layout.playerStart.z);
    expect(player.yaw).toBe(0);
    expect(player.pitch).toBe(0);
  });
});

describe("updatePlayerMotion walking", () => {
  it("walks forward at the configured walking speed", async () => {
    const { player, input, layout, step, config } = await load();
    input.move.y = 1;
    step(ONE_SECOND_STEPS);
    expect(player.x).toBeCloseTo(layout.playerStart.x, 6);
    expect(layout.playerStart.z - player.z).toBeCloseTo(config.PLAYER_WALK_SPEED_MPS, 3);
  });

  it("strafes to the right of the view", async () => {
    const { player, input, layout, step, config } = await load();
    input.move.x = 1;
    step(ONE_SECOND_STEPS);
    expect(player.x - layout.playerStart.x).toBeCloseTo(config.PLAYER_WALK_SPEED_MPS, 3);
    expect(player.z).toBeCloseTo(layout.playerStart.z, 6);
  });

  it("walks along the view direction once turned left by a quarter turn", async () => {
    const { player, input, layout, step, config } = await load();
    player.yaw = Math.PI / 2;
    input.move.y = 1;
    step(ONE_SECOND_STEPS);
    expect(layout.playerStart.x - player.x).toBeCloseTo(config.PLAYER_WALK_SPEED_MPS, 3);
    expect(player.z).toBeCloseTo(layout.playerStart.z, 3);
  });

  it("does not move faster on a diagonal than straight ahead", async () => {
    const { player, input, layout, step, config } = await load();
    input.move.x = 1;
    input.move.y = 1;
    step(ONE_SECOND_STEPS);
    const travelled = Math.hypot(player.x - layout.playerStart.x, player.z - layout.playerStart.z);
    expect(travelled).toBeCloseTo(config.PLAYER_WALK_SPEED_MPS, 3);
  });

  it("scales speed with a partial stick deflection", async () => {
    const { player, input, layout, step, config } = await load();
    input.move.y = 0.5;
    step(ONE_SECOND_STEPS);
    expect(layout.playerStart.z - player.z).toBeCloseTo(config.PLAYER_WALK_SPEED_MPS / 2, 3);
  });

  it("covers the same distance whatever the step length", async () => {
    const fine = await load();
    fine.input.move.y = 1;
    fine.step(ONE_SECOND_STEPS);
    const coarse = await load();
    coarse.input.move.y = 1;
    coarse.step(ONE_SECOND_STEPS / 2, STEP_S * 2);
    expect(coarse.player.z).toBeCloseTo(fine.player.z, 3);
  });

  it("stays put with no input", async () => {
    const { player, layout, step } = await load();
    step(ONE_SECOND_STEPS);
    expect(player.x).toBe(layout.playerStart.x);
    expect(player.z).toBe(layout.playerStart.z);
  });
});

describe("updatePlayerMotion looking", () => {
  it("turns the view by the drag in pixels times the sensitivity", async () => {
    const { player, input, step, config } = await load();
    input.look.dx = 100;
    input.look.dy = -40;
    step(1);
    expect(player.yaw).toBeCloseTo(-100 * config.LOOK_SENSITIVITY_RAD_PER_PX, 6);
    expect(player.pitch).toBeCloseTo(40 * config.LOOK_SENSITIVITY_RAD_PER_PX, 6);
  });

  it("leaves yaw unbounded over many full turns", async () => {
    const { player, input, step, config } = await load();
    const fullTurnPx = (2 * Math.PI) / config.LOOK_SENSITIVITY_RAD_PER_PX;
    for (let turn = 0; turn < 5; turn++) {
      input.look.dx = -fullTurnPx;
      step(1);
    }
    expect(player.yaw).toBeCloseTo(5 * 2 * Math.PI, 3);
  });

  it("clamps pitch so the player cannot look past straight up", async () => {
    const { player, input, step, config } = await load();
    input.look.dy = -1e6;
    step(1);
    expect(player.pitch).toBeCloseTo(config.LOOK_PITCH_MAX_RAD, 6);
    expect(config.LOOK_PITCH_MAX_RAD).toBeLessThan(Math.PI / 2);
  });

  it("clamps pitch so the player cannot look past straight down", async () => {
    const { player, input, step, config } = await load();
    input.look.dy = 1e6;
    step(1);
    expect(player.pitch).toBeCloseTo(-config.LOOK_PITCH_MAX_RAD, 6);
  });
});

describe("updatePlayerMotion collisions", () => {
  it("never passes through the south wall and slides along it", async () => {
    const { player, input, step, config, room } = await load();
    input.move.x = 1;
    input.move.y = -1;
    const startX = player.x;
    step(LONG_WALK_STEPS);
    expect(player.z).toBeLessThanOrEqual(room.HALF_DEPTH_M - config.PLAYER_RADIUS_M + EPSILON_M);
    expect(player.x).toBeGreaterThan(startX + 1);
  });

  it("is stopped by a closed zone entrance", async () => {
    const { player, input, step, config, room } = await load();
    input.move.y = 1;
    step(LONG_WALK_STEPS);
    expect(player.z).toBeGreaterThanOrEqual(-room.HALF_DEPTH_M + config.PLAYER_RADIUS_M - EPSILON_M);
    expect(player.z).toBeLessThan(-room.HALF_DEPTH_M + config.PLAYER_RADIUS_M + 0.1);
  });

  it("is stopped by a closed east entrance while keeping a positive radius", async () => {
    const { player, input, step, config, room } = await load();
    player.x = 0;
    player.z = 0;
    player.yaw = -Math.PI / 2;
    input.move.y = 1;
    step(LONG_WALK_STEPS);
    expect(player.x).toBeLessThanOrEqual(room.HALF_WIDTH_M - config.PLAYER_RADIUS_M + EPSILON_M);
    expect(config.PLAYER_RADIUS_M).toBeGreaterThan(0);
  });
});
