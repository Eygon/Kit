import type { AvatarEnum } from "@/types/enums/user/avatarEnum";

export interface ProfileChanges {
  displayName: string;
  avatar: AvatarEnum;
}
