import { createInputState } from "@/logic/input/inputState";
import type { GameEvent } from "@/logic/game/gameEvents";

const INTERACTIONS_MODULE = "@/logic/economy/interactions";
const LOADOUT_MODULE = "@/logic/weapons/loadout";
const LEDGER_MODULE = "@/logic/economy/pointsLedger";
const MAP_MODULE = "@/config/mapConfig";
const WEAPON_MODULE = "@/config/weaponConfig";
const DOORS_MODULE = "@/logic/map/zoneDoors";
const LAYOUT_MODULE = "@/logic/map/stationLayout";
const BARRICADES_MODULE = "@/logic/map/barricades";
const STEP_S = 1 / 60;
const BROKEN_PLANKS = 4;
const FAR_M = 0.1;
const OUT_OF_REACH_M = 0.5;

type Spot = { id: string; weaponId: string; x: number; z: number; facing: number };

const load = async (points = 0) => {
  const interactionsModule = await import(/* @vite-ignore */ INTERACTIONS_MODULE);
  const loadoutModule = await import(/* @vite-ignore */ LOADOUT_MODULE);
  const ledgerModule = await import(/* @vite-ignore */ LEDGER_MODULE);
  const mapConfig = await import(/* @vite-ignore */ MAP_MODULE);
  const weaponConfig = await import(/* @vite-ignore */ WEAPON_MODULE);
  const doorsModule = await import(/* @vite-ignore */ DOORS_MODULE);
  const spots: readonly Spot[] = mapConfig.WALL_BUYS;
  const spot = (weaponId: string): Spot => {
    const found = spots.find((candidate) => candidate.weaponId === weaponId);
    if (!found) throw new Error(`no wall buy for ${weaponId}`);
    return found;
  };
  const state = interactionsModule.createInteractions();
  const loadout = loadoutModule.createLoadout();
  const ledger = ledgerModule.createLedger(points);
  const input = createInputState();
  const events: GameEvent[] = [];
  const doors = doorsModule.createZoneDoors();
  const player = { x: 0, z: 0, yaw: 0, pitch: 0 };
  const goTo = (weaponId: string, offsetM = 0): void => {
    const target = spot(weaponId);
    player.x = target.x + offsetM;
    player.z = target.z;
  };
  const update = (): void => interactionsModule.updateInteractions(state, player, loadout, ledger, input, doors, events);
  const press = (): void => {
    input.interact = true;
    update();
  };
  const release = (): void => {
    input.interact = false;
    update();
  };
  const inHand = (): string => loadoutModule.activeWeapon(loadout).weaponId;
  const goToDoor = (zoneId: string): void => {
    const entrance = mapConfig.STATION_LAYOUT.ENTRANCES.find((candidate: { zoneId: string }) => candidate.zoneId === zoneId);
    player.x = (entrance.ax + entrance.bx) / 2;
    player.z = (entrance.az + entrance.bz) / 2;
  };
  return { doors, goToDoor, interactionsModule, loadoutModule, mapConfig, weaponConfig: weaponConfig.WEAPONS, spots, spot, state, loadout, ledger, input, events, player, goTo, update, press, release, inHand };
};

describe("wall buy config", () => {
  it("lists the smg, carbine and shotgun spots with a 1.5 m reach", async () => {
    const { mapConfig, spots } = await load();
    expect(spots.map((candidate) => candidate.weaponId).sort()).toEqual(["carbine", "shotgun", "smg"]);
    expect(new Set(spots.map((candidate) => candidate.id)).size).toBe(3);
    expect(mapConfig.INTERACT_RADIUS_M).toBe(1.5);
  });

  it("keeps the spots further apart than two reaches so the nearest one is unambiguous", async () => {
    const { mapConfig, spots } = await load();
    for (const first of spots) {
      for (const second of spots) {
        if (first.id !== second.id) expect(Math.hypot(first.x - second.x, first.z - second.z)).toBeGreaterThan(mapConfig.INTERACT_RADIUS_M * 2);
      }
    }
  });
});

