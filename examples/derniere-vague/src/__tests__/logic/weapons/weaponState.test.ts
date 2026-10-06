export {};

const WEAPON_MODULE = "@/logic/weapons/weaponState";
const CONFIG_MODULE = "@/config/weaponConfig";
const INPUT_MODULE = "@/logic/input/inputState";

type Kind = "shotFired" | "reloadStarted" | "reloadDone" | "knifeSwung" | "dryFired";
type Event = { kind: Kind };
type Weapon = { weaponId: string; mag: number; reserve: number; cooldownS: number; reloadRemainingS: number; knifeCooldownS: number };
type Input = { fire: boolean; reload: boolean; knife: boolean };

const load = async () => {
  const weaponModule = await import(/* @vite-ignore */ WEAPON_MODULE);
  const configModule = await import(/* @vite-ignore */ CONFIG_MODULE);
  const inputModule = await import(/* @vite-ignore */ INPUT_MODULE);
  const spec = configModule.WEAPONS.pistol;
  const weapon: Weapon = weaponModule.createWeapon("pistol");
  const input: Input = inputModule.createInputState();
  const events: Event[] = [];
  const kinds = (): Kind[] => events.map((event) => event.kind);
  const step = (stepS: number, count = 1): void => {
    for (let i = 0; i < count; i++) weaponModule.updateWeapon(weapon, input, stepS, events);
  };
  return { weaponModule, weapon, input, events, kinds, step, spec, knife: configModule.KNIFE };
};

