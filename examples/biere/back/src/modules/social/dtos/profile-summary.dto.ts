import type { LevelTitleEnum } from "@/modules/social/enums/level-title.enum";
import type { AvatarEnum } from "@/modules/users/enums/avatar.enum";

export interface ProfileSummaryDto {
  readonly id: number;
  readonly displayName: string;
  readonly avatar: AvatarEnum;
  readonly level: number;
  readonly title: LevelTitleEnum;
  readonly discoveredCount: number;
  readonly isFollowed: boolean;
  readonly isMe: boolean;
}
