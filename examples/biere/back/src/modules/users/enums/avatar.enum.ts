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

export const isAvatar = (value: unknown): value is AvatarEnum =>
  typeof value === "string" && (Object.values(AvatarEnum) as string[]).includes(value);
