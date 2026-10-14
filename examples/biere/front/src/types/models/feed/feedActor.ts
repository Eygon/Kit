import type { AvatarEnum } from "@/types/enums/user/avatarEnum";
import type { LevelTitleEnum } from "@/types/enums/user/levelTitleEnum";

export interface FeedActor {
  id: number;
  displayName: string;
  avatar: AvatarEnum;
  level: number;
  title: LevelTitleEnum;
}
