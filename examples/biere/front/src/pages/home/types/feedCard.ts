import type { FeedItem } from "@/types/models/feed/feedItem";

export type FeedCardProps = Readonly<{
  item: FeedItem;
  now: Date;
}>;
