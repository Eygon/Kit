import { CORRECTION_VOTE_DURATION_MS } from "@/modules/beers/beers.constants";
import type { BeerCorrection } from "@/modules/beers/entities/beer-correction.entity";
import type { BeerCorrectionVote } from "@/modules/beers/entities/beer-correction-vote.entity";
import { isBeerCharacteristic } from "@/modules/beers/enums/beer-characteristic.enum";
import type { BeerCharacteristicEnum } from "@/modules/beers/enums/beer-characteristic.enum";
import { CorrectionStatusEnum } from "@/modules/beers/enums/correction-status.enum";
import { CorrectionVoteSenseEnum } from "@/modules/beers/enums/correction-vote-sense.enum";

const HOUR_MS = 3_600_000;
const FIRST_VOTE_DELAY_HOURS = 1;

export interface DemoCorrectionVoteSeedRow {
  readonly userName: string;
  readonly sense: string;
}

export interface DemoCorrectionSeedRow {
  readonly beerName: string;
  readonly characteristic: string;
  readonly proposedValue: number | readonly string[];
  readonly reason: string;
  readonly proposedBy: string;
  readonly closesInHours?: number;
  readonly resolvedHoursAgo?: number;
  readonly status: string;
  readonly previousValue?: number | readonly string[] | null;
  readonly votes: readonly DemoCorrectionVoteSeedRow[];
}

export type DemoCorrectionInsertRow = Omit<BeerCorrection, "id">;

export interface DemoCorrectionVoteInsertRow extends Omit<BeerCorrectionVote, "id" | "correctionId"> {
  readonly correctionIndex: number;
}

export interface DemoCorrectionRows {
  readonly corrections: DemoCorrectionInsertRow[];
  readonly votes: DemoCorrectionVoteInsertRow[];
}

const findBeerId = (ids: ReadonlyMap<string, number>, row: DemoCorrectionSeedRow): number => {
  const id = ids.get(row.beerName.toLowerCase());
  if (id === undefined) {
    throw new Error(`Demo correction by "${row.proposedBy}" has an unknown beer "${row.beerName}".`);
  }
  return id;
};

const findUserId = (ids: ReadonlyMap<string, number>, row: DemoCorrectionSeedRow, userName: string): number => {
  const id = ids.get(userName);
  if (id === undefined) {
    throw new Error(`Demo correction of "${row.beerName}" has an unknown user "${userName}".`);
  }
  return id;
};

const findCharacteristic = (row: DemoCorrectionSeedRow): BeerCharacteristicEnum => {
  if (!isBeerCharacteristic(row.characteristic)) {
    throw new Error(`Demo correction of "${row.beerName}" has an unknown characteristic "${row.characteristic}".`);
  }
  return row.characteristic;
};

const findStatus = (row: DemoCorrectionSeedRow): CorrectionStatusEnum => {
  const status = Object.values(CorrectionStatusEnum).find((candidate) => candidate === row.status);
  if (status === undefined) {
    throw new Error(`Demo correction of "${row.beerName}" has an unknown status "${row.status}".`);
  }
  return status;
};

const findSense = (row: DemoCorrectionSeedRow, vote: DemoCorrectionVoteSeedRow): CorrectionVoteSenseEnum => {
  const sense = Object.values(CorrectionVoteSenseEnum).find((candidate) => candidate === vote.sense);
  if (sense === undefined) {
    throw new Error(`Demo correction of "${row.beerName}" has an unknown vote sense "${vote.sense}".`);
  }
  return sense;
};

const toCorrectionRow = (
  row: DemoCorrectionSeedRow,
  beerIdsByName: ReadonlyMap<string, number>,
  userIdsByName: ReadonlyMap<string, number>,
  now: Date,
): DemoCorrectionInsertRow => {
  const resolvedAt = row.resolvedHoursAgo === undefined ? null : new Date(now.getTime() - row.resolvedHoursAgo * HOUR_MS);
  const closesAt = resolvedAt ?? new Date(now.getTime() + (row.closesInHours ?? 0) * HOUR_MS);
  return {
    beerId: findBeerId(beerIdsByName, row),
    characteristic: findCharacteristic(row),
    proposedValue: JSON.stringify(row.proposedValue),
    reason: row.reason,
    proposedBy: findUserId(userIdsByName, row, row.proposedBy),
    createdAt: new Date(closesAt.getTime() - CORRECTION_VOTE_DURATION_MS),
    closesAt,
    status: findStatus(row),
    resolvedAt,
    previousValue: row.resolvedHoursAgo === undefined ? null : JSON.stringify(row.previousValue ?? null),
  };
};

export const buildDemoCorrectionRows = (
  rows: readonly DemoCorrectionSeedRow[],
  beerIdsByName: ReadonlyMap<string, number>,
  userIdsByName: ReadonlyMap<string, number>,
  now: Date,
): DemoCorrectionRows => {
  const corrections = rows.map((row) => toCorrectionRow(row, beerIdsByName, userIdsByName, now));
  const votes = rows.flatMap((row, correctionIndex) =>
    row.votes.map((vote) => ({
      correctionIndex,
      userId: findUserId(userIdsByName, row, vote.userName),
      sense: findSense(row, vote),
      votedAt: new Date(corrections[correctionIndex].createdAt.getTime() + FIRST_VOTE_DELAY_HOURS * HOUR_MS),
    })),
  );
  return { corrections, votes };
};
