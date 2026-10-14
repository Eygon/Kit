import type { FeedPageDto } from "@/types/dtos/feed/feedPageDto";
import { feedItemDtoToModel } from "@/types/mappers/feed/feedItemMapper";
import type { FeedItem } from "@/types/models/feed/feedItem";
import type { FeedPage } from "@/types/models/feed/feedPage";

const isFeedItem = (item: FeedItem | null): item is FeedItem => item !== null;

export const feedPageDtoToModel = (dto: FeedPageDto): FeedPage => ({
  items: dto.items.map(feedItemDtoToModel).filter(isFeedItem),
  total: dto.total,
  page: dto.page,
  size: dto.size,
});
