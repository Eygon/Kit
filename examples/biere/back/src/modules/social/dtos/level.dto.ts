import type { LevelTitleEnum } from "@/modules/social/enums/level-title.enum";

export interface LevelDto {
  readonly level: number;
  readonly title: LevelTitleEnum;
  readonly discoveredCount: number;
  readonly currentThreshold: number;
  readonly nextThreshold: number | null;
  readonly nextTitle: LevelTitleEnum | null;
}
