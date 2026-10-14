import type { FeedItem } from "@/types/models/feed/feedItem";

export interface FeedPage {
  items: FeedItem[];
  total: number;
  page: number;
  size: number;
}
