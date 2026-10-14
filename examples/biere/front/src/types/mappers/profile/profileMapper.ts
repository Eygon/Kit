import type { ProfileDto } from "@/types/dtos/profile/profileDto";
import { DEFAULT_AVATAR, isAvatar } from "@/types/enums/user/avatarEnum";
import { LevelTitleEnum, isLevelTitle } from "@/types/enums/user/levelTitleEnum";
import type { Profile } from "@/types/models/profile/profile";

export const profileDtoToModel = (dto: ProfileDto): Profile => ({
  id: dto.id,
  displayName: dto.displayName,
  avatar: isAvatar(dto.avatar) ? dto.avatar : DEFAULT_AVATAR,
  level: dto.level,
  title: isLevelTitle(dto.title) ? dto.title : LevelTitleEnum.CURIOUS,
  discoveredCount: dto.discoveredCount ?? 0,
  currentThreshold: dto.currentThreshold ?? 0,
  nextThreshold: dto.nextThreshold ?? null,
  nextTitle: isLevelTitle(dto.nextTitle) ? dto.nextTitle : null,
  followerCount: dto.followerCount ?? 0,
  followingCount: dto.followingCount ?? 0,
  isFollowed: dto.isFollowed ?? false,
  isMe: dto.isMe ?? false,
});
