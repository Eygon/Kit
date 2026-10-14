export enum BadgeKindEnum {
  FIRST_SIP = "firstSip",
  EXPLORER = "explorer",
  COLLECTOR = "collector",
  COMPLETIONIST = "completionist",
  GLOBETROTTER = "globetrotter",
  SPECIALIST = "specialist",
  PHOTOGRAPHER = "photographer",
  REGULAR = "regular",
  SENTINEL = "sentinel",
  CARTOGRAPHER = "cartographer",
}

export const BADGE_KIND_LABEL_KEYS: Record<BadgeKindEnum, string> = {
  [BadgeKindEnum.FIRST_SIP]: "pages.profile.badges.kinds.firstSip.name",
  [BadgeKindEnum.EXPLORER]: "pages.profile.badges.kinds.explorer.name",
  [BadgeKindEnum.COLLECTOR]: "pages.profile.badges.kinds.collector.name",
  [BadgeKindEnum.COMPLETIONIST]: "pages.profile.badges.kinds.completionist.name",
  [BadgeKindEnum.GLOBETROTTER]: "pages.profile.badges.kinds.globetrotter.name",
  [BadgeKindEnum.SPECIALIST]: "pages.profile.badges.kinds.specialist.name",
  [BadgeKindEnum.PHOTOGRAPHER]: "pages.profile.badges.kinds.photographer.name",
  [BadgeKindEnum.REGULAR]: "pages.profile.badges.kinds.regular.name",
  [BadgeKindEnum.SENTINEL]: "pages.profile.badges.kinds.sentinel.name",
  [BadgeKindEnum.CARTOGRAPHER]: "pages.profile.badges.kinds.cartographer.name",
};

export const BADGE_KIND_CRITERION_KEYS: Record<BadgeKindEnum, string> = {
  [BadgeKindEnum.FIRST_SIP]: "pages.profile.badges.kinds.firstSip.criterion",
  [BadgeKindEnum.EXPLORER]: "pages.profile.badges.kinds.explorer.criterion",
  [BadgeKindEnum.COLLECTOR]: "pages.profile.badges.kinds.collector.criterion",
  [BadgeKindEnum.COMPLETIONIST]: "pages.profile.badges.kinds.completionist.criterion",
  [BadgeKindEnum.GLOBETROTTER]: "pages.profile.badges.kinds.globetrotter.criterion",
  [BadgeKindEnum.SPECIALIST]: "pages.profile.badges.kinds.specialist.criterion",
  [BadgeKindEnum.PHOTOGRAPHER]: "pages.profile.badges.kinds.photographer.criterion",
  [BadgeKindEnum.REGULAR]: "pages.profile.badges.kinds.regular.criterion",
  [BadgeKindEnum.SENTINEL]: "pages.profile.badges.kinds.sentinel.criterion",
  [BadgeKindEnum.CARTOGRAPHER]: "pages.profile.badges.kinds.cartographer.criterion",
};

export const isBadgeKind = (value: unknown): value is BadgeKindEnum =>
  typeof value === "string" && Object.values<string>(BadgeKindEnum).includes(value);
