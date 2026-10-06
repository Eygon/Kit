import { readFileSync } from "node:fs";
import { BOX_COST_POINTS, BOX_SPOTS } from "@/config/boxConfig";
import { STATION_LAYOUT, WALL_BUYS, ZONES } from "@/config/mapConfig";
import { WEAPONS } from "@/config/weaponConfig";
import type { WeaponId } from "@/config/weaponConfig";
import { tearPlank } from "@/logic/map/barricades";
import { createGameSession, stepGameSession } from "@/logic/game/gameSession";
import type { GameSession } from "@/logic/game/gameSession";
import { createInputState } from "@/logic/input/inputState";
import { activeWeapon, giveWeapon, swapWeapon } from "@/logic/weapons/loadout";
import { TEXTS } from "@/ui/texts";

export {};

const HUD_MODULE = "@/ui/hud";
const HURT_CLASS = "is-hurt";
const SEED = 42;
const STYLES_PATH = `${process.cwd()}/src/ui/styles.css`;
const RICH_POINTS = 1750;
const LOW_MAG = 3;
const LOW_RESERVE = 11;
const ROUND_FIVE = 5;
const MIN_TOUCH_PX = 48;
const STEP_S = 1 / 60;
const VISIBLE_CLASS = "is-visible";
const DENIED_CLASS = "is-denied";
const FAR_FROM_SPOTS_M = 3;
const RED_DOMINANCE = 60;

type Hud = { update: (session: GameSession, frameS?: number) => void };

const load = async () => {
  const hudModule = await import(/* @vite-ignore */ HUD_MODULE);
  const host = document.createElement("div");
  document.body.appendChild(host);
  const hud: Hud = hudModule.createHud(host);
  const node = (name: string): HTMLElement => {
    const found = host.querySelector<HTMLElement>(`[data-hud-${name}]`);
    if (!found) throw new Error(`hud ${name} missing`);
    return found;
  };
  return { host, hud, node };
};

const watch = (host: HTMLElement): MutationObserver => {
  const observer = new MutationObserver(() => undefined);
  observer.observe(host, { subtree: true, childList: true, characterData: true, attributes: true });
  return observer;
};

const wallBuy = (weaponId: WeaponId) => {
  const found = WALL_BUYS.find((buy) => buy.weaponId === weaponId);
  if (!found) throw new Error("wall buy missing");
  return found;
};

const standAt = (session: GameSession, x: number, z: number): void => {
  session.player.x = x;
  session.player.z = z;
  stepGameSession(session, createInputState(), STEP_S, 0);
};

const standAtWallBuy = (session: GameSession, weaponId: WeaponId): void => {
  const buy = wallBuy(weaponId);
  standAt(session, buy.x, buy.z);
};

const ownCarbine = (session: GameSession): void => {
  giveWeapon(session.loadout, "carbine");
  session.weapon = activeWeapon(session.loadout);
};

const styles = (): string => readFileSync(STYLES_PATH, "utf8");