describe("weaponState", () => {
  it("starts with a full magazine and the configured reserve", async () => {
    const { weapon, spec } = await load();
    expect(weapon.mag).toBe(spec.MAG_SIZE);
    expect(weapon.reserve).toBe(spec.RESERVE_AMMO);
  });

  it("consumes one round and emits shotFired when firing with rounds in the magazine", async () => {
    const { weapon, input, kinds, step, spec } = await load();
    input.fire = true;
    step(1 / 60);
    expect(weapon.mag).toBe(spec.MAG_SIZE - 1);
    expect(kinds()).toEqual(["shotFired"]);
  });

  it("holds the trigger back until the fire interval elapsed", async () => {
    const { weapon, input, step, spec } = await load();
    input.fire = true;
    const half = spec.FIRE_INTERVAL_S / 2;
    step(half);
    step(half);
    expect(weapon.mag).toBe(spec.MAG_SIZE - 1);
    step(half);
    expect(weapon.mag).toBe(spec.MAG_SIZE - 2);
  });

  it("does not fire without the fire flag", async () => {
    const { weapon, events, step, spec } = await load();
    step(1 / 60, 120);
    expect(weapon.mag).toBe(spec.MAG_SIZE);
    expect(events).toHaveLength(0);
  });

  it("starts an automatic reload when the last round leaves the magazine", async () => {
    const { weapon, input, kinds, step, spec } = await load();
    weapon.mag = 1;
    input.fire = true;
    step(1 / 60);
    expect(weapon.mag).toBe(0);
    expect(kinds()).toEqual(["shotFired", "reloadStarted"]);
    expect(weapon.reloadRemainingS).toBeCloseTo(spec.RELOAD_S, 6);
  });

  it("blocks firing during the reload then refills the magazine from the reserve", async () => {
    const { weapon, input, kinds, step, spec } = await load();
    weapon.mag = 0;
    input.reload = true;
    step(1 / 60);
    input.reload = false;
    input.fire = true;
    step(spec.RELOAD_S / 2);
    expect(weapon.mag).toBe(0);
    expect(kinds()).toEqual(["reloadStarted"]);
    step(spec.RELOAD_S / 2 + 1 / 60);
    expect(kinds()).toContain("reloadDone");
    expect(weapon.reserve).toBe(spec.RESERVE_AMMO - spec.MAG_SIZE);
    expect(weapon.mag).toBe(spec.MAG_SIZE - 1);
    expect(kinds().filter((kind) => kind === "shotFired")).toHaveLength(1);
  });

  it("reloads on fire when the magazine is empty and the reserve is not", async () => {
    const { weapon, input, kinds, step, spec } = await load();
    weapon.mag = 0;
    input.fire = true;
    step(1 / 60);
    expect(kinds()).toEqual(["reloadStarted"]);
    step(spec.RELOAD_S + 1 / 60);
    expect(weapon.reserve).toBe(spec.RESERVE_AMMO - spec.MAG_SIZE);
  });

  it("only moves the missing rounds on a partial reload", async () => {
    const { weapon, input, step, spec } = await load();
    weapon.mag = spec.MAG_SIZE - 3;
    weapon.reserve = 2;
    input.reload = true;
    step(1 / 60);
    input.reload = false;
    step(spec.RELOAD_S + 1 / 60);
    expect(weapon.mag).toBe(spec.MAG_SIZE - 1);
    expect(weapon.reserve).toBe(0);
  });

  it("ignores a reload request when the magazine is full", async () => {
    const { weapon, input, events, step, spec } = await load();
    input.reload = true;
    step(1 / 60, 10);
    expect(events).toHaveLength(0);
    expect(weapon.reloadRemainingS).toBe(0);
    expect(weapon.mag).toBe(spec.MAG_SIZE);
  });

  it("ignores a reload request when the reserve is empty", async () => {
    const { weapon, input, events, step, spec } = await load();
    weapon.mag = spec.MAG_SIZE - 2;
    weapon.reserve = 0;
    input.reload = true;
    step(1 / 60, 10);
    expect(events).toHaveLength(0);
    expect(weapon.mag).toBe(spec.MAG_SIZE - 2);
  });

  it("fires no shot when magazine and reserve are both empty", async () => {
    const { weapon, input, kinds, step } = await load();
    weapon.mag = 0;
    weapon.reserve = 0;
    input.fire = true;
    step(1 / 60, 120);
    expect(kinds()).not.toContain("shotFired");
    expect(kinds()).not.toContain("reloadStarted");
    expect(weapon.mag).toBe(0);
  });

  it("emits dryFired once when firing with magazine and reserve both empty", async () => {
    const { weapon, input, kinds, step } = await load();
    weapon.mag = 0;
    weapon.reserve = 0;
    input.fire = true;
    step(1 / 60);
    expect(kinds()).toEqual(["dryFired"]);
    expect(weapon.mag).toBe(0);
  });

  it("spaces the dry clicks by the fire interval while the trigger is held", async () => {
    const { weapon, input, kinds, step, spec } = await load();
    weapon.mag = 0;
    weapon.reserve = 0;
    input.fire = true;
    const frames = Math.round(spec.FIRE_INTERVAL_S * 60 * 4);
    step(1 / 60, frames);
    const clicks = kinds().filter((kind) => kind === "dryFired").length;
    expect(clicks).toBeGreaterThanOrEqual(3);
    expect(clicks).toBeLessThanOrEqual(5);
  });

  it("does not emit dryFired when the empty magazine starts a reload", async () => {
    const { weapon, input, kinds, step } = await load();
    weapon.mag = 0;
    input.fire = true;
    step(1 / 60, 5);
    expect(kinds()).toEqual(["reloadStarted"]);
  });

  it("does not emit dryFired without the fire input", async () => {
    const { weapon, kinds, step } = await load();
    weapon.mag = 0;
    weapon.reserve = 0;
    step(1 / 60, 30);
    expect(kinds()).toEqual([]);
  });

  it("does not start a second reload while one is running", async () => {
    const { weapon, input, kinds, step, spec } = await load();
    weapon.mag = 0;
    input.reload = true;
    step(1 / 60, 5);
    expect(kinds().filter((kind) => kind === "reloadStarted")).toHaveLength(1);
    expect(weapon.reloadRemainingS).toBeGreaterThan(spec.RELOAD_S - 0.2);
  });

  it("swings the knife with a cooldown and emits knifeSwung", async () => {
    const { weapon, input, kinds, step, knife } = await load();
    input.knife = true;
    step(1 / 60);
    expect(kinds()).toEqual(["knifeSwung"]);
    step(knife.COOLDOWN_S / 2);
    expect(kinds()).toEqual(["knifeSwung"]);
    step(knife.COOLDOWN_S);
    expect(kinds()).toEqual(["knifeSwung", "knifeSwung"]);
    expect(weapon.mag).toBeGreaterThan(0);
  });

  it("applies the head multiplier to the pistol damage", async () => {
    const { weaponModule, weapon, spec } = await load();
    expect(weaponModule.shotDamage(weapon.weaponId, false)).toBe(spec.DAMAGE);
    expect(weaponModule.shotDamage(weapon.weaponId, true)).toBe(spec.DAMAGE * spec.HEAD_MULTIPLIER);
    expect(spec.HEAD_MULTIPLIER).toBeGreaterThan(1);
  });
});
