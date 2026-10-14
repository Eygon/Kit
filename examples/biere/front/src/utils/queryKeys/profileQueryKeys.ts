import type { FollowListKindEnum } from "@/types/enums/user/followListKindEnum";

export const profileKeys = {
  all: () => ["profiles"] as const,
  list: () => [...profileKeys.all(), "list"] as const,
  detail: (userId: number) => [...profileKeys.all(), "detail", userId] as const,
  followList: (userId: number, kind: FollowListKindEnum) => [...profileKeys.all(), "followList", userId, kind] as const,
};
