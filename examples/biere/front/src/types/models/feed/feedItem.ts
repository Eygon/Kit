import type { FeedItemKindEnum } from "@/types/enums/feed/feedItemKindEnum";
import type { LevelTitleEnum } from "@/types/enums/user/levelTitleEnum";
import type { FeedActor } from "@/types/models/feed/feedActor";

export interface FeedItem {
  id: string;
  kind: FeedItemKindEnum;
  occurredAt: string;
  actor: FeedActor;
  beerId: number | null;
  beerName: string | null;
  place: string | null;
  rating: number | null;
  photoId: string | null;
  isDiscovery: boolean;
  discoveryCount: number | null;
  reachedLevel: number | null;
  reachedTitle: LevelTitleEnum | null;
  reviewText: string | null;
}
