import type { AvatarEnum } from "@/types/enums/user/avatarEnum";
import type { LevelTitleEnum } from "@/types/enums/user/levelTitleEnum";

export interface ProfileSummary {
  id: number;
  displayName: string;
  avatar: AvatarEnum;
  level: number;
  title: LevelTitleEnum;
  discoveredCount: number;
  isFollowed: boolean;
  isMe: boolean;
}