describe("hud", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("creates the points, round, ammo and vignette nodes once", async () => {
    const { host, hud } = await load();
    const session = createGameSession(SEED);
    hud.update(session);
    hud.update(session);
    for (const name of ["points", "round", "ammo", "vignette"]) expect(host.querySelectorAll(`[data-hud-${name}]`)).toHaveLength(1);
  });

  it("shows round 1, 500 points and the full magazine on a new game", async () => {
    const { hud, node } = await load();
    const session = createGameSession(SEED);
    hud.update(session);
    expect(node("round").textContent).toBe(TEXTS.round(1));
    expect(node("points").textContent).toBe(TEXTS.points(500));
    expect(node("ammo").textContent).toBe(TEXTS.ammo(WEAPONS.pistol.MAG_SIZE, WEAPONS.pistol.RESERVE_AMMO));
  });

  it("shows the new points, round and ammo when they change", async () => {
    const { hud, node } = await load();
    const session = createGameSession(SEED);
    hud.update(session);
    session.ledger.points = RICH_POINTS;
    session.rounds.number = ROUND_FIVE;
    session.weapon.mag = LOW_MAG;
    session.weapon.reserve = LOW_RESERVE;
    hud.update(session);
    expect(node("points").textContent).toBe(TEXTS.points(RICH_POINTS));
    expect(node("round").textContent).toBe(TEXTS.round(ROUND_FIVE));
    expect(node("ammo").textContent).toBe(TEXTS.ammo(LOW_MAG, LOW_RESERVE));
  });

  it("does not touch the DOM when nothing changed", async () => {
    const { host, hud } = await load();
    const session = createGameSession(SEED);
    hud.update(session);
    const observer = watch(host);
    hud.update(session);
    hud.update(session);
    expect(observer.takeRecords()).toHaveLength(0);
  });

  it("rewrites only the points node when only the points change", async () => {
    const { host, hud, node } = await load();
    const session = createGameSession(SEED);
    hud.update(session);
    const observer = watch(host);
    session.ledger.points += 60;
    hud.update(session);
    const records = observer.takeRecords();
    expect(records.length).toBeGreaterThan(0);
    for (const record of records) expect(node("points").contains(record.target)).toBe(true);
  });

  it("shows the red vignette while hits were taken and hides it after regeneration", async () => {
    const { hud, node } = await load();
    const session = createGameSession(SEED);
    hud.update(session);
    expect(node("vignette").classList.contains(HURT_CLASS)).toBe(false);
    session.health = { status: "alive", hitsTaken: 1, sinceHitS: 0 };
    hud.update(session);
    expect(node("vignette").classList.contains(HURT_CLASS)).toBe(true);
    session.health = { status: "alive", hitsTaken: 0, sinceHitS: 0 };
    hud.update(session);
    expect(node("vignette").classList.contains(HURT_CLASS)).toBe(false);
  });

  it("keeps the vignette on once the player is dead", async () => {
    const { hud, node } = await load();
    const session = createGameSession(SEED);
    session.health = { status: "dead" };
    hud.update(session);
    expect(node("vignette").classList.contains(HURT_CLASS)).toBe(true);
  });

  it("does not rewrite the vignette while the hurt state is unchanged", async () => {
    const { host, hud } = await load();
    const session = createGameSession(SEED);
    session.health = { status: "alive", hitsTaken: 2, sinceHitS: 1 };
    hud.update(session);
    const observer = watch(host);
    session.health = { status: "alive", hitsTaken: 1, sinceHitS: 2 };
    hud.update(session);
    expect(observer.takeRecords()).toHaveLength(0);
  });
});

describe("styles", () => {
  it("keeps the HUD inside the four safe-area insets", () => {
    const css = styles();
    for (const side of ["top", "right", "bottom", "left"]) expect(css).toContain(`env(safe-area-inset-${side})`);
  });

  it("moves the touch buttons clear of the safe-area insets", () => {
    const rule = /\[data-touch-buttons\]\s*\{[^}]*\}/.exec(styles());
    expect(rule?.[0]).toContain("env(safe-area-inset-right)");
    expect(rule?.[0]).toContain("env(safe-area-inset-bottom)");
  });

  it("draws a red radial vignette that fades with opacity", () => {
    const rule = /\.hud__vignette\s*\{[^}]*\}/.exec(styles());
    expect(rule?.[0]).toMatch(/radial-gradient/);
    expect(rule?.[0]).toMatch(/transition:[^;]*opacity/);
    expect(styles()).toMatch(/\.hud__vignette\.is-hurt\s*\{[^}]*opacity:\s*1/);
  });

  it("only animates opacity and transform", () => {
    const declarations = [...styles().matchAll(/transition:\s*([^;]+);/g)].map((match) => match[1] ?? "");
    expect(declarations.length).toBeGreaterThan(0);
    for (const declaration of declarations) {
      const properties = declaration.split(",").map((part) => part.trim().split(/\s+/)[0]);
      for (const property of properties) expect(["opacity", "transform"]).toContain(property);
    }
  });

  it("gives the menu buttons a hit area of at least 48px", () => {
    const rule = /\.menu__button\s*\{[^}]*\}/.exec(styles());
    const minHeight = /min-height:\s*(\d+)px/.exec(rule?.[0] ?? "");
    const minWidth = /min-width:\s*(\d+)px/.exec(rule?.[0] ?? "");
    expect(Number(minHeight?.[1])).toBeGreaterThanOrEqual(MIN_TOUCH_PX);
    expect(Number(minWidth?.[1])).toBeGreaterThanOrEqual(MIN_TOUCH_PX);
  });

  it("hides the menu overlays until they are visible", () => {
    expect(styles()).toMatch(/\.menu\s*\{[^}]*opacity:\s*0/);
    expect(styles()).toMatch(/\.menu\.is-visible\s*\{[^}]*opacity:\s*1/);
  });
});

