export {};

const HEALTH_MODULE = "@/logic/player/playerHealth";
const CONFIG_MODULE = "@/config/playerConfig";
const STEP_S = 1 / 60;
const REGEN_DELAY_S = 4;
const HITS_TO_DIE = 3;

const load = async () => {
  const health = await import(/* @vite-ignore */ HEALTH_MODULE);
  const config = (await import(/* @vite-ignore */ CONFIG_MODULE)).PLAYER_CONFIG;
  const wait = (state: unknown, seconds: number): unknown => {
    let current = state;
    for (let i = 0; i < Math.round(seconds / STEP_S); i++) current = health.updateHealth(current, STEP_S);
    return current;
  };
  return { health, config, wait };
};

describe("playerHealth", () => {
  it("exposes the tuning entries in PLAYER_CONFIG", async () => {
    const { config } = await load();
    expect(config.PLAYER_HITS_TO_DIE).toBe(HITS_TO_DIE);
    expect(config.PLAYER_REGEN_DELAY_S).toBe(REGEN_DELAY_S);
  });

  it("starts alive with no hit taken", async () => {
    const { health } = await load();
    expect(health.createHealth()).toEqual({ status: "alive", hitsTaken: 0, sinceHitS: 0 });
  });

  it("survives two hits and dies on the third", async () => {
    const { health } = await load();
    let state = health.createHealth();
    state = health.applyPlayerHit(state);
    expect(state.status).toBe("alive");
    expect(state.hitsTaken).toBe(1);
    state = health.applyPlayerHit(state);
    expect(state.status).toBe("alive");
    expect(state.hitsTaken).toBe(2);
    state = health.applyPlayerHit(state);
    expect(state.status).toBe("dead");
  });

  it("restores health fully after 4 s without damage", async () => {
    const { health, wait } = await load();
    let state = health.applyPlayerHit(health.applyPlayerHit(health.createHealth()));
    state = wait(state, REGEN_DELAY_S - 0.5);
    expect(state.hitsTaken).toBe(2);
    state = wait(state, 0.5 + STEP_S * 2);
    expect(state.status).toBe("alive");
    expect(state.hitsTaken).toBe(0);
  });

  it("restarts the regeneration delay on every hit", async () => {
    const { health, wait } = await load();
    let state = health.applyPlayerHit(health.createHealth());
    state = wait(state, REGEN_DELAY_S - 1);
    state = health.applyPlayerHit(state);
    state = wait(state, REGEN_DELAY_S - 1);
    expect(state.hitsTaken).toBe(2);
    state = wait(state, 1 + STEP_S * 2);
    expect(state.hitsTaken).toBe(0);
  });

  it("stays dead whatever happens next", async () => {
    const { health, wait } = await load();
    let state = health.applyPlayerHit(health.applyPlayerHit(health.applyPlayerHit(health.createHealth())));
    state = wait(state, REGEN_DELAY_S * 2);
    expect(state.status).toBe("dead");
    expect(health.applyPlayerHit(state).status).toBe("dead");
  });
});
