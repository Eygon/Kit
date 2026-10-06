export {};

const LOADOUT_MODULE = "@/logic/weapons/loadout";
const CONFIG_MODULE = "@/config/weaponConfig";

const load = async () => {
  const loadoutModule = await import(/* @vite-ignore */ LOADOUT_MODULE);
  const configModule = await import(/* @vite-ignore */ CONFIG_MODULE);
  const loadout = loadoutModule.createLoadout();
  const inHand = (): string => loadoutModule.activeWeapon(loadout).weaponId;
  return { loadoutModule, WEAPONS: configModule.WEAPONS, loadout, inHand };
};

describe("weapon config", () => {
  it("gives the shotgun eight pellets and every other weapon one", async () => {
    const { WEAPONS } = await load();
    expect(WEAPONS.shotgun.PELLETS).toBe(8);
    for (const id of ["pistol", "smg", "carbine"]) expect(WEAPONS[id].PELLETS).toBe(1);
  });

  it("holds one yaw/pitch offset per pellet", async () => {
    const { WEAPONS } = await load();
    for (const id of ["pistol", "smg", "carbine", "shotgun"]) expect(WEAPONS[id].PELLET_OFFSETS_RAD).toHaveLength(WEAPONS[id].PELLETS);
    const distinct = new Set(WEAPONS.shotgun.PELLET_OFFSETS_RAD.map((offset: { yaw: number; pitch: number }) => `${offset.yaw}/${offset.pitch}`));
    expect(distinct.size).toBeGreaterThan(1);
  });

  it("prices the wall weapons and sells ammo at half price", async () => {
    const { WEAPONS } = await load();
    expect(WEAPONS.smg.WALL_PRICE_POINTS).toBe(1000);
    expect(WEAPONS.carbine.WALL_PRICE_POINTS).toBe(1200);
    expect(WEAPONS.shotgun.WALL_PRICE_POINTS).toBe(1500);
    for (const id of ["smg", "carbine", "shotgun"]) expect(WEAPONS[id].AMMO_PRICE_POINTS).toBe(WEAPONS[id].WALL_PRICE_POINTS / 2);
  });
});

