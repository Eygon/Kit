import { describe, expect, it } from "vitest";
import { buildDemoCorrectionRows } from "@/database/seed/correction-seed";
import type { DemoCorrectionSeedRow } from "@/database/seed/correction-seed";
import demoCorrectionsSeed from "@/database/seed/data/demo-corrections.json";
import { ALICE_USER_ID, BOB_USER_ID, CAROL_USER_ID } from "@/database/seed.constants";
import { CORRECTION_VOTE_DURATION_MS } from "@/modules/beers/beers.constants";
import { CorrectionStatusEnum } from "@/modules/beers/enums/correction-status.enum";
import { CorrectionVoteSenseEnum } from "@/modules/beers/enums/correction-vote-sense.enum";

const HOUR_MS = 3_600_000;
const NOW = new Date("2026-10-15T12:00:00.000Z");
const BEER_IDS = new Map([
  ["chimay bleue", 1],
  ["orval", 2],
  ["duvel", 3],
  ["la chouffe", 4],
  ["westmalle tripel", 5],
  ["leffe blonde", 6],
]);
const USER_IDS = new Map([
  ["Alice", ALICE_USER_ID],
  ["Bob", BOB_USER_ID],
  ["Carol", CAROL_USER_ID],
]);
const OPEN_ROW = {
  beerName: "Orval",
  characteristic: "ebc",
  proposedValue: 20,
  reason: "Robe cuivrée",
  proposedBy: "Carol",
  closesInHours: 96,
  status: "open",
  votes: [{ userName: "Bob", sense: "disagree" }],
};
const CLOSED_ROW = {
  beerName: "Leffe Blonde",
  characteristic: "abv",
  proposedValue: 7.5,
  reason: "Plus forte",
  proposedBy: "Carol",
  resolvedHoursAgo: 24,
  status: "rejected",
  previousValue: 6.6,
  votes: [],
};

const build = async (rows: readonly DemoCorrectionSeedRow[], beers = BEER_IDS, users = USER_IDS) => {
  return buildDemoCorrectionRows(rows, beers, users, NOW);
};

describe("demo corrections seed data", () => {
  it("holds 4 open proposals by Bob or Carol, one validated and one rejected", () => {
    const byStatus = (status: string) => demoCorrectionsSeed.filter((row) => row.status === status);

    expect(demoCorrectionsSeed).toHaveLength(6);
    expect(byStatus("open")).toHaveLength(4);
    expect(byStatus("open").map((row) => row.proposedBy).every((name) => name === "Bob" || name === "Carol")).toBe(true);
    expect(byStatus("accepted")).toHaveLength(1);
    expect(byStatus("rejected")).toHaveLength(1);
  });

  it("closes one open proposal in less than 24 hours", () => {
    const soon = demoCorrectionsSeed.filter((row) => row.closesInHours !== undefined && row.closesInHours < 24);

    expect(soon).toHaveLength(1);
  });

  it("never lets Alice vote on an open proposal", () => {
    const open = demoCorrectionsSeed.filter((row) => row.status === "open");

    expect(open).toHaveLength(4);
    expect(open.flatMap((row) => row.votes).some((vote) => vote.userName === "Alice")).toBe(false);
  });
});

