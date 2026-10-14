import { AvatarEnum } from "@/modules/users/enums/avatar.enum";

export const ALICE_USER_ID = 1;

export const BOB_USER_ID = 2;

export const CAROL_USER_ID = 3;

export const SEED_USERS = [
  { id: ALICE_USER_ID, displayName: "Alice", avatarColor: "#F59E0B", avatar: AvatarEnum.HOP },
  { id: BOB_USER_ID, displayName: "Bob", avatarColor: "#10B981", avatar: AvatarEnum.MALT },
  { id: CAROL_USER_ID, displayName: "Carol", avatarColor: "#8B5CF6", avatar: AvatarEnum.GLASS },
] as const;

export const SEED_VOTE_BATCH_SIZE = 200;

export const SEED_DEMO_FOLLOWS = [
  { followerId: ALICE_USER_ID, followedId: BOB_USER_ID },
  { followerId: ALICE_USER_ID, followedId: CAROL_USER_ID },
] as const;

export const DEMO_CHECKIN_USER_IDS = [BOB_USER_ID, CAROL_USER_ID] as const;
