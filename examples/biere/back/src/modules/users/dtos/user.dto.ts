import type { AvatarEnum } from "@/modules/users/enums/avatar.enum";

export interface UserDto {
  readonly id: number;
  readonly displayName: string;
  readonly avatarColor: string;
  readonly avatar: AvatarEnum;
}
