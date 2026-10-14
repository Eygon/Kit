import type { FeedItemDto } from "@/types/dtos/feed/feedItemDto";
import { isFeedItemKind } from "@/types/enums/feed/feedItemKindEnum";
import { isLevelTitle } from "@/types/enums/user/levelTitleEnum";
import { feedActorDtoToModel } from "@/types/mappers/feed/feedActorMapper";
import type { FeedItem } from "@/types/models/feed/feedItem";

export const feedItemDtoToModel = (dto: FeedItemDto): FeedItem | null => {
  if (!isFeedItemKind(dto.kind)) return null;
  return {
    id: dto.id,
    kind: dto.kind,
    occurredAt: dto.occurredAt,
    actor: feedActorDtoToModel(dto.actor),
    beerId: dto.beerId ?? null,
    beerName: dto.beerName ?? null,
    place: dto.place ?? null,
    rating: dto.rating ?? null,
    photoId: dto.photoId ?? null,
    isDiscovery: dto.isDiscovery ?? false,
    discoveryCount: dto.discoveryCount ?? null,
    reachedLevel: dto.reachedLevel ?? null,
    reachedTitle: isLevelTitle(dto.reachedTitle) ? dto.reachedTitle : null,
    reviewText: dto.reviewText ?? null,
  };
};
