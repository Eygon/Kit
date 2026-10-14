import type { FeedItemDto } from "@/modules/social/dtos/feed-item.dto";

export interface FeedPageDto {
  readonly items: readonly FeedItemDto[];
  readonly total: number;
  readonly page: number;
  readonly size: number;
}
