export enum AvatarEnum {
  HOP = "hop",
  MALT = "malt",
  GLASS = "glass",
  MUG = "mug",
  BOTTLE = "bottle",
  CAN = "can",
  BARREL = "barrel",
  TAP = "tap",
  CAP = "cap",
  FOAM = "foam",
  WHEAT = "wheat",
  PRETZEL = "pretzel",
}

export const DEFAULT_AVATAR = AvatarEnum.HOP;

export const AVATAR_LABEL_KEYS: Record<AvatarEnum, string> = {
  [AvatarEnum.HOP]: "avatar.names.hop",
  [AvatarEnum.MALT]: "avatar.names.malt",
  [AvatarEnum.GLASS]: "avatar.names.glass",
  [AvatarEnum.MUG]: "avatar.names.mug",
  [AvatarEnum.BOTTLE]: "avatar.names.bottle",
  [AvatarEnum.CAN]: "avatar.names.can",
  [AvatarEnum.BARREL]: "avatar.names.barrel",
  [AvatarEnum.TAP]: "avatar.names.tap",
  [AvatarEnum.CAP]: "avatar.names.cap",
  [AvatarEnum.FOAM]: "avatar.names.foam",
  [AvatarEnum.WHEAT]: "avatar.names.wheat",
  [AvatarEnum.PRETZEL]: "avatar.names.pretzel",
};

export const AVATAR_OPTIONS: readonly { id: AvatarEnum; labelKey: string }[] = Object.values(AvatarEnum).map((id) => ({
  id,
  labelKey: AVATAR_LABEL_KEYS[id],
}));

export const isAvatar = (value: unknown): value is AvatarEnum =>
  typeof value === "string" && Object.values<string>(AvatarEnum).includes(value);
