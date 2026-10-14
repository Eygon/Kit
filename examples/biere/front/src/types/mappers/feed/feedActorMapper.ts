import type { FeedActorDto } from "@/types/dtos/feed/feedActorDto";
import { DEFAULT_AVATAR, isAvatar } from "@/types/enums/user/avatarEnum";
import { LevelTitleEnum, isLevelTitle } from "@/types/enums/user/levelTitleEnum";
import type { FeedActor } from "@/types/models/feed/feedActor";

export const feedActorDtoToModel = (dto: FeedActorDto): FeedActor => ({
  id: dto.id,
  displayName: dto.displayName,
  avatar: isAvatar(dto.avatar) ? dto.avatar : DEFAULT_AVATAR,
  level: dto.level,
  title: isLevelTitle(dto.title) ? dto.title : LevelTitleEnum.CURIOUS,
});
