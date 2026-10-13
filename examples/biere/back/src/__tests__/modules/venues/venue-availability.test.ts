import { describe, expect, it } from "vitest";
import venueBeersSeed from "@/database/seed/data/venue-beers.json";
import { buildSeedVotes } from "@/database/seed/venue-seed";
import type { VoteRecordDto } from "@/modules/venues/dtos/vote-record.dto";
import { AvailabilityStatusEnum } from "@/modules/venues/enums/availability-status.enum";
import { VoteSenseEnum } from "@/modules/venues/enums/vote-sense.enum";
import { computeAvailability, computeNextVoteAt, pickBestStatus } from "@/modules/venues/venue-availability";
import { AVAILABILITY_WINDOW_DAYS, DAY_MS, HOUR_MS } from "@/modules/venues/venues.constants";

const NOW = new Date("2026-03-15T12:00:00.000Z");
const SEEDED_LINK_COUNT = 325;
const SEED_LINK_ID = 1;

const hoursAgo = (hours: number): Date => new Date(NOW.getTime() - hours * HOUR_MS);

const daysAgo = (days: number): Date => new Date(NOW.getTime() - days * DAY_MS);

const still = (votedAt: Date, userId: number | null = null): VoteRecordDto => ({
  userId,
  sense: VoteSenseEnum.STILL,
  votedAt,
});

const gone = (votedAt: Date, userId: number | null = null): VoteRecordDto => ({
  userId,
  sense: VoteSenseEnum.GONE,
  votedAt,
});

describe("computeAvailability", () => {
  it("is unknown without any vote, with no confirmation and no recent voter", () => {
    expect(computeAvailability([], NOW)).toEqual({
      status: AvailabilityStatusEnum.UNKNOWN,
      lastConfirmedAt: null,
      recentVoterCount: 0,
    });
  });

  it("is confirmed with two still votes and none against, and counts the voters", () => {
    expect(computeAvailability([still(hoursAgo(5)), still(hoursAgo(2))], NOW)).toEqual({
      status: AvailabilityStatusEnum.CONFIRMED,
      lastConfirmedAt: hoursAgo(2),
      recentVoterCount: 2,
    });
  });

  it("is confirmed when still votes outnumber gone votes by the older gone vote", () => {
    const votes = [gone(hoursAgo(10)), still(hoursAgo(5)), still(hoursAgo(4)), still(hoursAgo(3))];

    expect(computeAvailability(votes, NOW).status).toBe(AvailabilityStatusEnum.CONFIRMED);
  });

  it("is maybe gone on a one-one tie even when the still vote is the latest", () => {
    expect(computeAvailability([gone(hoursAgo(5)), still(hoursAgo(1))], NOW).status).toBe(
      AvailabilityStatusEnum.MAYBE_GONE,
    );
  });

  it("is maybe gone after two still votes then a more recent gone vote and gives three recent voters", () => {
    const result = computeAvailability([still(hoursAgo(9)), still(hoursAgo(8)), gone(hoursAgo(1))], NOW);

    expect(result).toEqual({
      status: AvailabilityStatusEnum.MAYBE_GONE,
      lastConfirmedAt: hoursAgo(8),
      recentVoterCount: 3,
    });
  });

  it("is maybe gone with a single gone vote", () => {
    expect(computeAvailability([gone(hoursAgo(1))], NOW).status).toBe(AvailabilityStatusEnum.MAYBE_GONE);
  });

  it("is gone with three gone votes, the latest of them being gone", () => {
    const result = computeAvailability([gone(hoursAgo(9)), gone(hoursAgo(8)), gone(hoursAgo(1))], NOW);

    expect(result).toEqual({ status: AvailabilityStatusEnum.GONE, lastConfirmedAt: null, recentVoterCount: 3 });
  });

  it("is gone with two gone votes against one still vote", () => {
    const votes = [gone(hoursAgo(9)), still(hoursAgo(8)), gone(hoursAgo(7))];

    expect(computeAvailability(votes, NOW).status).toBe(AvailabilityStatusEnum.GONE);
  });

  it("is unknown with a single still vote but keeps its date and one recent voter", () => {
    expect(computeAvailability([still(hoursAgo(3))], NOW)).toEqual({
      status: AvailabilityStatusEnum.UNKNOWN,
      lastConfirmedAt: hoursAgo(3),
      recentVoterCount: 1,
    });
  });

  it("counts a vote cast exactly thirty days ago", () => {
    const result = computeAvailability([still(daysAgo(AVAILABILITY_WINDOW_DAYS)), still(daysAgo(1))], NOW);

    expect(result.status).toBe(AvailabilityStatusEnum.CONFIRMED);
    expect(result.recentVoterCount).toBe(2);
  });

  it("ignores a vote cast thirty days and one millisecond ago", () => {
    const justOutside = new Date(daysAgo(AVAILABILITY_WINDOW_DAYS).getTime() - 1);

    const result = computeAvailability([still(justOutside), still(daysAgo(1))], NOW);

    expect(result.status).toBe(AvailabilityStatusEnum.UNKNOWN);
    expect(result.recentVoterCount).toBe(1);
  });

  it("keeps an old still vote as the last confirmation while the state ignores it", () => {
    const result = computeAvailability([still(daysAgo(40)), still(daysAgo(45)), gone(daysAgo(2))], NOW);

    expect(result).toEqual({
      status: AvailabilityStatusEnum.MAYBE_GONE,
      lastConfirmedAt: daysAgo(40),
      recentVoterCount: 1,
    });
  });

  it("takes the latest still vote as the last confirmation even when a gone vote is more recent", () => {
    const result = computeAvailability([still(hoursAgo(30)), gone(hoursAgo(2)), still(hoursAgo(20))], NOW);

    expect(result.lastConfirmedAt).toEqual(hoursAgo(20));
  });

  it("counts only the most recent vote of a user: still then gone makes a single gone vote", () => {
    const result = computeAvailability([still(hoursAgo(26), 1), gone(hoursAgo(1), 1)], NOW);

    expect(result).toEqual({
      status: AvailabilityStatusEnum.MAYBE_GONE,
      lastConfirmedAt: hoursAgo(26),
      recentVoterCount: 1,
    });
  });

  it("counts only the most recent vote of a user whatever the order of the list", () => {
    const result = computeAvailability([gone(hoursAgo(1), 1), still(hoursAgo(26), 1)], NOW);

    expect(result.status).toBe(AvailabilityStatusEnum.MAYBE_GONE);
    expect(result.recentVoterCount).toBe(1);
  });

  it("does not turn two votes of one user into a confirmation", () => {
    const result = computeAvailability([still(hoursAgo(50), 1), still(hoursAgo(10), 1)], NOW);

    expect(result.status).toBe(AvailabilityStatusEnum.UNKNOWN);
    expect(result.recentVoterCount).toBe(1);
  });

  it("keeps the votes of different users apart", () => {
    const result = computeAvailability([still(hoursAgo(50), 1), still(hoursAgo(10), 1), still(hoursAgo(5), 2)], NOW);

    expect(result.status).toBe(AvailabilityStatusEnum.CONFIRMED);
    expect(result.recentVoterCount).toBe(2);
  });

  it("treats every vote without user as a distinct voter", () => {
    const result = computeAvailability([still(hoursAgo(3)), still(hoursAgo(2)), still(hoursAgo(1))], NOW);

    expect(result.status).toBe(AvailabilityStatusEnum.CONFIRMED);
    expect(result.recentVoterCount).toBe(3);
  });

  it("does not change the votes it is given", () => {
    const votes = [gone(hoursAgo(1), 1), still(hoursAgo(26), 1), still(hoursAgo(3))];
    const before = JSON.stringify(votes);

    computeAvailability(votes, NOW);

    expect(JSON.stringify(votes)).toBe(before);
  });

  it("gives the seeded status back for the 325 links of the starting data", () => {
    const mismatches = venueBeersSeed.filter((row) => {
      const votes = buildSeedVotes(row, SEED_LINK_ID, NOW);
      return computeAvailability(votes, NOW).status !== row.status;
    });

    expect(venueBeersSeed).toHaveLength(SEEDED_LINK_COUNT);
    expect(mismatches).toEqual([]);
  });

  it("gives the seeded last confirmation back for every link that has a still vote", () => {
    const mismatches = venueBeersSeed.filter((row) => {
      const { lastConfirmedAt } = computeAvailability(buildSeedVotes(row, SEED_LINK_ID, NOW), NOW);
      const expected =
        row.positiveVotes > 0 && row.lastConfirmedDaysAgo !== null
          ? new Date(NOW.getTime() - Math.round(row.lastConfirmedDaysAgo * DAY_MS))
          : null;
      return (lastConfirmedAt?.getTime() ?? null) !== (expected?.getTime() ?? null);
    });

    expect(mismatches).toEqual([]);
  });
});