describe("interactions prompt", () => {
  it("shows nothing away from every spot", async () => {
    const { state, player, update } = await load(5000);
    player.x = 0;
    player.z = 0;
    update();
    expect(state.prompt).toBeNull();
  });

  it("offers the weapon with its price and affordability within reach", async () => {
    const { state, goTo, update } = await load(1500);
    goTo("carbine", FAR_M);
    update();
    expect(state.prompt).toEqual({ kind: "buyWeapon", weaponId: "carbine", costPoints: 1200, affordable: true });
  });

  it("flags the prompt as unaffordable when points fall short", async () => {
    const { state, goTo, update } = await load(800);
    goTo("carbine");
    update();
    expect(state.prompt).toEqual({ kind: "buyWeapon", weaponId: "carbine", costPoints: 1200, affordable: false });
  });

  it("drops the prompt once the player leaves the reach", async () => {
    const { state, goTo, update, mapConfig } = await load(2000);
    goTo("smg");
    update();
    expect(state.prompt).not.toBeNull();
    goTo("smg", mapConfig.INTERACT_RADIUS_M + OUT_OF_REACH_M);
    update();
    expect(state.prompt).toBeNull();
  });

  it("offers ammo at half price for a weapon already owned", async () => {
    const { state, goTo, update, loadoutModule, loadout } = await load(1500);
    loadoutModule.giveWeapon(loadout, "carbine");
    goTo("carbine");
    update();
    expect(state.prompt).toEqual({ kind: "buyAmmo", weaponId: "carbine", costPoints: 600, affordable: true });
  });

  it("does not buy anything without an interact press", async () => {
    const { goTo, update, ledger, events, inHand } = await load(1500);
    goTo("carbine");
    update();
    expect(ledger.points).toBe(1500);
    expect(events).toEqual([]);
    expect(inHand()).toBe("pistol");
  });
});

