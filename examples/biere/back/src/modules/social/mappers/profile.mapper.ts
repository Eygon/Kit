import type { LevelDto } from "@/modules/social/dtos/level.dto";
import type { ProfileDto } from "@/modules/social/dtos/profile.dto";
import type { ProfileSummaryDto } from "@/modules/social/dtos/profile-summary.dto";
import type { UserDto } from "@/modules/users/dtos/user.dto";

export interface FollowCounts {
  readonly followerCount: number;
  readonly followingCount: number;
}

export const toProfileDto = (
  user: UserDto,
  level: LevelDto,
  counts: FollowCounts,
  isFollowed: boolean,
  isMe: boolean,
): ProfileDto => ({
  id: user.id,
  displayName: user.displayName,
  avatar: user.avatar,
  level: level.level,
  title: level.title,
  discoveredCount: level.discoveredCount,
  currentThreshold: level.currentThreshold,
  nextThreshold: level.nextThreshold,
  nextTitle: level.nextTitle,
  followerCount: counts.followerCount,
  followingCount: counts.followingCount,
  isFollowed,
  isMe,
});

export const toProfileSummaryDto = (user: UserDto, level: LevelDto, isFollowed: boolean, isMe: boolean): ProfileSummaryDto => ({
  id: user.id,
  displayName: user.displayName,
  avatar: user.avatar,
  level: level.level,
  title: level.title,
  discoveredCount: level.discoveredCount,
  isFollowed,
  isMe,
});