describe("pickBestStatus", () => {
  it("is unknown for an empty list", () => {
    expect(pickBestStatus([])).toBe(AvailabilityStatusEnum.UNKNOWN);
  });

  it("ranks confirmed above maybe gone above unknown above gone", () => {
    const { CONFIRMED, MAYBE_GONE, UNKNOWN, GONE } = AvailabilityStatusEnum;

    expect(pickBestStatus([GONE, UNKNOWN, MAYBE_GONE, CONFIRMED])).toBe(CONFIRMED);
    expect(pickBestStatus([GONE, UNKNOWN, MAYBE_GONE])).toBe(MAYBE_GONE);
    expect(pickBestStatus([GONE, UNKNOWN])).toBe(UNKNOWN);
    expect(pickBestStatus([GONE, GONE])).toBe(GONE);
  });
});

describe("computeNextVoteAt", () => {
  const ALICE = 1;
  const BOB = 2;

  it("is the latest vote of the user plus 24 hours when it lies in the future", () => {
    expect(computeNextVoteAt([still(hoursAgo(3), ALICE)], ALICE, NOW)).toEqual(new Date(NOW.getTime() + 21 * HOUR_MS));
  });

  it("uses the most recent of several votes of the user", () => {
    const votes = [gone(hoursAgo(20), ALICE), still(hoursAgo(2), ALICE), still(hoursAgo(10), ALICE)];

    expect(computeNextVoteAt(votes, ALICE, NOW)).toEqual(new Date(NOW.getTime() + 22 * HOUR_MS));
  });

  it("ignores the votes of other users and the votes without user, even newer ones", () => {
    const votes = [still(hoursAgo(30), ALICE), still(hoursAgo(1), BOB), gone(hoursAgo(1))];

    expect(computeNextVoteAt(votes, ALICE, NOW)).toBeNull();
  });

  it("is null when the user has not voted", () => {
    expect(computeNextVoteAt([], ALICE, NOW)).toBeNull();
  });

  it("is null when the last vote is exactly 24 hours old", () => {
    expect(computeNextVoteAt([still(hoursAgo(24), ALICE)], ALICE, NOW)).toBeNull();
  });

  it("is still set one minute before the 24 hours elapse", () => {
    const votedAt = new Date(NOW.getTime() - 24 * HOUR_MS + 60_000);

    expect(computeNextVoteAt([still(votedAt, ALICE)], ALICE, NOW)).toEqual(new Date(NOW.getTime() + 60_000));
  });
});
