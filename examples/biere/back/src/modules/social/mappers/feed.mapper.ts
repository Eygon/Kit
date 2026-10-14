import type { FeedActorDto } from "@/modules/social/dtos/feed-actor.dto";
import type { FeedEventDto } from "@/modules/social/dtos/feed-event.dto";
import type { FeedItemDto } from "@/modules/social/dtos/feed-item.dto";
import type { FeedPageDto } from "@/modules/social/dtos/feed-page.dto";
import type { LevelDto } from "@/modules/social/dtos/level.dto";
import type { UserDto } from "@/modules/users/dtos/user.dto";

export const toFeedActorDto = (user: UserDto, level: LevelDto): FeedActorDto => ({
  id: user.id,
  displayName: user.displayName,
  avatar: user.avatar,
  level: level.level,
  title: level.title,
});

export const toFeedItemDto = (event: FeedEventDto, actor: FeedActorDto, beerName: string | null): FeedItemDto => ({
  id: event.id,
  kind: event.kind,
  occurredAt: event.occurredAt,
  actor,
  beerId: event.beerId,
  beerName,
  place: event.place,
  rating: event.rating,
  photoId: event.photoId,
  isDiscovery: event.isDiscovery,
  discoveryCount: event.discoveryCount,
  reachedLevel: event.reachedLevel,
  reachedTitle: event.reachedTitle,
  reviewText: event.reviewText,
});

export const toFeedPageDto = (items: readonly FeedItemDto[], total: number, page: number, size: number): FeedPageDto => ({
  items,
  total,
  page,
  size,
});