describe("hud loadout and prompt", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("names the weapons, the wall purchase and the ammo purchase in French", () => {
    expect(TEXTS.weaponNames).toEqual({ pistol: "Pistolet", smg: "Pistolet-mitrailleur", carbine: "Carabine", shotgun: "Fusil à pompe", lmg: "Mitrailleuse", rayGun: "Rayon à énergie" });
    expect(TEXTS.buyWeapon("Carabine", 1200)).toBe("Acheter Carabine — 1200");
    expect(TEXTS.buyAmmo("Carabine", 600)).toBe("Munitions Carabine — 600");
  });

  it("creates the weapon, slots and prompt nodes once", async () => {
    const { host, hud } = await load();
    const session = createGameSession(SEED);
    hud.update(session);
    hud.update(session);
    for (const name of ["weapon", "slots", "prompt"]) expect(host.querySelectorAll(`[data-hud-${name}]`)).toHaveLength(1);
    expect(host.querySelectorAll("[data-hud-slot]")).toHaveLength(2);
  });

  it("names the weapon in hand and follows a swap", async () => {
    const { hud, node } = await load();
    const session = createGameSession(SEED);
    hud.update(session);
    expect(node("weapon").textContent).toBe(TEXTS.weaponNames.pistol);
    ownCarbine(session);
    hud.update(session);
    expect(node("weapon").textContent).toBe(TEXTS.weaponNames.carbine);
    swapWeapon(session.loadout);
    session.weapon = activeWeapon(session.loadout);
    hud.update(session);
    expect(node("weapon").textContent).toBe(TEXTS.weaponNames.pistol);
  });

  it("shows exactly one slot line with the mag and reserve of the weapon not in hand", async () => {
    const { host, hud } = await load();
    const session = createGameSession(SEED);
    ownCarbine(session);
    hud.update(session);
    const shown = (): HTMLElement[] => [...host.querySelectorAll<HTMLElement>("[data-hud-slot]")].filter((slot) => !slot.hidden);
    expect(shown()).toHaveLength(1);
    expect(shown()[0]?.textContent).toContain(TEXTS.weaponNames.pistol);
    expect(shown()[0]?.textContent).toContain(TEXTS.ammo(WEAPONS.pistol.MAG_SIZE, WEAPONS.pistol.RESERVE_AMMO));
    expect(shown()[0]?.textContent).not.toContain(TEXTS.weaponNames.carbine);
    swapWeapon(session.loadout);
    session.weapon = activeWeapon(session.loadout);
    hud.update(session);
    expect(shown()).toHaveLength(1);
    expect(shown()[0]?.textContent).toContain(TEXTS.weaponNames.carbine);
    expect(shown()[0]?.textContent).toContain(TEXTS.ammo(WEAPONS.carbine.MAG_SIZE, WEAPONS.carbine.RESERVE_AMMO));
    expect(shown()[0]?.textContent).not.toContain(TEXTS.weaponNames.pistol);
  });

  it("shows no slot line while only the pistol is owned", async () => {
    const { host, hud } = await load();
    const session = createGameSession(SEED);
    hud.update(session);
    const slots = [...host.querySelectorAll<HTMLElement>("[data-hud-slot]")];
    expect(slots.filter((slot) => !slot.hidden)).toHaveLength(0);
    ownCarbine(session);
    hud.update(session);
    expect(slots.filter((slot) => !slot.hidden)).toHaveLength(1);
  });

  it("rewrites only the slot whose value changed and nothing when nothing changed", async () => {
    const { host, hud } = await load();
    const session = createGameSession(SEED);
    ownCarbine(session);
    hud.update(session);
    const [first, second] = [...host.querySelectorAll<HTMLElement>("[data-hud-slot]")];
    const observer = watch(host);
    hud.update(session);
    hud.update(session);
    expect(observer.takeRecords()).toHaveLength(0);
    session.loadout.slots[0].mag = LOW_MAG;
    hud.update(session);
    const records = observer.takeRecords();
    expect(records.length).toBeGreaterThan(0);
    for (const record of records) expect(first?.contains(record.target) && !second?.contains(record.target)).toBe(true);
    expect(first?.textContent).toContain(TEXTS.ammo(LOW_MAG, WEAPONS.pistol.RESERVE_AMMO));
  });

  it("hides the prompt when the player is out of reach of every spot", async () => {
    const { hud, node } = await load();
    const session = createGameSession(SEED);
    standAt(session, wallBuy("smg").x + FAR_FROM_SPOTS_M, wallBuy("smg").z + FAR_FROM_SPOTS_M);
    hud.update(session);
    expect(session.interactions.prompt).toBeNull();
    expect(node("prompt").classList.contains(VISIBLE_CLASS)).toBe(false);
  });

  it("shows Acheter with the weapon and the price within reach of a wall spot", async () => {
    const { hud, node } = await load();
    const session = createGameSession(SEED);
    standAtWallBuy(session, "carbine");
    hud.update(session);
    expect(node("prompt").classList.contains(VISIBLE_CLASS)).toBe(true);
    expect(node("prompt").textContent).toBe(TEXTS.buyWeapon(TEXTS.weaponNames.carbine, WEAPONS.carbine.WALL_PRICE_POINTS));
  });

  it("carries the denied style only when the points fall short of the price", async () => {
    const { hud, node } = await load();
    const session = createGameSession(SEED);
    standAtWallBuy(session, "carbine");
    hud.update(session);
    expect(session.ledger.points).toBeLessThan(WEAPONS.carbine.WALL_PRICE_POINTS);
    expect(node("prompt").classList.contains(DENIED_CLASS)).toBe(true);
    session.ledger.points = RICH_POINTS;
    standAtWallBuy(session, "carbine");
    hud.update(session);
    expect(node("prompt").classList.contains(DENIED_CLASS)).toBe(false);
  });

  it("offers the ammo purchase once the weapon is owned", async () => {
    const { hud, node } = await load();
    const session = createGameSession(SEED);
    ownCarbine(session);
    standAtWallBuy(session, "carbine");
    hud.update(session);
    expect(node("prompt").textContent).toBe(TEXTS.buyAmmo(TEXTS.weaponNames.carbine, WEAPONS.carbine.AMMO_PRICE_POINTS));
  });

  it("shows the door text, not a weapon name, in front of a closed door", async () => {
    const { hud, node } = await load();
    const session = createGameSession(SEED);
    const entrance = STATION_LAYOUT.ENTRANCES[0];
    if (!entrance) throw new Error("entrance missing");
    standAt(session, (entrance.ax + entrance.bx) / 2, (entrance.az + entrance.bz) / 2);
    hud.update(session);
    expect(session.interactions.prompt?.kind).toBe("openDoor");
    expect(node("prompt").classList.contains(VISIBLE_CLASS)).toBe(true);
    expect(node("prompt").textContent).toBe(TEXTS.openDoor(ZONES[entrance.zoneId].DOOR_COST_POINTS));
    for (const name of Object.values(TEXTS.weaponNames)) expect(node("prompt").textContent).not.toContain(name);
  });

  it("shows the repair text in front of a damaged window", async () => {
    const { hud, node } = await load();
    const session = createGameSession(SEED);
    const target = session.layout.windows.find((candidate) => candidate.zoneId === null);
    if (!target) throw new Error("window missing");
    tearPlank(session.barricades, target.id, session.events);
    standAt(session, target.x, target.z);
    hud.update(session);
    expect(session.interactions.prompt?.kind).toBe("repair");
    expect(node("prompt").classList.contains(VISIBLE_CLASS)).toBe(true);
    expect(node("prompt").textContent).toBe(TEXTS.repair);
    for (const name of Object.values(TEXTS.weaponNames)) expect(node("prompt").textContent).not.toContain(name);
  });

  it("hides the prompt again after the player walks away", async () => {
    const { hud, node } = await load();
    const session = createGameSession(SEED);
    standAtWallBuy(session, "carbine");
    hud.update(session);
    standAt(session, wallBuy("carbine").x, wallBuy("carbine").z + FAR_FROM_SPOTS_M);
    hud.update(session);
    expect(node("prompt").classList.contains(VISIBLE_CLASS)).toBe(false);
  });

  it("does not touch the DOM while the prompt is unchanged", async () => {
    const { host, hud } = await load();
    const session = createGameSession(SEED);
    standAtWallBuy(session, "carbine");
    hud.update(session);
    const observer = watch(host);
    hud.update(session);
    standAtWallBuy(session, "carbine");
    hud.update(session);
    expect(observer.takeRecords()).toHaveLength(0);
  });
});

