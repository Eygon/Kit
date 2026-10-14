import type { ProfileSummaryDto } from "@/types/dtos/profile/profileSummaryDto";
import { DEFAULT_AVATAR, isAvatar } from "@/types/enums/user/avatarEnum";
import { LevelTitleEnum, isLevelTitle } from "@/types/enums/user/levelTitleEnum";
import type { ProfileSummary } from "@/types/models/profile/profileSummary";

export const profileSummaryDtoToModel = (dto: ProfileSummaryDto): ProfileSummary => ({
  id: dto.id,
  displayName: dto.displayName,
  avatar: isAvatar(dto.avatar) ? dto.avatar : DEFAULT_AVATAR,
  level: dto.level,
  title: isLevelTitle(dto.title) ? dto.title : LevelTitleEnum.CURIOUS,
  discoveredCount: dto.discoveredCount ?? 0,
  isFollowed: dto.isFollowed ?? false,
  isMe: dto.isMe ?? false,
});
