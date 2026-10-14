import type { AvatarEnum } from "@/types/enums/user/avatarEnum";
import type { AvatarSizeEnum } from "@/types/enums/user/avatarSizeEnum";

export type UserAvatarProps = Readonly<{
  avatar: AvatarEnum;
  size?: AvatarSizeEnum;
  isDecorative?: boolean;
}>;