describe("loadout styles", () => {
  const rule = (selector: string): string => new RegExp(`${selector.replace(/\./g, "\\.")}\\s*\\{[^}]*\\}`).exec(styles())?.[0] ?? "";

  it("styles the weapon name, the slots and the prompt", () => {
    for (const selector of [".hud__weapon", ".hud__slots", ".hud__slot", ".hud__slot.is-active", ".hud__prompt", ".hud__prompt.is-visible", ".hud__prompt.is-denied"]) expect(rule(selector)).not.toBe("");
  });

  it("keeps the prompt hidden until visible and fades it with opacity and transform", () => {
    expect(rule(".hud__prompt")).toMatch(/opacity:\s*0/);
    expect(rule(".hud__prompt")).toMatch(/transition:[^;]*opacity/);
    expect(rule(".hud__prompt")).toMatch(/transition:[^;]*transform/);
    expect(rule(".hud__prompt.is-visible")).toMatch(/opacity:\s*1/);
  });

  it("keeps the prompt above the bottom safe-area inset", () => {
    expect(rule(".hud__prompt")).toContain("env(safe-area-inset-bottom)");
  });

  it("paints the denied prompt red", () => {
    const hex = /color:\s*#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(rule(".hud__prompt.is-denied"));
    const [red, green, blue] = [hex?.[1], hex?.[2], hex?.[3]].map((part) => parseInt(part ?? "0", 16));
    expect((red ?? 0) - Math.max(green ?? 0, blue ?? 0)).toBeGreaterThan(RED_DOMINANCE);
  });
});

