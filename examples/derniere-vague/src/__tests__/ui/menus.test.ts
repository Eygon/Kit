import { createGameSession } from "@/logic/game/gameSession";
import type { GameSession } from "@/logic/game/gameSession";
import { TEXTS } from "@/ui/texts";

export {};

const MENUS_MODULE = "@/ui/menus";
const VISIBLE_CLASS = "is-visible";
const SEED = 99;
const ROUND_REACHED = 6;
const PORTRAIT_QUERY_PART = "portrait";

type Menus = { update: (session: GameSession) => void; isPaused: () => boolean };

const setPortrait = (state: { portrait: boolean }): void => {
  Object.defineProperty(window, "matchMedia", {
    value: (query: string) => ({ get matches() { return state.portrait && query.includes(PORTRAIT_QUERY_PART); } }),
    configurable: true,
  });
};

const load = async () => {
  const menusModule = await import(/* @vite-ignore */ MENUS_MODULE);
  const host = document.createElement("div");
  document.body.appendChild(host);
  const onStart = vi.fn();
  const menus: Menus = menusModule.createMenus(host, { onStart });
  const menu = (name: string): HTMLElement => {
    const found = host.querySelector<HTMLElement>(`[data-menu="${name}"]`);
    if (!found) throw new Error(`menu ${name} missing`);
    return found;
  };
  const button = (name: string): HTMLElement => {
    const found = host.querySelector<HTMLElement>(`[data-menu-button="${name}"]`);
    if (!found) throw new Error(`button ${name} missing`);
    return found;
  };
  const visible = (name: string): boolean => menu(name).classList.contains(VISIBLE_CLASS);
  return { host, menus, onStart, menu, button, visible };
};

const overSession = (): GameSession => {
  const session = createGameSession(SEED);
  session.phase = { kind: "over", roundReached: ROUND_REACHED };
  return session;
};

describe("menus", () => {
  afterEach(() => {
    Reflect.deleteProperty(window, "matchMedia");
    document.body.innerHTML = "";
  });

  it("shows the start menu with a Jouer button and pauses the game", async () => {
    const { menus, visible, button } = await load();
    menus.update(createGameSession(SEED));
    expect(visible("start")).toBe(true);
    expect(button("play").textContent).toBe(TEXTS.play);
    expect(menus.isPaused()).toBe(true);
  });

  it("starts the game and hides the start menu when Jouer is tapped", async () => {
    const { menus, visible, button, onStart } = await load();
    button("play").click();
    expect(onStart).toHaveBeenCalledTimes(1);
    menus.update(createGameSession(SEED));
    expect(visible("start")).toBe(false);
    expect(menus.isPaused()).toBe(false);
  });

  it("does not show the end screen while the game is playing", async () => {
    const { menus, visible, button } = await load();
    button("play").click();
    menus.update(createGameSession(SEED));
    expect(visible("end")).toBe(false);
  });

  it("shows the round reached and Rejouer when the session is over", async () => {
    const { menus, visible, button, menu } = await load();
    button("play").click();
    menus.update(overSession());
    expect(visible("end")).toBe(true);
    expect(menu("end").textContent).toContain(TEXTS.gameOver(ROUND_REACHED));
    expect(button("replay").textContent).toBe(TEXTS.replay);
    expect(menus.isPaused()).toBe(true);
  });

  it("restarts a fresh game when Rejouer is tapped", async () => {
    const { menus, visible, button, onStart } = await load();
    button("play").click();
    menus.update(overSession());
    button("replay").click();
    expect(onStart).toHaveBeenCalledTimes(2);
    expect(visible("end")).toBe(false);
    menus.update(createGameSession(SEED));
    expect(visible("end")).toBe(false);
    expect(menus.isPaused()).toBe(false);
  });

  it("updates the end screen text for a later game over", async () => {
    const { menus, button, menu } = await load();
    button("play").click();
    menus.update(overSession());
    const later = createGameSession(SEED);
    later.phase = { kind: "over", roundReached: ROUND_REACHED + 2 };
    menus.update(later);
    expect(menu("end").textContent).toContain(TEXTS.gameOver(ROUND_REACHED + 2));
  });

  it("does not touch the DOM when the menu state is unchanged", async () => {
    const { host, menus, button } = await load();
    button("play").click();
    menus.update(overSession());
    const observer = new MutationObserver(() => undefined);
    observer.observe(host, { subtree: true, childList: true, characterData: true, attributes: true });
    menus.update(overSession());
    menus.update(overSession());
    expect(observer.takeRecords()).toHaveLength(0);
  });

  it("keeps pointer presses on the menus away from the touch controls", async () => {
    const { host, button } = await load();
    const onHostPointer = vi.fn();
    host.addEventListener("pointerdown", onHostPointer);
    button("play").dispatchEvent(new PointerEvent("pointerdown", { pointerId: 1, bubbles: true }));
    expect(onHostPointer).not.toHaveBeenCalled();
  });

  it("is not paused by orientation when matchMedia is unavailable", async () => {
    const { menus, button } = await load();
    button("play").click();
    menus.update(createGameSession(SEED));
    expect(menus.isPaused()).toBe(false);
  });

  it("shows the rotate overlay and reports paused while the screen is portrait", async () => {
    const state = { portrait: true };
    setPortrait(state);
    const { menus, visible, button, menu } = await load();
    button("play").click();
    menus.update(createGameSession(SEED));
    expect(visible("portrait")).toBe(true);
    expect(menu("portrait").textContent).toContain(TEXTS.rotateDevice);
    expect(menus.isPaused()).toBe(true);
    state.portrait = false;
    menus.update(createGameSession(SEED));
    expect(visible("portrait")).toBe(false);
    expect(menus.isPaused()).toBe(false);
  });

  it("reports paused as soon as the screen turns portrait, before the next update", async () => {
    const state = { portrait: false };
    setPortrait(state);
    const { menus, button } = await load();
    button("play").click();
    menus.update(createGameSession(SEED));
    expect(menus.isPaused()).toBe(false);
    state.portrait = true;
    expect(menus.isPaused()).toBe(true);
  });

  it("lists kills, headshots and points earned from the session stats on the end screen", async () => {
    const { menus, button, menu } = await load();
    button("play").click();
    const session = overSession();
    session.stats.kills = 17;
    session.stats.headshots = 5;
    session.stats.pointsEarned = 2340;
    menus.update(session);
    const text = menu("end").textContent;
    expect(text).toContain(TEXTS.statsKills(17));
    expect(text).toContain(TEXTS.statsHeadshots(5));
    expect(text).toContain(TEXTS.statsPoints(2340));
    expect(text).toContain(TEXTS.gameOver(ROUND_REACHED));
    expect(menu("end").querySelectorAll(".menu__stats li")).toHaveLength(3);
  });

  it("shows zero statistics for a run without kills", async () => {
    const { menus, button, menu } = await load();
    button("play").click();
    menus.update(overSession());
    const text = menu("end").textContent;
    expect(text).toContain(TEXTS.statsKills(0));
    expect(text).toContain(TEXTS.statsHeadshots(0));
    expect(text).toContain(TEXTS.statsPoints(0));
  });

  it("refreshes the statistics when a later game ends with other numbers", async () => {
    const { menus, button, menu } = await load();
    button("play").click();
    const first = overSession();
    first.stats.kills = 4;
    menus.update(first);
    const later = overSession();
    later.stats.kills = 9;
    menus.update(later);
    expect(menu("end").textContent).toContain(TEXTS.statsKills(9));
    expect(menu("end").textContent).not.toContain(TEXTS.statsKills(4));
  });
});