describe("interactions purchase", () => {
  it("buys the carbine with 1500 points: 300 left, carbine in hand full, purchase event", async () => {
    const { goTo, press, ledger, events, inHand, loadoutModule, loadout, weaponConfig, spot } = await load(1500);
    goTo("carbine");
    press();
    const carbine = loadoutModule.activeWeapon(loadout);
    expect(ledger.points).toBe(300);
    expect(inHand()).toBe("carbine");
    expect(carbine.mag).toBe(weaponConfig.carbine.MAG_SIZE);
    expect(carbine.reserve).toBe(weaponConfig.carbine.RESERVE_AMMO);
    expect(events).toContainEqual({ kind: "purchaseDone", pointId: spot("carbine").id, costPoints: 1200 });
  });

  it("denies the carbine with 800 points: nothing spent, nothing given, denied event", async () => {
    const { goTo, press, ledger, events, inHand, spot } = await load(800);
    goTo("carbine");
    press();
    expect(ledger.points).toBe(800);
    expect(inHand()).toBe("pistol");
    expect(events).toContainEqual({ kind: "purchaseDenied", pointId: spot("carbine").id });
    expect(events.some((event) => event.kind === "purchaseDone")).toBe(false);
  });

  it("refills an owned carbine with an empty reserve for 600 points", async () => {
    const { goTo, press, ledger, events, loadoutModule, loadout, weaponConfig, spot } = await load(1500);
    loadoutModule.giveWeapon(loadout, "carbine");
    const carbine = loadoutModule.activeWeapon(loadout);
    carbine.mag = 0;
    carbine.reserve = 0;
    goTo("carbine");
    press();
    expect(ledger.points).toBe(900);
    expect(carbine.mag).toBe(weaponConfig.carbine.MAG_SIZE);
    expect(carbine.reserve).toBe(weaponConfig.carbine.RESERVE_AMMO);
    expect(events).toContainEqual({ kind: "purchaseDone", pointId: spot("carbine").id, costPoints: 600 });
  });

  it("denies an ammo refill without enough points", async () => {
    const { goTo, press, ledger, events, loadoutModule, loadout, spot } = await load(500);
    loadoutModule.giveWeapon(loadout, "carbine");
    loadoutModule.activeWeapon(loadout).reserve = 0;
    goTo("carbine");
    press();
    expect(ledger.points).toBe(500);
    expect(loadoutModule.activeWeapon(loadout).reserve).toBe(0);
    expect(events).toContainEqual({ kind: "purchaseDenied", pointId: spot("carbine").id });
  });

  it("spends nothing and emits nothing when the owned weapon is already full", async () => {
    const { goTo, press, ledger, events, loadoutModule, loadout } = await load(5000);
    loadoutModule.giveWeapon(loadout, "carbine");
    goTo("carbine");
    press();
    expect(ledger.points).toBe(5000);
    expect(events).toEqual([]);
  });

  it("turns pistol + carbine into pistol + shotgun with the shotgun in hand", async () => {
    const { goTo, press, release, inHand, loadoutModule, loadout, ledger } = await load(3000);
    goTo("carbine");
    press();
    release();
    goTo("shotgun");
    press();
    expect(ledger.points).toBe(3000 - 1200 - 1500);
    expect(inHand()).toBe("shotgun");
    loadoutModule.swapWeapon(loadout);
    expect(inHand()).toBe("pistol");
    loadoutModule.swapWeapon(loadout);
    expect(inHand()).toBe("shotgun");
  });

  it("buys once per press even when interact is held across steps", async () => {
    const { goTo, press, update, ledger, events } = await load(5000);
    goTo("smg");
    press();
    for (let i = 0; i < 10; i++) update();
    expect(ledger.points).toBe(4000);
    expect(events.filter((event) => event.kind === "purchaseDone")).toHaveLength(1);
  });

  it("buys again after the button was released and pressed again", async () => {
    const { goTo, press, release, loadoutModule, loadout, ledger, events } = await load(5000);
    goTo("smg");
    press();
    release();
    loadoutModule.activeWeapon(loadout).reserve = 0;
    press();
    expect(ledger.points).toBe(5000 - 1000 - 500);
    expect(events.filter((event) => event.kind === "purchaseDone")).toHaveLength(2);
  });

  it("denies once per press while the points stay short", async () => {
    const { goTo, press, update, events } = await load(100);
    goTo("shotgun");
    press();
    for (let i = 0; i < 5; i++) update();
    expect(events.filter((event) => event.kind === "purchaseDenied")).toHaveLength(1);
  });

  it("ignores a press made away from every spot", async () => {
    const { player, press, ledger, events } = await load(5000);
    player.x = 0;
    player.z = 0;
    press();
    expect(ledger.points).toBe(5000);
    expect(events).toEqual([]);
  });
});