describe("hud mystery box prompt", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  const standAtBox = (session: GameSession): void => {
    const spot = BOX_SPOTS[session.box.spot];
    if (!spot) throw new Error("box spot missing");
    standAt(session, spot.x, spot.z);
  };

  it("writes the box and take weapon texts in French", () => {
    expect(TEXTS.openBox(BOX_COST_POINTS)).toBe("Boîte mystère — 950");
    expect(TEXTS.takeWeapon("Rayon à énergie")).toBe("Prendre Rayon à énergie");
  });

  it("shows the box cost in front of an idle box and paints it denied when too poor", async () => {
    const { hud, node } = await load();
    const session = createGameSession(SEED);
    session.ledger.points = BOX_COST_POINTS - 1;
    standAtBox(session);
    hud.update(session);
    expect(session.interactions.prompt?.kind).toBe("box");
    expect(node("prompt").classList.contains(VISIBLE_CLASS)).toBe(true);
    expect(node("prompt").textContent).toBe(TEXTS.openBox(BOX_COST_POINTS));
    expect(node("prompt").classList.contains(DENIED_CLASS)).toBe(true);
    session.ledger.points = BOX_COST_POINTS;
    standAtBox(session);
    hud.update(session);
    expect(node("prompt").classList.contains(DENIED_CLASS)).toBe(false);
  });

  it("names the offered weapon while the box offers it", async () => {
    const { hud, node } = await load();
    const session = createGameSession(SEED);
    session.box.state = { kind: "offering", weaponId: "rayGun", remainingS: 5 };
    standAtBox(session);
    hud.update(session);
    expect(session.interactions.prompt?.kind).toBe("takeWeapon");
    expect(node("prompt").textContent).toBe(TEXTS.takeWeapon(TEXTS.weaponNames.rayGun));
    expect(node("prompt").classList.contains(DENIED_CLASS)).toBe(false);
  });

  it("renames the prompt when the offered weapon changes", async () => {
    const { hud, node } = await load();
    const session = createGameSession(SEED);
    session.box.state = { kind: "offering", weaponId: "rayGun", remainingS: 5 };
    standAtBox(session);
    hud.update(session);
    session.box.state = { kind: "offering", weaponId: "lmg", remainingS: 5 };
    standAtBox(session);
    hud.update(session);
    expect(node("prompt").textContent).toBe(TEXTS.takeWeapon(TEXTS.weaponNames.lmg));
  });

  it("hides the prompt while the box rolls", async () => {
    const { hud, node } = await load();
    const session = createGameSession(SEED);
    standAtBox(session);
    hud.update(session);
    expect(node("prompt").classList.contains(VISIBLE_CLASS)).toBe(true);
    session.box.state = { kind: "rolling", remainingS: 3 };
    standAtBox(session);
    hud.update(session);
    expect(node("prompt").classList.contains(VISIBLE_CLASS)).toBe(false);
  });

  it("shows the name of a box weapon in the loadout slot", async () => {
    const { hud, host } = await load();
    const session = createGameSession(SEED);
    giveWeapon(session.loadout, "rayGun");
    session.weapon = activeWeapon(session.loadout);
    hud.update(session);
    expect(host.textContent).toContain(TEXTS.weaponNames.rayGun);
  });
});

