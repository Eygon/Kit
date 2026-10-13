export enum MascotSizeEnum {
  SM = "sm",
  MD = "md",
  LG = "lg",
}

export const DEFAULT_MASCOT_SIZE = MascotSizeEnum.MD;

export const MASCOT_SIZE_CLASSES: Readonly<Record<MascotSizeEnum, string>> = {
  [MascotSizeEnum.SM]: "size-24",
  [MascotSizeEnum.MD]: "size-36",
  [MascotSizeEnum.LG]: "size-48",
};

export const MASCOT_IMAGE_SIZES: Readonly<Record<MascotSizeEnum, string>> = {
  [MascotSizeEnum.SM]: "6rem",
  [MascotSizeEnum.MD]: "9rem",
  [MascotSizeEnum.LG]: "12rem",
};
