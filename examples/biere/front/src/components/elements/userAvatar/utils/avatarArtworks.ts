import type { AvatarArtwork } from "@/types/components/avatarArtwork";
import { AvatarEnum, DEFAULT_AVATAR } from "@/types/enums/user/avatarEnum";

const ACCENT = "fill-accent stroke-foreground";
const SECONDARY = "fill-secondary stroke-foreground";
const HIGHLIGHT = "fill-highlight stroke-foreground";
const SURFACE = "fill-surface stroke-foreground";
const BACKGROUND = "fill-background stroke-foreground";

export const AVATAR_ARTWORKS: readonly AvatarArtwork[] = [
  {
    avatar: AvatarEnum.HOP,
    shapes: [
      { d: "M24 5 C33 9 37 20 33 30 C31 36 27 40 24 43 C21 40 17 36 15 30 C11 20 15 9 24 5Z", className: ACCENT },
      { d: "M24 13 C28 18 28 24 24 29 C20 24 20 18 24 13Z", className: SURFACE },
    ],
  },
  {
    avatar: AvatarEnum.MALT,
    shapes: [
      { d: "M22 44 H26 V16 H22Z", className: SECONDARY },
      { d: "M24 4 C28 8 28 13 24 17 C20 13 20 8 24 4Z", className: SECONDARY },
      { d: "M14 16 C19 16 22 21 22 26 C17 26 14 21 14 16Z", className: SECONDARY },
      { d: "M34 16 C29 16 26 21 26 26 C31 26 34 21 34 16Z", className: SECONDARY },
      { d: "M14 28 C19 28 22 33 22 38 C17 38 14 33 14 28Z", className: SECONDARY },
      { d: "M34 28 C29 28 26 33 26 38 C31 38 34 33 34 28Z", className: SECONDARY },
    ],
  },
  {
    avatar: AvatarEnum.GLASS,
    shapes: [
      { d: "M13 15 H35 L32 43 H16Z", className: HIGHLIGHT },
      { d: "M11 15 C9 9 16 7 19 10 C21 5 28 5 30 10 C34 7 39 11 37 15Z", className: SURFACE },
    ],
  },
  {
    avatar: AvatarEnum.MUG,
    shapes: [
      { d: "M30 19 H38 V35 H30 V31 H34 V23 H30Z", className: SECONDARY },
      { d: "M9 17 H31 V41 H9Z", className: HIGHLIGHT },
      { d: "M8 17 C6 11 13 9 17 12 C19 8 27 8 30 13 C32 14 32 16 32 17Z", className: SURFACE },
    ],
  },
  {
    avatar: AvatarEnum.BOTTLE,
    shapes: [
      { d: "M21 6 H27 V15 C27 19 33 21 33 27 V43 H15 V27 C15 21 21 19 21 15Z", className: SECONDARY },
      { d: "M15 29 H33 V37 H15Z", className: SURFACE },
      { d: "M20 3 H28 V7 H20Z", className: HIGHLIGHT },
    ],
  },
  {
    avatar: AvatarEnum.CAN,
    shapes: [
      { d: "M13 11 H35 V41 H13Z", className: ACCENT },
      { d: "M13 11 L16 6 H32 L35 11Z", className: BACKGROUND },
      { d: "M13 21 H35 V31 H13Z", className: HIGHLIGHT },
    ],
  },
  {
    avatar: AvatarEnum.BARREL,
    shapes: [
      { d: "M13 7 C7 18 7 30 13 41 H35 C41 30 41 18 35 7Z", className: SECONDARY },
      { d: "M9 14 H39 V18 H9Z", className: HIGHLIGHT },
      { d: "M9 30 H39 V34 H9Z", className: HIGHLIGHT },
    ],
  },
  {
    avatar: AvatarEnum.TAP,
    shapes: [
      { d: "M18 4 H30 V10 H18Z", className: SECONDARY },
      { d: "M21 10 H27 V16 H21Z", className: SECONDARY },
      { d: "M8 16 H36 V24 H30 V30 H24 V24 H8Z", className: SURFACE },
      { d: "M27 34 C31 38 31 42 27 42 C23 42 23 38 27 34Z", className: HIGHLIGHT },
    ],
  },
  {
    avatar: AvatarEnum.CAP,
    shapes: [
      {
        d: "M45 24 L40.4 28.4 L42.2 34.5 L36 36 L34.5 42.2 L28.4 40.4 L24 45 L19.6 40.4 L13.5 42.2 L12 36 L5.8 34.5 L7.6 28.4 L3 24 L7.6 19.6 L5.8 13.5 L12 12 L13.5 5.8 L19.6 7.6 L24 3 L28.4 7.6 L34.5 5.8 L36 12 L42.2 13.5 L40.4 19.6Z",
        className: HIGHLIGHT,
      },
      { d: "M12 24 A12 12 0 1 0 36 24 A12 12 0 1 0 12 24Z", className: SURFACE },
    ],
  },
  {
    avatar: AvatarEnum.FOAM,
    shapes: [
      { d: "M11 36 C3 36 3 24 12 24 C12 15 23 13 26 20 C31 13 42 17 39 26 C46 28 44 37 37 36Z", className: SURFACE },
      { d: "M17 31 A2 2 0 1 0 21 31 A2 2 0 1 0 17 31Z", className: BACKGROUND },
      { d: "M28 29 A3 3 0 1 0 34 29 A3 3 0 1 0 28 29Z", className: BACKGROUND },
    ],
  },
  {
    avatar: AvatarEnum.WHEAT,
    shapes: [
      { d: "M23 44 H25 V12 H23Z", className: SECONDARY },
      { d: "M24 3 C28 6 28 11 24 14 C20 11 20 6 24 3Z", className: HIGHLIGHT },
      { d: "M13 14 C18 15 21 19 21 24 C16 23 13 19 13 14Z", className: HIGHLIGHT },
      { d: "M35 14 C30 15 27 19 27 24 C32 23 35 19 35 14Z", className: HIGHLIGHT },
      { d: "M13 26 C18 27 21 31 21 36 C16 35 13 31 13 26Z", className: HIGHLIGHT },
      { d: "M35 26 C30 27 27 31 27 36 C32 35 35 31 35 26Z", className: HIGHLIGHT },
    ],
  },
  {
    avatar: AvatarEnum.PRETZEL,
    shapes: [
      { d: "M24 39 C9 39 5 22 13 16 C20 11 24 19 24 26 C24 19 28 11 35 16 C43 22 39 39 24 39Z", className: SECONDARY },
      { d: "M16 24 A3 3 0 1 0 22 24 A3 3 0 1 0 16 24Z", className: SURFACE },
      { d: "M26 24 A3 3 0 1 0 32 24 A3 3 0 1 0 26 24Z", className: SURFACE },
    ],
  },
];

export const getAvatarArtwork = (avatar: string): AvatarArtwork =>
  AVATAR_ARTWORKS.find((artwork) => artwork.avatar === avatar) ?? AVATAR_ARTWORKS.find((artwork) => artwork.avatar === DEFAULT_AVATAR)!;