const POWER_UP_VISUAL_MODULE = "@/config/visualConfig";
const TIMER_TWELVE_S = 12.4;
const TIMER_NEARLY_OUT_S = 0.4;
const TIMER_ELEVEN_S = 11.9;
const TIMER_SAME_SECOND_S = 12.1;
const POWER_UP_KINDS_ANNOUNCED = ["maxAmmo", "instaKill", "doublePoints", "nuke"] as const;

const powerUpIcon = (host: HTMLElement, kind: string): HTMLElement => {
  const found = host.querySelector<HTMLElement>(`[data-hud-powerup="${kind}"]`);
  if (!found) throw new Error(`power-up icon ${kind} missing`);
  return found;
};

const takePowerUp = (session: GameSession, powerUpKind: string): void => {
  session.events.push({ kind: "powerUpTaken", powerUpKind } as GameSession["events"][number]);
};

const announceSeconds = async (): Promise<number> => (await import(/* @vite-ignore */ POWER_UP_VISUAL_MODULE)).VISUAL_CONFIG.POWER_UP.ANNOUNCE_S;

describe("hud power-up timers", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("creates the power-up row and the announce node once", async () => {
    const { host, hud } = await load();
    const session = createGameSession(SEED);
    hud.update(session);
    hud.update(session);
    expect(host.querySelectorAll("[data-hud-powerups]")).toHaveLength(1);
    expect(host.querySelectorAll("[data-hud-announce]")).toHaveLength(1);
  });

  it("hides both timer icons while no timed power-up runs", async () => {
    const { host, hud } = await load();
    const session = createGameSession(SEED);
    hud.update(session);
    expect(powerUpIcon(host, "instaKill").hidden).toBe(true);
    expect(powerUpIcon(host, "doublePoints").hidden).toBe(true);
  });

  it("shows the double-points icon with 12 for 12.4 s left and keeps insta-kill hidden", async () => {
    const { host, hud } = await load();
    const session = createGameSession(SEED);
    session.powerUps.timers.doublePoints = TIMER_TWELVE_S;
    hud.update(session);
    expect(powerUpIcon(host, "doublePoints").hidden).toBe(false);
    expect(powerUpIcon(host, "doublePoints").textContent).toBe(TEXTS.powerUpCountdown(12));
    expect(powerUpIcon(host, "doublePoints").textContent).toBe("12");
    expect(powerUpIcon(host, "instaKill").hidden).toBe(true);
  });

  it("shows the insta-kill icon on its own timer", async () => {
    const { host, hud } = await load();
    const session = createGameSession(SEED);
    session.powerUps.timers.instaKill = TIMER_TWELVE_S;
    hud.update(session);
    expect(powerUpIcon(host, "instaKill").hidden).toBe(false);
    expect(powerUpIcon(host, "instaKill").textContent).toBe("12");
    expect(powerUpIcon(host, "doublePoints").hidden).toBe(true);
  });

  it("counts down, stays readable under one second and disappears at expiry", async () => {
    const { host, hud } = await load();
    const session = createGameSession(SEED);
    session.powerUps.timers.doublePoints = TIMER_TWELVE_S;
    hud.update(session);
    session.powerUps.timers.doublePoints = TIMER_ELEVEN_S;
    hud.update(session);
    expect(powerUpIcon(host, "doublePoints").textContent).toBe("11");
    session.powerUps.timers.doublePoints = TIMER_NEARLY_OUT_S;
    hud.update(session);
    expect(powerUpIcon(host, "doublePoints").hidden).toBe(false);
    expect(powerUpIcon(host, "doublePoints").textContent).toBe("1");
    session.powerUps.timers.doublePoints = 0;
    hud.update(session);
    expect(powerUpIcon(host, "doublePoints").hidden).toBe(true);
  });

  it("writes the DOM only when the displayed second changes", async () => {
    const { host, hud } = await load();
    const session = createGameSession(SEED);
    session.powerUps.timers.doublePoints = TIMER_TWELVE_S;
    hud.update(session);
    const observer = watch(host);
    session.powerUps.timers.doublePoints = TIMER_SAME_SECOND_S;
    hud.update(session);
    hud.update(session);
    expect(observer.takeRecords()).toHaveLength(0);
    session.powerUps.timers.doublePoints = TIMER_ELEVEN_S;
    hud.update(session);
    expect(observer.takeRecords().length).toBeGreaterThan(0);
  });
});

