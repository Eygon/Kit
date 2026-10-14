export enum FeedItemKindEnum {
  CHECKIN = "checkin",
  DISCOVERIES = "discoveries",
  LEVEL_UP = "levelUp",
  REVIEW = "review",
}

export const FEED_KIND_ORDER: readonly FeedItemKindEnum[] = [
  FeedItemKindEnum.LEVEL_UP,
  FeedItemKindEnum.DISCOVERIES,
  FeedItemKindEnum.REVIEW,
  FeedItemKindEnum.CHECKIN,
];
