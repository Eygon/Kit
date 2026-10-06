import { UI_CONFIG } from "@/config/visualConfig";
import type { GameSession } from "@/logic/game/gameSession";
import type { RunStats } from "@/logic/game/runStats";
import { TEXTS } from "@/ui/texts";

export type MenusOptions = {
  readonly onStart: () => void;
};

export type Menus = {
  update: (session: GameSession) => void;
  isPaused: () => boolean;
};

type MenuName = "start" | "end" | "portrait";

const VISIBLE_CLASS = "is-visible";

const createElement = (tag: string, className: string, text = ""): HTMLElement => {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
};

const createMenu = (host: HTMLElement, name: MenuName, visible: boolean): HTMLElement => {
  const menu = createElement("div", "menu");
  menu.dataset.menu = name;
  menu.classList.toggle(VISIBLE_CLASS, visible);
  menu.addEventListener("pointerdown", (event: PointerEvent) => event.stopPropagation());
  host.appendChild(menu);
  return menu;
};

const createButton = (menu: HTMLElement, name: string, label: string, onTap: () => void): void => {
  const button = document.createElement("button");
  button.className = "menu__button";
  button.textContent = label;
  button.dataset.menuButton = name;
  button.type = "button";
  button.addEventListener("click", onTap);
  menu.appendChild(button);
};

const setVisible = (menu: HTMLElement, visible: boolean): void => {
  if (menu.classList.contains(VISIBLE_CLASS) !== visible) menu.classList.toggle(VISIBLE_CLASS, visible);
};

export const createMenus = (host: HTMLElement, { onStart }: MenusOptions): Menus => {
  const portraitQuery = typeof window.matchMedia === "function" ? window.matchMedia(UI_CONFIG.PORTRAIT_QUERY) : null;
  const startMenu = createMenu(host, "start", true);
  const endMenu = createMenu(host, "end", false);
  const portraitMenu = createMenu(host, "portrait", false);

  startMenu.appendChild(createElement("h1", "menu__title", TEXTS.title));
  const endTitle = createElement("h1", "menu__title", TEXTS.gameOverTitle);
  const endText = createElement("p", "menu__text");
  const endStats = createElement("ul", "menu__stats");
  const statLines = [createElement("li", "menu__stat"), createElement("li", "menu__stat"), createElement("li", "menu__stat")] as const;
  endStats.append(...statLines);
  endMenu.append(endTitle, endText, endStats);
  portraitMenu.append(createElement("div", "menu__phone"), createElement("p", "menu__text", TEXTS.rotateDevice));

  let started = false;
  let shownRound: number | null = null;
  let shownStats = "";

  const isPortrait = (): boolean => portraitQuery?.matches === true;

  const begin = (): void => {
    started = true;
    shownRound = null;
    shownStats = "";
    setVisible(startMenu, false);
    setVisible(endMenu, false);
    onStart();
  };

  createButton(startMenu, "play", TEXTS.play, begin);
  createButton(endMenu, "replay", TEXTS.replay, begin);

  const showStats = (stats: RunStats): void => {
    const key = `${stats.kills}|${stats.headshots}|${stats.pointsEarned}`;
    if (shownStats === key) return;
    shownStats = key;
    const [killsLine, headshotsLine, pointsLine] = statLines;
    killsLine.textContent = TEXTS.statsKills(stats.kills);
    headshotsLine.textContent = TEXTS.statsHeadshots(stats.headshots);
    pointsLine.textContent = TEXTS.statsPoints(stats.pointsEarned);
  };

  const showEnd = (roundReached: number, stats: RunStats): void => {
    if (shownRound !== roundReached) {
      shownRound = roundReached;
      endText.textContent = TEXTS.gameOver(roundReached);
    }
    showStats(stats);
    setVisible(endMenu, true);
  };

  const update = (session: GameSession): void => {
    if (started && session.phase.kind === "over") showEnd(session.phase.roundReached, session.stats);
    else {
      shownRound = null;
      setVisible(endMenu, false);
    }
    setVisible(portraitMenu, isPortrait());
  };

  const isPaused = (): boolean => !started || shownRound !== null || isPortrait();

  return { update, isPaused };
};