describe("hud power-up announce", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("keeps the announce hidden until a power-up is taken", async () => {
    const { hud, node } = await load();
    const session = createGameSession(SEED);
    hud.update(session, 0);
    expect(node("announce").classList.contains(VISIBLE_CLASS)).toBe(false);
  });

  it.each(POWER_UP_KINDS_ANNOUNCED)("announces the French name of a taken %s", async (kind) => {
    const { hud, node } = await load();
    const session = createGameSession(SEED);
    takePowerUp(session, kind);
    hud.update(session, 0);
    expect(node("announce").textContent).toBe(TEXTS.powerUpNames[kind]);
    expect(node("announce").classList.contains(VISIBLE_CLASS)).toBe(true);
  });

  it("names the four power-ups in French", () => {
    expect(TEXTS.powerUpNames).toEqual({ maxAmmo: "Munitions max", instaKill: "Mort instantanée", doublePoints: "Double points", nuke: "Bombe" });
    expect(TEXTS.powerUpCountdown(12)).toBe("12");
  });

  it("keeps the announce for ANNOUNCE_S of frame time and then hides it", async () => {
    const { hud, node } = await load();
    const announceS = await announceSeconds();
    const session = createGameSession(SEED);
    takePowerUp(session, "nuke");
    hud.update(session, 0);
    session.events.length = 0;
    hud.update(session, announceS / 2);
    expect(node("announce").classList.contains(VISIBLE_CLASS)).toBe(true);
    hud.update(session, announceS / 2 + STEP_S);
    expect(node("announce").classList.contains(VISIBLE_CLASS)).toBe(false);
  });

  it("restarts the announce timer and swaps the name when another power-up is taken", async () => {
    const { hud, node } = await load();
    const announceS = await announceSeconds();
    const session = createGameSession(SEED);
    takePowerUp(session, "nuke");
    hud.update(session, 0);
    session.events.length = 0;
    hud.update(session, announceS * 0.75);
    takePowerUp(session, "maxAmmo");
    hud.update(session, 0);
    session.events.length = 0;
    expect(node("announce").textContent).toBe(TEXTS.powerUpNames.maxAmmo);
    hud.update(session, announceS * 0.75);
    expect(node("announce").classList.contains(VISIBLE_CLASS)).toBe(true);
  });

  it("does not touch the DOM while the announce is idle or still showing", async () => {
    const { host, hud } = await load();
    const announceS = await announceSeconds();
    const session = createGameSession(SEED);
    hud.update(session, STEP_S);
    takePowerUp(session, "nuke");
    hud.update(session, 0);
    session.events.length = 0;
    const observer = watch(host);
    hud.update(session, announceS / 10);
    hud.update(session, announceS / 10);
    expect(observer.takeRecords()).toHaveLength(0);
  });
});

