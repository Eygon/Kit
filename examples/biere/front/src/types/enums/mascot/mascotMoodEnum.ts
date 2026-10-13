export enum MascotMoodEnum {
  SEARCHING = "searching",
  CAPTURED = "captured",
  CONFUSED = "confused",
  LOADED = "loaded",
}

export const DEFAULT_MASCOT_MOOD = MascotMoodEnum.SEARCHING;

export const MASCOT_MOOD_ALT_KEYS: Readonly<Record<MascotMoodEnum, string>> = {
  [MascotMoodEnum.SEARCHING]: "mascot.alt.searching",
  [MascotMoodEnum.CAPTURED]: "mascot.alt.captured",
  [MascotMoodEnum.CONFUSED]: "mascot.alt.confused",
  [MascotMoodEnum.LOADED]: "mascot.alt.loaded",
};