describe("interactions door points", () => {
  it("offers each closed entrance with its price at the passage midpoint", async () => {
    const { state, goToDoor, update } = await load(2000);
    goToDoor("east");
    update();
    expect(state.prompt).toMatchObject({ kind: "openDoor", zoneId: "east", costPoints: 1000, affordable: true });
    goToDoor("west");
    update();
    expect(state.prompt).toMatchObject({ kind: "openDoor", zoneId: "west", costPoints: 1250, affordable: true });
    goToDoor("north");
    update();
    expect(state.prompt).toMatchObject({ kind: "openDoor", zoneId: "north", costPoints: 750, affordable: true });
  });

  it("flags the door prompt as unaffordable when points fall short", async () => {
    const { state, goToDoor, update } = await load(700);
    goToDoor("north");
    update();
    expect(state.prompt).toMatchObject({ kind: "openDoor", zoneId: "north", affordable: false });
  });

  it("opens the east door with 1000 points: all spent, opening phase, purchase event", async () => {
    const { goToDoor, press, ledger, events, doors } = await load(1000);
    goToDoor("east");
    press();
    expect(ledger.points).toBe(0);
    expect(doors.east.kind).toBe("opening");
    expect(events).toContainEqual({ kind: "purchaseDone", pointId: "door-east", costPoints: 1000 });
    expect(events).toContainEqual({ kind: "doorOpening", zoneId: "east" });
  });

  it("denies the north door with 700 points: nothing spent, still closed, denied event", async () => {
    const { goToDoor, press, ledger, events, doors } = await load(700);
    goToDoor("north");
    press();
    expect(ledger.points).toBe(700);
    expect(doors.north).toEqual({ kind: "closed" });
    expect(events).toContainEqual({ kind: "purchaseDenied", pointId: "door-north" });
    expect(events.some((event) => event.kind === "purchaseDone" || event.kind === "doorOpening")).toBe(false);
  });

  it("charges the west door 1250 points", async () => {
    const { goToDoor, press, ledger, doors } = await load(1500);
    goToDoor("west");
    press();
    expect(ledger.points).toBe(250);
    expect(doors.west.kind).toBe("opening");
  });

  it("spends once per press while the door opens", async () => {
    const { goToDoor, press, update, ledger, events } = await load(5000);
    goToDoor("east");
    press();
    for (let i = 0; i < 10; i++) update();
    expect(ledger.points).toBe(4000);
    expect(events.filter((event) => event.kind === "purchaseDone")).toHaveLength(1);
  });

  it("shows no prompt and sells nothing once the door is opening or open", async () => {
    const { goToDoor, press, release, update, state, ledger, doors } = await load(5000);
    goToDoor("east");
    press();
    release();
    update();
    expect(state.prompt).toBeNull();
    press();
    expect(ledger.points).toBe(4000);
    doors.east = { kind: "open" };
    release();
    update();
    expect(state.prompt).toBeNull();
  });

  it("denies once per press while the points stay short", async () => {
    const { goToDoor, press, update, events } = await load(100);
    goToDoor("west");
    press();
    for (let i = 0; i < 5; i++) update();
    expect(events.filter((event) => event.kind === "purchaseDenied")).toHaveLength(1);
  });

  it("keeps wall buys working next to the doors", async () => {
    const { goTo, press, ledger, inHand } = await load(1500);
    goTo("carbine");
    press();
    expect(ledger.points).toBe(300);
    expect(inHand()).toBe("carbine");
  });
});

