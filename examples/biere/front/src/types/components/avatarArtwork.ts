import type { AvatarEnum } from "@/types/enums/user/avatarEnum";

export type AvatarShape = Readonly<{
  d: string;
  className: string;
}>;

export type AvatarArtwork = Readonly<{
  avatar: AvatarEnum;
  shapes: readonly AvatarShape[];
}>;
