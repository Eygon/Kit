export enum LevelTitleEnum {
  CURIOUS = "curious",
  TASTER = "taster",
  HOP_HEAD = "hopHead",
  FINE_PALATE = "finePalate",
  MASTER_BREWER = "masterBrewer",
  FOAM_LEGEND = "foamLegend",
}

export const LEVEL_TITLE_LABEL_KEYS: Record<LevelTitleEnum, string> = {
  [LevelTitleEnum.CURIOUS]: "level.titles.curious",
  [LevelTitleEnum.TASTER]: "level.titles.taster",
  [LevelTitleEnum.HOP_HEAD]: "level.titles.hopHead",
  [LevelTitleEnum.FINE_PALATE]: "level.titles.finePalate",
  [LevelTitleEnum.MASTER_BREWER]: "level.titles.masterBrewer",
  [LevelTitleEnum.FOAM_LEGEND]: "level.titles.foamLegend",
};

export const isLevelTitle = (value: unknown): value is LevelTitleEnum =>
  typeof value === "string" && Object.values<string>(LevelTitleEnum).includes(value);