describe("interactions barricade repair", () => {
  type RepairWindow = { id: string; x: number; z: number; zoneId: string | null };

  const loadRepair = async () => {
    const context = await load(0);
    const layoutModule = await import(/* @vite-ignore */ LAYOUT_MODULE);
    const barricadesModule = await import(/* @vite-ignore */ BARRICADES_MODULE);
    const layout = layoutModule.createStationLayout();
    const barricades = barricadesModule.createBarricades(layout.windows);
    const barricade = context.mapConfig.BARRICADE;
    const startWindow: RepairWindow = layout.windows.find((candidate: RepairWindow) => candidate.zoneId === null);
    const goToWindow = (target: RepairWindow): void => {
      context.player.x = target.x;
      context.player.z = target.z;
    };
    const frame = (): void => context.interactionsModule.updateInteractions(context.state, context.player, context.loadout, context.ledger, context.input, context.doors, context.events, STEP_S, layout, barricades);
    const hold = (seconds: number): void => {
      context.input.interact = true;
      for (let i = 0; i < Math.round(seconds / STEP_S); i++) frame();
    };
    const tear = (target: RepairWindow, count: number): void => {
      for (let i = 0; i < count; i++) barricadesModule.tearPlank(barricades, target.id, context.events);
    };
    const planks = (target: RepairWindow): number => barricadesModule.planksOf(barricades, target.id);
    return { ...context, layoutModule, layout, barricades, barricade, startWindow, goToWindow, frame, hold, tear, planks };
  };

  it("offers a repair prompt on a damaged window within reach", async () => {
    const { startWindow, goToWindow, tear, frame, state } = await loadRepair();
    tear(startWindow, BROKEN_PLANKS);
    goToWindow(startWindow);
    frame();
    expect(state.prompt).toMatchObject({ kind: "repair", windowId: startWindow.id });
  });

  it("offers nothing on a fully planked window", async () => {
    const { startWindow, goToWindow, frame, state } = await loadRepair();
    goToWindow(startWindow);
    frame();
    expect(state.prompt).toBeNull();
  });

  it("offers nothing beyond the reach of the damaged window", async () => {
    const { startWindow, goToWindow, tear, frame, state, player, mapConfig } = await loadRepair();
    tear(startWindow, BROKEN_PLANKS);
    goToWindow(startWindow);
    player.x += mapConfig.INTERACT_RADIUS_M + OUT_OF_REACH_M;
    frame();
    expect(state.prompt).toBeNull();
  });

  it("repairs nothing while interact is not held", async () => {
    const { startWindow, goToWindow, tear, frame, planks, ledger, barricade } = await loadRepair();
    tear(startWindow, BROKEN_PLANKS);
    goToWindow(startWindow);
    for (let i = 0; i < Math.round((barricade.REPAIR_INTERVAL_S * 2) / STEP_S); i++) frame();
    expect(planks(startWindow)).toBe(barricade.PLANKS_PER_WINDOW - BROKEN_PLANKS);
    expect(ledger.points).toBe(0);
  });

  it("puts one plank back per repair interval while interact is held, +10 points each", async () => {
    const { startWindow, goToWindow, tear, hold, planks, ledger, barricade } = await loadRepair();
    tear(startWindow, BROKEN_PLANKS);
    goToWindow(startWindow);
    hold(barricade.REPAIR_INTERVAL_S + STEP_S * 2);
    expect(planks(startWindow)).toBe(barricade.PLANKS_PER_WINDOW - BROKEN_PLANKS + 1);
    expect(ledger.points).toBe(10);
  });

  it("repairs a window with 2 planks up to 6 then drops the prompt", async () => {
    const { startWindow, goToWindow, tear, hold, planks, ledger, barricade, state } = await loadRepair();
    tear(startWindow, BROKEN_PLANKS);
    goToWindow(startWindow);
    hold(barricade.REPAIR_INTERVAL_S * (BROKEN_PLANKS + 2));
    expect(planks(startWindow)).toBe(barricade.PLANKS_PER_WINDOW);
    expect(ledger.points).toBe(BROKEN_PLANKS * 10);
    expect(state.prompt).toBeNull();
  });

  it("offers no repair on a window of a closed zone, then offers it once the zone is open", async () => {
    const { layout, layoutModule, goToWindow, tear, hold, frame, planks, state, ledger } = await loadRepair();
    const zoneWindow: RepairWindow = layout.windows.find((candidate: RepairWindow) => candidate.zoneId === "north");
    tear(zoneWindow, BROKEN_PLANKS);
    goToWindow(zoneWindow);
    hold(1);
    frame();
    expect(state.prompt).toBeNull();
    expect(planks(zoneWindow)).toBe(2);
    expect(ledger.points).toBe(0);
    layoutModule.openZone(layout, "north");
    frame();
    expect(state.prompt).toMatchObject({ kind: "repair", windowId: zoneWindow.id });
  });

  it("does not repair when no barricades are given", async () => {
    const { startWindow, goToWindow, update, state } = await loadRepair();
    goToWindow(startWindow);
    update();
    expect(state.prompt).toBeNull();
  });
});

