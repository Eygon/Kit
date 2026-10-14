import type { FeedActorDto } from "@/modules/social/dtos/feed-actor.dto";
import type { FeedItemKindEnum } from "@/modules/social/enums/feed-item-kind.enum";
import type { LevelTitleEnum } from "@/modules/social/enums/level-title.enum";

export interface FeedItemDto {
  readonly id: string;
  readonly kind: FeedItemKindEnum;
  readonly occurredAt: string;
  readonly actor: FeedActorDto;
  readonly beerId: number | null;
  readonly beerName: string | null;
  readonly place: string | null;
  readonly rating: number | null;
  readonly photoId: string | null;
  readonly isDiscovery: boolean;
  readonly discoveryCount: number | null;
  readonly reachedLevel: number | null;
  readonly reachedTitle: LevelTitleEnum | null;
  readonly reviewText: string | null;
}
