import type { FollowListKindEnum } from "@/types/enums/user/followListKindEnum";

export type FollowListSheetProps = Readonly<{
  userId: number;
  displayName: string;
  kind: FollowListKindEnum;
  label: string;
}>;
