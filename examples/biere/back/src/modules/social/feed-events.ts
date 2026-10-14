import { toParisDayKey } from "@/common/time/paris-day-key";
import type { ReviewRecordDto } from "@/modules/beers/dtos/review-record.dto";
import type { FeedEventDto } from "@/modules/social/dtos/feed-event.dto";
import { FEED_KIND_ORDER, FeedItemKindEnum } from "@/modules/social/enums/feed-item-kind.enum";
import type { LevelTitleEnum } from "@/modules/social/enums/level-title.enum";
import { toLevel } from "@/modules/social/levels";
import type { CheckinRecordDto } from "@/modules/tastings/dtos/checkin-record.dto";

const MIN_DISCOVERIES_PER_CARD = 2;
const FIRST_LEVEL = 1;

const compareChronologically = (left: CheckinRecordDto, right: CheckinRecordDto): number =>
  Date.parse(left.drankAt) - Date.parse(right.drankAt) || left.id - right.id;

const toCheckinEvent = (record: CheckinRecordDto, isDiscovery: boolean): FeedEventDto => ({
  id: `checkin-${record.id}`,
  kind: FeedItemKindEnum.CHECKIN,
  userId: record.userId,
  occurredAt: record.drankAt,
  beerId: record.beerId,
  place: record.place,
  rating: record.rating,
  photoId: record.photoId,
  isDiscovery,
  discoveryCount: null,
  reachedLevel: null,
  reachedTitle: null,
  reviewText: null,
});

const toDiscoveriesEvent = (userId: number, dayKey: string, dayDiscoveries: readonly CheckinRecordDto[]): FeedEventDto => ({
  id: `discoveries-${userId}-${dayKey}`,
  kind: FeedItemKindEnum.DISCOVERIES,
  userId,
  occurredAt: dayDiscoveries[dayDiscoveries.length - 1].drankAt,
  beerId: null,
  place: null,
  rating: null,
  photoId: null,
  isDiscovery: false,
  discoveryCount: dayDiscoveries.length,
  reachedLevel: null,
  reachedTitle: null,
  reviewText: null,
});

const toLevelUpEvent = (record: CheckinRecordDto, level: number, title: LevelTitleEnum): FeedEventDto => ({
  id: `levelUp-${record.userId}-${level}`,
  kind: FeedItemKindEnum.LEVEL_UP,
  userId: record.userId,
  occurredAt: record.drankAt,
  beerId: null,
  place: null,
  rating: null,
  photoId: null,
  isDiscovery: false,
  discoveryCount: null,
  reachedLevel: level,
  reachedTitle: title,
  reviewText: null,
});

const toReviewEvent = (review: ReviewRecordDto): FeedEventDto => ({
  id: `review-${review.id}`,
  kind: FeedItemKindEnum.REVIEW,
  userId: review.userId,
  occurredAt: review.updatedAt,
  beerId: review.beerId,
  place: null,
  rating: review.rating,
  photoId: null,
  isDiscovery: false,
  discoveryCount: null,
  reachedLevel: null,
  reachedTitle: null,
  reviewText: review.text,
});

const findDiscoveries = (chronologicalCheckins: readonly CheckinRecordDto[]): CheckinRecordDto[] => {
  const discovered = new Set<string>();
  return chronologicalCheckins.filter((record) => {
    const discoveryKey = `${record.userId}:${record.beerId}`;
    const isDiscovery = !discovered.has(discoveryKey);
    discovered.add(discoveryKey);
    return isDiscovery;
  });
};

const toDiscoveriesEvents = (discoveries: readonly CheckinRecordDto[]): FeedEventDto[] => {
  const byUserAndDay = new Map<string, CheckinRecordDto[]>();
  discoveries.forEach((record) => {
    const groupKey = `${record.userId}:${toParisDayKey(record.drankAt)}`;
    byUserAndDay.set(groupKey, [...(byUserAndDay.get(groupKey) ?? []), record]);
  });
  return [...byUserAndDay.values()]
    .filter((group) => group.length >= MIN_DISCOVERIES_PER_CARD)
    .map((group) => toDiscoveriesEvent(group[0].userId, toParisDayKey(group[0].drankAt), group));
};

const toLevelUpEvents = (discoveries: readonly CheckinRecordDto[]): FeedEventDto[] => {
  const countByUser = new Map<number, number>();
  return discoveries.flatMap((record) => {
    const count = (countByUser.get(record.userId) ?? 0) + 1;
    countByUser.set(record.userId, count);
    const { level, title, currentThreshold } = toLevel(count);
    return level > FIRST_LEVEL && currentThreshold === count ? [toLevelUpEvent(record, level, title)] : [];
  });
};

export const buildFeedEvents = (checkins: readonly CheckinRecordDto[], reviews: readonly ReviewRecordDto[]): FeedEventDto[] => {
  const chronological = [...checkins].sort(compareChronologically);
  const discoveries = findDiscoveries(chronological);
  const discoveryIds = new Set(discoveries.map((record) => record.id));
  return [
    ...chronological.map((record) => toCheckinEvent(record, discoveryIds.has(record.id))),
    ...toDiscoveriesEvents(discoveries),
    ...toLevelUpEvents(discoveries),
    ...reviews.map(toReviewEvent),
  ];
};

export const sortFeedEvents = (events: readonly FeedEventDto[]): FeedEventDto[] =>
  [...events].sort(
    (left, right) =>
      Date.parse(right.occurredAt) - Date.parse(left.occurredAt) ||
      FEED_KIND_ORDER.indexOf(left.kind) - FEED_KIND_ORDER.indexOf(right.kind) ||
      right.id.localeCompare(left.id, undefined, { numeric: true }),
  );