describe("buildDemoCorrectionRows", () => {
  it("builds an open proposal closing in the given hours, created 7 days before", async () => {
    const { corrections } = await build([OPEN_ROW]);

    expect(corrections).toEqual([
      {
        beerId: 2,
        characteristic: "ebc",
        proposedValue: "20",
        reason: "Robe cuivrée",
        proposedBy: CAROL_USER_ID,
        createdAt: new Date(NOW.getTime() + 96 * HOUR_MS - CORRECTION_VOTE_DURATION_MS),
        closesAt: new Date(NOW.getTime() + 96 * HOUR_MS),
        status: CorrectionStatusEnum.OPEN,
        resolvedAt: null,
        previousValue: null,
      },
    ]);
  });

  it("closes at the load time a proposal that names neither a closing delay nor a resolution", async () => {
    const { corrections } = await build([{ ...OPEN_ROW, closesInHours: undefined }]);

    expect(corrections[0].closesAt).toEqual(NOW);
  });

  it("builds a closed proposal resolved in the past with its previous value", async () => {
    const { corrections } = await build([CLOSED_ROW]);

    const resolvedAt = new Date(NOW.getTime() - 24 * HOUR_MS);
    expect(corrections).toEqual([
      {
        beerId: 6,
        characteristic: "abv",
        proposedValue: "7.5",
        reason: "Plus forte",
        proposedBy: CAROL_USER_ID,
        createdAt: new Date(resolvedAt.getTime() - CORRECTION_VOTE_DURATION_MS),
        closesAt: resolvedAt,
        status: CorrectionStatusEnum.REJECTED,
        resolvedAt,
        previousValue: "6.6",
      },
    ]);
  });

  it("stores a previous value not filled in as the string null and a list as JSON", async () => {
    const { corrections } = await build([
      { ...CLOSED_ROW, beerName: "Westmalle Tripel", characteristic: "formats", proposedValue: ["bottle", "can"], status: "accepted", previousValue: null },
    ]);

    expect(corrections[0].previousValue).toBe("null");
    expect(corrections[0].proposedValue).toBe('["bottle","can"]');
    expect(corrections[0].status).toBe(CorrectionStatusEnum.ACCEPTED);
  });

  it("links each vote to the index of its proposal, with the user id and the sense", async () => {
    const { votes } = await build([
      OPEN_ROW,
      { ...CLOSED_ROW, votes: [{ userName: "Alice", sense: "agree" }, { userName: "Bob", sense: "disagree" }] },
    ]);

    expect(votes).toEqual([
      { correctionIndex: 0, userId: BOB_USER_ID, sense: CorrectionVoteSenseEnum.DISAGREE, votedAt: expect.any(Date) },
      { correctionIndex: 1, userId: ALICE_USER_ID, sense: CorrectionVoteSenseEnum.AGREE, votedAt: expect.any(Date) },
      { correctionIndex: 1, userId: BOB_USER_ID, sense: CorrectionVoteSenseEnum.DISAGREE, votedAt: expect.any(Date) },
    ]);
  });

  it("dates every vote between the creation and the closing of its proposal, never in the future", async () => {
    const { corrections, votes } = await build([OPEN_ROW, CLOSED_ROW, { ...CLOSED_ROW, votes: [{ userName: "Bob", sense: "agree" }] }]);

    expect(votes).toHaveLength(2);
    for (const vote of votes) {
      const proposal = corrections[vote.correctionIndex];
      expect(vote.votedAt.getTime()).toBeGreaterThan(proposal.createdAt.getTime());
      expect(vote.votedAt.getTime()).toBeLessThanOrEqual(Math.min(proposal.closesAt.getTime(), NOW.getTime()));
    }
  });

  it("builds the six demo proposals and their votes from the seed file", async () => {
    const { corrections, votes } = await build(demoCorrectionsSeed);

    expect(corrections).toHaveLength(6);
    expect(votes).toHaveLength(7);
    expect(corrections.filter((row) => row.status === CorrectionStatusEnum.OPEN).every((row) => row.closesAt > NOW)).toBe(true);
  });

  it("names the beer that is unknown", async () => {
    await expect(build([{ ...OPEN_ROW, beerName: "Inconnue" }])).rejects.toThrow(
      'Demo correction by "Carol" has an unknown beer "Inconnue".',
    );
  });

  it("names the proposer that is unknown", async () => {
    await expect(build([{ ...OPEN_ROW, proposedBy: "Zoe" }])).rejects.toThrow(
      'Demo correction of "Orval" has an unknown user "Zoe".',
    );
  });

  it("names the voter that is unknown", async () => {
    await expect(build([{ ...OPEN_ROW, votes: [{ userName: "Zoe", sense: "agree" }] }])).rejects.toThrow(
      'Demo correction of "Orval" has an unknown user "Zoe".',
    );
  });

  it("refuses a characteristic, a status and a vote sense that do not exist", async () => {
    await expect(build([{ ...OPEN_ROW, characteristic: "color" }])).rejects.toThrow(
      'Demo correction of "Orval" has an unknown characteristic "color".',
    );
    await expect(build([{ ...OPEN_ROW, status: "pending" }])).rejects.toThrow(
      'Demo correction of "Orval" has an unknown status "pending".',
    );
    await expect(build([{ ...OPEN_ROW, votes: [{ userName: "Bob", sense: "maybe" }] }])).rejects.toThrow(
      'Demo correction of "Orval" has an unknown vote sense "maybe".',
    );
  });
});
