export enum FollowListKindEnum {
  FOLLOWERS = "followers",
  FOLLOWING = "following",
}

export const FOLLOW_LIST_TITLE_KEYS: Record<FollowListKindEnum, string> = {
  [FollowListKindEnum.FOLLOWERS]: "followList.followers",
  [FollowListKindEnum.FOLLOWING]: "followList.following",
};