describe("power-up styles", () => {
  const rule = (selector: string): string => new RegExp(`${selector.replace(/\./g, "\\.")}\\s*\\{[^}]*\\}`).exec(styles())?.[0] ?? "";

  it("styles the timer row, the timer icon and the announce", () => {
    for (const selector of [".hud__powerups", ".hud__powerup", ".hud__announce", ".hud__announce.is-visible"]) expect(rule(selector)).not.toBe("");
  });

  it("fades the announce with opacity and transform, hidden until visible", () => {
    expect(rule(".hud__announce")).toMatch(/opacity:\s*0/);
    expect(rule(".hud__announce")).toMatch(/transition:[^;]*opacity/);
    expect(rule(".hud__announce")).toMatch(/transition:[^;]*transform/);
    expect(rule(".hud__announce.is-visible")).toMatch(/opacity:\s*1/);
    expect(rule(".hud__announce.is-visible")).toMatch(/transform:/);
  });

  it("keeps the timer row and the announce inside the safe areas and out of the touch targets", () => {
    expect(rule(".hud__powerups")).toMatch(/env\(safe-area-inset-top\)/);
    expect(rule(".hud__announce")).toMatch(/env\(safe-area-inset/);
    expect(rule(".hud__announce")).toMatch(/pointer-events:\s*none|position:\s*absolute/);
  });
});

describe("hud floating points", () => {
  const floats = (host: HTMLElement): HTMLElement[] => Array.from(host.querySelectorAll<HTMLElement>("[data-hud-points] .hud__float"));

  it("floats the gain next to the points counter when the points rise", async () => {
    const { host, hud } = await load();
    const session = createGameSession(SEED);
    hud.update(session, 0);
    expect(floats(host)).toHaveLength(0);
    session.ledger.points += 60;
    hud.update(session, 0);
    expect(floats(host)).toHaveLength(1);
    expect(floats(host)[0]?.dataset.gain).toBe(TEXTS.pointsGain(60));
  });

  it("floats the summed gain once when several gains land in the same frame", async () => {
    const { host, hud } = await load();
    const session = createGameSession(SEED);
    hud.update(session, 0);
    session.ledger.points += 60;
    session.ledger.points += 10;
    hud.update(session, 0);
    expect(floats(host)).toHaveLength(1);
    expect(floats(host)[0]?.dataset.gain).toBe(TEXTS.pointsGain(70));
  });

  it("does not float again while the points are unchanged", async () => {
    const { host, hud } = await load();
    const session = createGameSession(SEED);
    hud.update(session, 0);
    session.ledger.points += 60;
    hud.update(session, 0);
    hud.update(session, 0);
    expect(floats(host)).toHaveLength(1);
  });

  it("does not float anything on a decrease such as a purchase", async () => {
    const { host, hud, node } = await load();
    const session = createGameSession(SEED);
    hud.update(session, 0);
    session.ledger.points -= 100;
    hud.update(session, 0);
    expect(floats(host)).toHaveLength(0);
    expect(node("points").textContent).toBe(TEXTS.points(session.ledger.points));
  });

  it("keeps the points readout exact after a float was shown", async () => {
    const { host, hud, node } = await load();
    const session = createGameSession(SEED);
    hud.update(session, 0);
    session.ledger.points += 60;
    hud.update(session, 0);
    expect(node("points").firstChild?.textContent).toBe(TEXTS.points(session.ledger.points));
    expect(floats(host)).toHaveLength(1);
  });
});
