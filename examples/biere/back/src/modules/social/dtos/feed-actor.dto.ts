import type { LevelTitleEnum } from "@/modules/social/enums/level-title.enum";
import type { AvatarEnum } from "@/modules/users/enums/avatar.enum";

export interface FeedActorDto {
  readonly id: number;
  readonly displayName: string;
  readonly avatar: AvatarEnum;
  readonly level: number;
  readonly title: LevelTitleEnum;
}
