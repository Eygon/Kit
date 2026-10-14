import type { AvatarEnum } from "@/types/enums/user/avatarEnum";

export type AvatarPickerProps = Readonly<{
  value: AvatarEnum;
  onChange: (avatar: AvatarEnum) => void;
}>;