describe("interactions mystery box", () => {
  const BOX_MODULE = "@/logic/economy/mysteryBox";
  const BOX_CONFIG_MODULE = "@/config/boxConfig";
  const RAY_GUN_ID = "rayGun";
  const SMG_ID = "smg";
  const BOX_COST = 950;

  type BoxSpot = { x: number; z: number };
  type TestBox = { state: { kind: string; remainingS?: number; weaponId?: string }; spot: number; rolls: number };

  const loadBox = async (points = 0) => {
    const loaded = await load(points);
    const boxModule = await import(/* @vite-ignore */ BOX_MODULE);
    const boxConfig = await import(/* @vite-ignore */ BOX_CONFIG_MODULE);
    const box: TestBox = boxModule.createMysteryBox();
    const spots: readonly BoxSpot[] = boxConfig.BOX_SPOTS;
    const standAtBox = (spotIndex = box.spot, offsetM = 0): void => {
      const spot = spots[spotIndex];
      if (!spot) throw new Error("box spot missing");
      loaded.player.x = spot.x + offsetM;
      loaded.player.z = spot.z;
    };
    const frame = (): void => {
      loaded.interactionsModule.updateInteractions(loaded.state, loaded.player, loaded.loadout, loaded.ledger, loaded.input, loaded.doors, loaded.events, STEP_S, undefined, undefined, box);
    };
    const press = (): void => {
      loaded.input.interact = true;
      frame();
    };
    const release = (): void => {
      loaded.input.interact = false;
      frame();
    };
    const offer = (weaponId: string): void => {
      box.state = { kind: "offering", weaponId, remainingS: boxConfig.BOX_OFFER_S };
    };
    return { ...loaded, box, boxConfig, boxModule, standAtBox, frame, press, release, offer };
  };

  it("offers the box for its cost while it is idle in reach", async () => {
    const { standAtBox, frame, state, boxConfig } = await loadBox(BOX_COST);
    standAtBox();
    frame();
    expect(state.prompt).toMatchObject({ kind: "box", costPoints: boxConfig.BOX_COST_POINTS, affordable: true });
  });

  it("marks the box prompt unaffordable below the cost", async () => {
    const { standAtBox, frame, state, boxConfig } = await loadBox(BOX_COST - 1);
    standAtBox();
    frame();
    expect(state.prompt).toMatchObject({ kind: "box", costPoints: boxConfig.BOX_COST_POINTS, affordable: false });
  });

  it("shows no prompt out of reach of the box spot", async () => {
    const { standAtBox, frame, state } = await loadBox(BOX_COST);
    standAtBox(0, OUT_OF_REACH_M * 4);
    frame();
    expect(state.prompt).toBeNull();
  });

  it("follows the box to its current spot", async () => {
    const { standAtBox, frame, state, box } = await loadBox(BOX_COST);
    box.spot = 1;
    standAtBox(0);
    frame();
    expect(state.prompt).toBeNull();
    standAtBox(1);
    frame();
    expect(state.prompt).toMatchObject({ kind: "box" });
  });

  it("spends the points and starts the roll when interact is pressed", async () => {
    const { standAtBox, press, box, ledger, events, boxConfig, state } = await loadBox(BOX_COST + 30);
    standAtBox();
    press();
    expect(ledger.points).toBe(30);
    expect(box.state).toEqual({ kind: "rolling", remainingS: boxConfig.BOX_ROLL_S });
    expect(events.map((event) => event.kind)).toEqual(["boxOpened", "purchaseDone"]);
    expect(events[1]).toEqual({ kind: "purchaseDone", pointId: "box", costPoints: boxConfig.BOX_COST_POINTS });
    expect(state.prompt).toBeNull();
  });

  it("denies the purchase below the cost", async () => {
    const { standAtBox, press, box, ledger, events } = await loadBox(BOX_COST - 1);
    standAtBox();
    press();
    expect(ledger.points).toBe(BOX_COST - 1);
    expect(box.state).toEqual({ kind: "idle" });
    expect(events).toEqual([{ kind: "purchaseDenied", pointId: "box" }]);
  });

  it("buys nothing while the box is rolling, offering or moving", async () => {
    const { standAtBox, press, release, box, ledger, events, offer, state } = await loadBox(BOX_COST * 3);
    standAtBox();
    for (const setup of [
      (): void => {
        box.state = { kind: "rolling", remainingS: 1 };
      },
      (): void => {
        box.state = { kind: "moving", remainingS: 1 };
      },
    ]) {
      setup();
      release();
      const before = ledger.points;
      press();
      expect(state.prompt).toBeNull();
      expect(ledger.points).toBe(before);
      expect(events).toEqual([]);
      release();
    }
    offer(SMG_ID);
    release();
    const before = ledger.points;
    press();
    expect(ledger.points).toBe(before);
    expect(events.some((event) => event.kind === "boxOpened")).toBe(false);
  });

  it("does not buy twice while interact stays held", async () => {
    const { standAtBox, press, frame, box, ledger, boxConfig } = await loadBox(BOX_COST * 3);
    standAtBox();
    press();
    box.state = { kind: "idle" };
    frame();
    expect(box.state.kind).toBe("idle");
    expect(ledger.points).toBe(boxConfig.BOX_COST_POINTS * 2);
  });

  it("offers to take the weapon of the box when it is offering", async () => {
    const { standAtBox, frame, state, offer } = await loadBox(0);
    standAtBox();
    offer(RAY_GUN_ID);
    frame();
    expect(state.prompt).toMatchObject({ kind: "takeWeapon", weaponId: RAY_GUN_ID, costPoints: 0, affordable: true });
  });

  it("gives the offered weapon to the player and closes the box when interact is pressed", async () => {
    const { standAtBox, press, offer, box, inHand, ledger, events, state } = await loadBox(0);
    standAtBox();
    offer(RAY_GUN_ID);
    press();
    expect(inHand()).toBe(RAY_GUN_ID);
    expect(box.state).toEqual({ kind: "idle" });
    expect(ledger.points).toBe(0);
    expect(events).toEqual([{ kind: "boxWeaponTaken", weaponId: RAY_GUN_ID }]);
    expect(state.prompt).toMatchObject({ kind: "box" });
  });

  it("replaces the weapon in hand when two weapons are held", async () => {
    const { standAtBox, press, offer, loadout, loadoutModule, inHand } = await loadBox(0);
    loadoutModule.giveWeapon(loadout, "carbine");
    loadoutModule.giveWeapon(loadout, "shotgun");
    standAtBox();
    offer(RAY_GUN_ID);
    press();
    expect(inHand()).toBe(RAY_GUN_ID);
    expect(loadout.slots[0].weaponId).toBe("pistol");
    expect(loadout.slots[1]?.weaponId).toBe(RAY_GUN_ID);
  });

  it("does not take the offer without a fresh press", async () => {
    const { standAtBox, frame, release, offer, box, inHand } = await loadBox(0);
    standAtBox();
    offer(SMG_ID);
    release();
    frame();
    expect(box.state.kind).toBe("offering");
    expect(inHand()).toBe("pistol");
  });

  it("prefers the nearest of the box and a wall buy", async () => {
    const { standAtBox, frame, state, box, goTo } = await loadBox(BOX_COST * 3);
    standAtBox();
    frame();
    expect(state.prompt).toMatchObject({ kind: "box" });
    goTo("smg");
    frame();
    expect(state.prompt).toMatchObject({ kind: "buyWeapon", weaponId: "smg" });
    expect(box.state.kind).toBe("idle");
  });

  it("keeps working without a box", async () => {
    const { goTo, update, state } = await loadBox(0);
    goTo("smg");
    update();
    expect(state.prompt).toMatchObject({ kind: "buyWeapon" });
  });
});
