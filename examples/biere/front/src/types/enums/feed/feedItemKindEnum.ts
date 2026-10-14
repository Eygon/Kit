export enum FeedItemKindEnum {
  CHECKIN = "checkin",
  DISCOVERIES = "discoveries",
  LEVEL_UP = "levelUp",
  REVIEW = "review",
}

export const isFeedItemKind = (value: unknown): value is FeedItemKindEnum =>
  typeof value === "string" && Object.values<string>(FeedItemKindEnum).includes(value);
