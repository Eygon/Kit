import type { AvailabilityVote } from "@/modules/venues/entities/availability-vote.entity";
import type { VenueBeer } from "@/modules/venues/entities/venue-beer.entity";
import type { Venue } from "@/modules/venues/entities/venue.entity";
import { AvailabilityStatusEnum, isAvailabilityStatus } from "@/modules/venues/enums/availability-status.enum";
import { isVenueType } from "@/modules/venues/enums/venue-type.enum";
import { VoteSenseEnum } from "@/modules/venues/enums/vote-sense.enum";
import { AVAILABILITY_WINDOW_DAYS, DAY_MS, HOUR_MS } from "@/modules/venues/venues.constants";

export interface VenueSeedRow {
  readonly name: string;
  readonly type: string;
  readonly city: string;
  readonly address: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly description: string;
}

const NAME_KEY_LOCALE = "fr";

const toVenueRow = (row: VenueSeedRow): Omit<Venue, "id"> => {
  if (!isVenueType(row.type)) {
    throw new Error(`Venue "${row.name}" has an unknown type "${row.type}".`);
  }
  return {
    name: row.name,
    type: row.type,
    city: row.city,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    description: row.description,
    nameKey: row.name.trim().toLocaleLowerCase(NAME_KEY_LOCALE),
  };
};

export const buildVenueRows = (rows: readonly VenueSeedRow[]): Omit<Venue, "id">[] => rows.map(toVenueRow);

export interface VenueBeerSeedRow {
  readonly venueName: string;
  readonly beerName: string;
  readonly status: string;
  readonly lastConfirmedDaysAgo: number | null;
  readonly positiveVotes: number;
  readonly negativeVotes: number;
}

export type VenueBeerInsertRow = Omit<VenueBeer, "id" | "createdAt" | "venue" | "votes">;

export type SeedVoteRow = Omit<AvailabilityVote, "id" | "venueBeer">;

const CONFIRMED_SPREAD_LIMIT_DAYS = AVAILABILITY_WINDOW_DAYS - 2;
const OUTSIDE_WINDOW_DAYS = AVAILABILITY_WINDOW_DAYS + 1;
const GONE_VOTE_STEP_DAYS = 2;

const findLinkId = (ids: ReadonlyMap<string, number>, name: string, row: VenueBeerSeedRow, kind: string): number => {
  const id = ids.get(name.toLowerCase());
  if (id === undefined) {
    throw new Error(`Venue beer "${row.venueName} / ${row.beerName}" has an unknown ${kind}.`);
  }
  return id;
};

export const buildVenueBeerRows = (
  rows: readonly VenueBeerSeedRow[],
  venueIdsByName: ReadonlyMap<string, number>,
  beerIdsByName: ReadonlyMap<string, number>,
): VenueBeerInsertRow[] =>
  rows.map((row) => {
    const venueId = findLinkId(venueIdsByName, row.venueName, row, "venue");
    const beerId = findLinkId(beerIdsByName, row.beerName, row, "beer");
    if (!isAvailabilityStatus(row.status)) {
      throw new Error(`Venue beer "${row.venueName} / ${row.beerName}" has an unknown status "${row.status}".`);
    }
    return { venueId, beerId };
  });

const range = (count: number): number[] => Array.from({ length: count }, (_, index) => index);

const toVoteDater =
  (now: Date) =>
  (days: number, hours: number): Date =>
    new Date(now.getTime() - Math.round(days * DAY_MS) - hours * HOUR_MS);

const toVotes = (venueBeerId: number, sense: VoteSenseEnum, dates: readonly Date[]): SeedVoteRow[] =>
  dates.map((votedAt) => ({ venueBeerId, userId: null, sense, votedAt }));

export const buildSeedVotes = (row: VenueBeerSeedRow, venueBeerId: number, now: Date): SeedVoteRow[] => {
  const lastDays = row.lastConfirmedDaysAgo;
  if (lastDays === null) {
    return [];
  }
  const at = toVoteDater(now);
  const stillCount = row.positiveVotes;
  const goneCount = row.negativeVotes;
  const outsideDays = Math.max(OUTSIDE_WINDOW_DAYS, lastDays);
  let stillDates: Date[];
  let goneDates: Date[];
  if (row.status === AvailabilityStatusEnum.CONFIRMED) {
    const step = Math.min(1, (CONFIRMED_SPREAD_LIMIT_DAYS - lastDays) / stillCount);
    stillDates = range(stillCount).map((index) => at(lastDays + index * step, 0));
    goneDates = range(goneCount).map((index) => at(lastDays, 1 + index));
  } else if (row.status === AvailabilityStatusEnum.MAYBE_GONE) {
    stillDates = range(stillCount).map((index) => (index === 0 ? at(lastDays, 0) : at(outsideDays + index, 0)));
    goneDates = range(goneCount).map((index) =>
      index === 0
        ? at(Math.max(0, Math.min(lastDays, AVAILABILITY_WINDOW_DAYS) - 1), 1)
        : at(outsideDays + index, 0),
    );
  } else {
    stillDates = range(stillCount).map((index) => at(lastDays + index, 0));
    goneDates = range(goneCount).map((index) => at(1 + GONE_VOTE_STEP_DAYS * index, 0));
  }
  return [
    ...toVotes(venueBeerId, VoteSenseEnum.STILL, stillDates),
    ...toVotes(venueBeerId, VoteSenseEnum.GONE, goneDates),
  ];
};
