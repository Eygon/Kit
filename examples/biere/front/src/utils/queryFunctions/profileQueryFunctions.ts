import ProfileService from "@/api/profiles/profileService";
import { FollowListKindEnum } from "@/types/enums/user/followListKindEnum";
import type { ProfileChanges } from "@/types/models/profile/profileChanges";

export const fetchProfile = (userId: number) => ProfileService.getProfile(userId);

export const updateMyProfile = (changes: ProfileChanges) => ProfileService.updateMine(changes);

export const fetchProfiles = () => ProfileService.getAll();

export const followUser = (userId: number) => ProfileService.follow(userId);

export const unfollowUser = (userId: number) => ProfileService.unfollow(userId);

export const fetchFollowList = (userId: number, kind: FollowListKindEnum) =>
  kind === FollowListKindEnum.FOLLOWERS ? ProfileService.getFollowers(userId) : ProfileService.getFollowing(userId);
