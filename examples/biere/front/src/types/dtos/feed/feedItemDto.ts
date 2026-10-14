import type { FeedActorDto } from "@/types/dtos/feed/feedActorDto";

export interface FeedItemDto {
  id: string;
  kind: string;
  occurredAt: string;
  actor: FeedActorDto;
  beerId: number | null;
  beerName: string | null;
  place: string | null;
  rating: number | null;
  photoId: string | null;
  isDiscovery: boolean;
  discoveryCount: number | null;
  reachedLevel: number | null;
  reachedTitle: string | null;
  reviewText: string | null;
}
