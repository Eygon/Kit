import type { AvailabilityDto } from "@/modules/venues/dtos/availability.dto";
import type { VoteRecordDto } from "@/modules/venues/dtos/vote-record.dto";
import { AVAILABILITY_STATUS_RANK, AvailabilityStatusEnum } from "@/modules/venues/enums/availability-status.enum";
import { VoteSenseEnum } from "@/modules/venues/enums/vote-sense.enum";
import {
  AVAILABILITY_MIN_VOTES,
  AVAILABILITY_WINDOW_DAYS,
  DAY_MS,
  HOUR_MS,
  VOTE_COOLDOWN_HOURS,
} from "@/modules/venues/venues.constants";

const isStill = (vote: VoteRecordDto): boolean => vote.sense === VoteSenseEnum.STILL;

const isNewer = (candidate: VoteRecordDto, current: VoteRecordDto): boolean =>
  candidate.votedAt.getTime() > current.votedAt.getTime();

const newestOf = (votes: readonly VoteRecordDto[]): VoteRecordDto | null =>
  votes.reduce<VoteRecordDto | null>((newest, vote) => (newest === null || isNewer(vote, newest) ? vote : newest), null);

const isInsideWindow = (vote: VoteRecordDto, now: Date): boolean =>
  now.getTime() - vote.votedAt.getTime() <= AVAILABILITY_WINDOW_DAYS * DAY_MS;

const keepLatestVotePerUser = (votes: readonly VoteRecordDto[]): VoteRecordDto[] => {
  const latestByUser = new Map<number, VoteRecordDto>();
  votes.forEach((vote) => {
    const current = vote.userId === null ? undefined : latestByUser.get(vote.userId);
    if (vote.userId !== null && (current === undefined || isNewer(vote, current))) {
      latestByUser.set(vote.userId, vote);
    }
  });
  return votes.filter((vote) => vote.userId === null || latestByUser.get(vote.userId) === vote);
};

const resolveStatus = (remaining: readonly VoteRecordDto[]): AvailabilityStatusEnum => {
  const latest = newestOf(remaining);
  if (latest === null) {
    return AvailabilityStatusEnum.UNKNOWN;
  }
  const stillCount = remaining.filter(isStill).length;
  const goneCount = remaining.length - stillCount;
  if (goneCount >= AVAILABILITY_MIN_VOTES && goneCount > stillCount) {
    return AvailabilityStatusEnum.GONE;
  }
  if (!isStill(latest) || stillCount === goneCount) {
    return AvailabilityStatusEnum.MAYBE_GONE;
  }
  if (stillCount >= AVAILABILITY_MIN_VOTES && stillCount > goneCount) {
    return AvailabilityStatusEnum.CONFIRMED;
  }
  return AvailabilityStatusEnum.UNKNOWN;
};

export const computeAvailability = (votes: readonly VoteRecordDto[], now: Date): AvailabilityDto => {
  const remaining = keepLatestVotePerUser(votes.filter((vote) => isInsideWindow(vote, now)));
  return {
    status: resolveStatus(remaining),
    lastConfirmedAt: newestOf(votes.filter(isStill))?.votedAt ?? null,
    recentVoterCount: remaining.length,
  };
};

const isBetter = (candidate: AvailabilityStatusEnum, current: AvailabilityStatusEnum): boolean =>
  AVAILABILITY_STATUS_RANK[candidate] < AVAILABILITY_STATUS_RANK[current];

export const pickBestStatus = (statuses: readonly AvailabilityStatusEnum[]): AvailabilityStatusEnum =>
  statuses.reduce(
    (best, status) => (isBetter(status, best) ? status : best),
    statuses[0] ?? AvailabilityStatusEnum.UNKNOWN,
  );

export const computeNextVoteAt = (votes: readonly VoteRecordDto[], userId: number, now: Date): Date | null => {
  const latest = newestOf(votes.filter((vote) => vote.userId === userId));
  if (latest === null) {
    return null;
  }
  const nextVoteAt = new Date(latest.votedAt.getTime() + VOTE_COOLDOWN_HOURS * HOUR_MS);
  return nextVoteAt.getTime() > now.getTime() ? nextVoteAt : null;
};
