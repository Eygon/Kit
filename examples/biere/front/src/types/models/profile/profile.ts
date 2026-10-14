import type { AvatarEnum } from "@/types/enums/user/avatarEnum";
import type { LevelTitleEnum } from "@/types/enums/user/levelTitleEnum";

export interface Profile {
  id: number;
  displayName: string;
  avatar: AvatarEnum;
  level: number;
  title: LevelTitleEnum;
  discoveredCount: number;
  currentThreshold: number;
  nextThreshold: number | null;
  nextTitle: LevelTitleEnum | null;
  followerCount: number;
  followingCount: number;
  isFollowed: boolean;
  isMe: boolean;
}