describe("loadout", () => {
  it("starts with a full pistol in hand", async () => {
    const { loadoutModule, loadout, WEAPONS } = await load();
    const weapon = loadoutModule.activeWeapon(loadout);
    expect(weapon.weaponId).toBe("pistol");
    expect(weapon.mag).toBe(WEAPONS.pistol.MAG_SIZE);
    expect(weapon.reserve).toBe(WEAPONS.pistol.RESERVE_AMMO);
  });

  it("does not swap while only one weapon is owned", async () => {
    const { loadoutModule, loadout, inHand } = await load();
    loadoutModule.swapWeapon(loadout);
    expect(inHand()).toBe("pistol");
  });

  it("fills the empty slot with the new weapon in hand, full mag and reserve", async () => {
    const { loadoutModule, loadout, inHand, WEAPONS } = await load();
    loadoutModule.giveWeapon(loadout, "carbine");
    const weapon = loadoutModule.activeWeapon(loadout);
    expect(inHand()).toBe("carbine");
    expect(weapon.mag).toBe(WEAPONS.carbine.MAG_SIZE);
    expect(weapon.reserve).toBe(WEAPONS.carbine.RESERVE_AMMO);
    loadoutModule.swapWeapon(loadout);
    expect(inHand()).toBe("pistol");
  });

  it("replaces the weapon in hand when both slots are taken", async () => {
    const { loadoutModule, loadout, inHand } = await load();
    loadoutModule.giveWeapon(loadout, "carbine");
    loadoutModule.giveWeapon(loadout, "shotgun");
    expect(inHand()).toBe("shotgun");
    loadoutModule.swapWeapon(loadout);
    expect(inHand()).toBe("pistol");
    loadoutModule.swapWeapon(loadout);
    expect(inHand()).toBe("shotgun");
  });

  it("replaces the pistol when it is the weapon in hand and keeps the other slot", async () => {
    const { loadoutModule, loadout, inHand } = await load();
    loadoutModule.giveWeapon(loadout, "carbine");
    loadoutModule.swapWeapon(loadout);
    loadoutModule.giveWeapon(loadout, "smg");
    expect(inHand()).toBe("smg");
    loadoutModule.swapWeapon(loadout);
    expect(inHand()).toBe("carbine");
  });

  it("alternates between the two weapons on each swap", async () => {
    const { loadoutModule, loadout, inHand } = await load();
    loadoutModule.giveWeapon(loadout, "smg");
    const seen: string[] = [inHand()];
    for (let i = 0; i < 3; i++) {
      loadoutModule.swapWeapon(loadout);
      seen.push(inHand());
    }
    expect(seen).toEqual(["smg", "pistol", "smg", "pistol"]);
  });

  it("refuses to refill when mag and reserve are full", async () => {
    const { loadoutModule, loadout } = await load();
    loadoutModule.giveWeapon(loadout, "carbine");
    expect(loadoutModule.refillAmmo(loadout, "carbine")).toBe(false);
  });

  it("refuses to refill a weapon that is not owned", async () => {
    const { loadoutModule, loadout } = await load();
    expect(loadoutModule.refillAmmo(loadout, "shotgun")).toBe(false);
  });

  it("refills mag and reserve of the owned weapon and returns true", async () => {
    const { loadoutModule, loadout, WEAPONS } = await load();
    loadoutModule.giveWeapon(loadout, "carbine");
    const weapon = loadoutModule.activeWeapon(loadout);
    weapon.mag = 0;
    weapon.reserve = 0;
    expect(loadoutModule.refillAmmo(loadout, "carbine")).toBe(true);
    expect(weapon.mag).toBe(WEAPONS.carbine.MAG_SIZE);
    expect(weapon.reserve).toBe(WEAPONS.carbine.RESERVE_AMMO);
  });

  it("refills a weapon that is owned but not in hand", async () => {
    const { loadoutModule, loadout, WEAPONS } = await load();
    loadoutModule.giveWeapon(loadout, "carbine");
    loadoutModule.activeWeapon(loadout).reserve = 3;
    loadoutModule.swapWeapon(loadout);
    expect(loadoutModule.refillAmmo(loadout, "carbine")).toBe(true);
    loadoutModule.swapWeapon(loadout);
    expect(loadoutModule.activeWeapon(loadout).reserve).toBe(WEAPONS.carbine.RESERVE_AMMO);
  });

  it("refills when only the reserve is short", async () => {
    const { loadoutModule, loadout, WEAPONS } = await load();
    loadoutModule.activeWeapon(loadout).reserve = WEAPONS.pistol.RESERVE_AMMO - 1;
    expect(loadoutModule.refillAmmo(loadout, "pistol")).toBe(true);
    expect(loadoutModule.activeWeapon(loadout).reserve).toBe(WEAPONS.pistol.RESERVE_AMMO);
  });
});

describe("loadout refillAllAmmo", () => {
  it("refills mag and reserve of both slots, in hand or not", async () => {
    const { loadoutModule, loadout, WEAPONS } = await load();
    loadoutModule.giveWeapon(loadout, "carbine");
    for (const weapon of loadout.slots) {
      weapon.mag = 0;
      weapon.reserve = 0;
      weapon.reloadRemainingS = 1;
    }
    loadoutModule.refillAllAmmo(loadout);
    expect(loadout.slots[0]).toMatchObject({ mag: WEAPONS.pistol.MAG_SIZE, reserve: WEAPONS.pistol.RESERVE_AMMO, reloadRemainingS: 0 });
    expect(loadout.slots[1]).toMatchObject({ mag: WEAPONS.carbine.MAG_SIZE, reserve: WEAPONS.carbine.RESERVE_AMMO, reloadRemainingS: 0 });
  });

  it("copes with an empty second slot", async () => {
    const { loadoutModule, loadout, WEAPONS } = await load();
    loadout.slots[0].mag = 1;
    loadoutModule.refillAllAmmo(loadout);
    expect(loadout.slots[0].mag).toBe(WEAPONS.pistol.MAG_SIZE);
    expect(loadout.slots[1]).toBeNull();
  });
});
