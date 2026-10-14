import type { FeedItemDto } from "@/types/dtos/feed/feedItemDto";

export interface FeedPageDto {
  items: FeedItemDto[];
  total: number;
  page: number;
  size: number;
}
