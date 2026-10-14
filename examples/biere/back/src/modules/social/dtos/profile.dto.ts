import type { LevelTitleEnum } from "@/modules/social/enums/level-title.enum";
import type { AvatarEnum } from "@/modules/users/enums/avatar.enum";

export interface ProfileDto {
  readonly id: number;
  readonly displayName: string;
  readonly avatar: AvatarEnum;
  readonly level: number;
  readonly title: LevelTitleEnum;
  readonly discoveredCount: number;
  readonly currentThreshold: number;
  readonly nextThreshold: number | null;
  readonly nextTitle: LevelTitleEnum | null;
  readonly followerCount: number;
  readonly followingCount: number;
  readonly isFollowed: boolean;
  readonly isMe: boolean;
}
