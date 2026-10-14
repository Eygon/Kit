import { describe, expect, it } from "vitest";
import venueBeersSeed from "@/database/seed/data/venue-beers.json";
import venuesSeed from "@/database/seed/data/venues.json";
import { buildSeedVotes, buildVenueBeerRows, buildVenueRows } from "@/database/seed/venue-seed";

const BAR_ROW = {
  name: "  Académie de la Bière ",
  type: "bar",
  city: "Paris",
  address: "88 boulevard de Port-Royal, 75005 Paris",
  latitude: 48.8379,
  longitude: 2.3396,
  description: "Un bar.",
};

describe("buildVenueRows", () => {
  it("keeps every field and adds the lowercase trimmed name key", () => {
    expect(buildVenueRows([BAR_ROW])).toEqual([
      {
        name: "  Académie de la Bière ",
        type: "bar",
        city: "Paris",
        address: "88 boulevard de Port-Royal, 75005 Paris",
        latitude: 48.8379,
        longitude: 2.3396,
        description: "Un bar.",
        nameKey: "académie de la bière",
        searchName: "academie de la biere",
        searchCity: "paris",
      },
    ]);
  });

  it("builds the 36 rows of the real file with a recognised type and a name key each", () => {
    const rows = buildVenueRows(venuesSeed);

    expect(rows).toHaveLength(36);
    expect(new Set(rows.map((row: { type: string }) => row.type))).toEqual(new Set(["bar", "shop", "brewery"]));
    expect(new Set(rows.map((row: { nameKey: string }) => row.nameKey)).size).toBe(36);
    expect(rows.map((row: { nameKey: string }) => row.nameKey)).toContain("académie de la bière");
  });

  it("gives the 36 rows of the real file a non empty name search key", () => {
    const rows = buildVenueRows(venuesSeed);

    expect(rows.every((row: { searchName: string }) => row.searchName !== "")).toBe(true);
    expect(rows.map((row: { searchName: string }) => row.searchName)).toContain("academie de la biere");
  });

  it("fails with a message naming the venue and its unknown type", () => {
    expect(() => buildVenueRows([BAR_ROW, { ...BAR_ROW, name: "Chez Nulle Part", type: "cave" }])).toThrow(
      new Error('Venue "Chez Nulle Part" has an unknown type "cave".'),
    );
  });
});

const NOW = new Date("2026-03-15T12:00:00.000Z");
const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const WINDOW_DAYS = 30;
const SEEDED_LINK_COUNT = 325;
const SEEDED_VOTE_COUNT = 2266;

interface VoteLike {
  readonly sense: string;
  readonly votedAt: Date;
  readonly userId: number | null;
  readonly venueBeerId: number;
}

interface LinkRow {
  readonly venueName: string;
  readonly beerName: string;
  readonly status: string;
  readonly lastConfirmedDaysAgo: number | null;
  readonly positiveVotes: number;
  readonly negativeVotes: number;
}

const ageInDays = (vote: VoteLike): number => (NOW.getTime() - vote.votedAt.getTime()) / DAY_MS;

const newest = (votes: readonly VoteLike[]): VoteLike | undefined =>
  [...votes].sort((left, right) => right.votedAt.getTime() - left.votedAt.getTime())[0];

const computeStatus = (votes: readonly VoteLike[]): string => {
  const recent = votes.filter((vote) => ageInDays(vote) <= WINDOW_DAYS);
  const positive = recent.filter((vote) => vote.sense === "still").length;
  const negative = recent.length - positive;
  if (recent.length === 0) {
    return "unknown";
  }
  if (negative >= 2 && negative > positive) {
    return "gone";
  }
  if (newest(recent)?.sense === "gone" || positive === negative) {
    return "maybeGone";
  }
  if (positive >= 2 && positive > negative) {
    return "confirmed";
  }
  return "unknown";
};

const AMENDED_LINK_COUNT = 5;

const isAmendedLink = (row: LinkRow): boolean => row.positiveVotes === 0 && row.lastConfirmedDaysAgo !== null;

const lastConfirmationDaysAgo = (votes: readonly VoteLike[]): number | null => {
  const lastStill = newest(votes.filter((vote) => vote.sense === "still"));
  return lastStill === undefined ? null : Math.round(ageInDays(lastStill));
};

const toLinkRow = (overrides: Partial<LinkRow>): LinkRow => ({
  venueName: "La Fine Mousse",
  beerName: "Saison Dupont",
  status: "confirmed",
  lastConfirmedDaysAgo: 4,
  positiveVotes: 3,
  negativeVotes: 2,
  ...overrides,
});

describe("buildVenueBeerRows", () => {
  const venueIds = new Map([
    ["la fine mousse", 7],
    ["le supercoin", 8],
  ]);
  const beerIds = new Map([
    ["saison dupont", 21],
    ["pietra", 22],
  ]);

  it("resolves the venue and the beer ids from lowercase names and keeps nothing else", () => {
    const rows = buildVenueBeerRows(
      [toLinkRow({}), toLinkRow({ venueName: "Le Supercoin", beerName: "Pietra", status: "unknown" })],
      venueIds,
      beerIds,
    );

    expect(rows).toEqual([
      { venueId: 7, beerId: 21 },
      { venueId: 8, beerId: 22 },
    ]);
  });

  it("fails with a message naming the link and its unknown venue", () => {
    expect(() => buildVenueBeerRows([toLinkRow({ venueName: "Chez Nulle Part" })], venueIds, beerIds)).toThrow(
      new Error('Venue beer "Chez Nulle Part / Saison Dupont" has an unknown venue.'),
    );
  });

  it("fails with a message naming the link and its unknown beer", () => {
    expect(() => buildVenueBeerRows([toLinkRow({ beerName: "Bière Fantôme" })], venueIds, beerIds)).toThrow(
      new Error('Venue beer "La Fine Mousse / Bière Fantôme" has an unknown beer.'),
    );
  });

  it("fails when the status of the link is not an availability status", () => {
    expect(() => buildVenueBeerRows([toLinkRow({ status: "available" })], venueIds, beerIds)).toThrow(
      new Error('Venue beer "La Fine Mousse / Saison Dupont" has an unknown status "available".'),
    );
  });

  it("builds the 325 links of the real file once the names are resolved", () => {
    const venueRows = buildVenueRows(venuesSeed);
    const allVenueIds = new Map(venueRows.map((venue, index) => [venue.name.toLowerCase(), index + 1]));
    const allBeerIds = new Map(
      (venueBeersSeed as LinkRow[]).map((row, index) => [row.beerName.toLowerCase(), index + 1]),
    );

    const rows = buildVenueBeerRows(venueBeersSeed, allVenueIds, allBeerIds);

    expect(rows).toHaveLength(SEEDED_LINK_COUNT);
    expect(new Set(rows.map((row: { venueId: number; beerId: number }) => `${row.venueId}-${row.beerId}`)).size).toBe(
      SEEDED_LINK_COUNT,
    );
  });
});

describe("buildSeedVotes", () => {
  it("returns no vote for an unknown link", () => {
    const votes = buildSeedVotes(
      toLinkRow({ status: "unknown", lastConfirmedDaysAgo: null, positiveVotes: 0, negativeVotes: 0 }),
      5,
      NOW,
    );

    expect(votes).toEqual([]);
  });

  it("dates a confirmed link: still votes spread inside the window from L days, gone votes older", () => {
    const votes: VoteLike[] = buildSeedVotes(toLinkRow({ lastConfirmedDaysAgo: 4 }), 5, NOW);

    const stills = votes.filter((vote) => vote.sense === "still");
    const gones = votes.filter((vote) => vote.sense === "gone");
    expect(stills).toHaveLength(3);
    expect(gones).toHaveLength(2);
    expect(newest(stills)?.votedAt).toEqual(new Date(NOW.getTime() - 4 * DAY_MS));
    expect(stills.every((vote) => ageInDays(vote) <= WINDOW_DAYS)).toBe(true);
    expect(gones.map((vote) => vote.votedAt)).toEqual([
      new Date(NOW.getTime() - 4 * DAY_MS - HOUR_MS),
      new Date(NOW.getTime() - 4 * DAY_MS - 2 * HOUR_MS),
    ]);
    expect(computeStatus(votes)).toBe("confirmed");
  });

  it("gives every vote the link id and no user", () => {
    const votes: VoteLike[] = buildSeedVotes(toLinkRow({}), 42, NOW);

    expect(votes.every((vote) => vote.venueBeerId === 42 && vote.userId === null)).toBe(true);
    expect(votes.every((vote) => vote.votedAt instanceof Date)).toBe(true);
  });

  it("dates a maybeGone link: the newest vote is a gone vote inside the window, the others are outside", () => {
    const votes: VoteLike[] = buildSeedVotes(
      toLinkRow({ status: "maybeGone", lastConfirmedDaysAgo: 23, positiveVotes: 5, negativeVotes: 1 }),
      5,
      NOW,
    );

    const stills = votes.filter((vote) => vote.sense === "still");
    expect(newest(votes)?.sense).toBe("gone");
    expect(ageInDays(newest(votes) as VoteLike)).toBeLessThanOrEqual(WINDOW_DAYS);
    expect(stills.filter((vote) => ageInDays(vote) <= WINDOW_DAYS)).toHaveLength(1);
    expect(newest(stills)?.votedAt).toEqual(new Date(NOW.getTime() - 23 * DAY_MS));
    expect(computeStatus(votes)).toBe("maybeGone");
  });

  it("dates a gone link: no still vote inside the window, the gone votes inside", () => {
    const votes: VoteLike[] = buildSeedVotes(
      toLinkRow({ status: "gone", lastConfirmedDaysAgo: 41, positiveVotes: 2, negativeVotes: 3 }),
      5,
      NOW,
    );

    expect(votes.filter((vote) => vote.sense === "still" && ageInDays(vote) <= WINDOW_DAYS)).toEqual([]);
    expect(votes.filter((vote) => vote.sense === "gone").map(ageInDays)).toEqual([1, 3, 5]);
    expect(computeStatus(votes)).toBe("gone");
  });

  it("builds exactly 2266 votes for the 325 links of the real file with exact P and N per link", () => {
    const perLink: VoteLike[][] = (venueBeersSeed as LinkRow[]).map((row, index) =>
      buildSeedVotes(row, index + 1, NOW),
    );

    expect(perLink.flat()).toHaveLength(SEEDED_VOTE_COUNT);
    (venueBeersSeed as LinkRow[]).forEach((row, index) => {
      const votes = perLink[index];
      expect(votes.filter((vote) => vote.sense === "still")).toHaveLength(row.positiveVotes);
      expect(votes.filter((vote) => vote.sense === "gone")).toHaveLength(row.negativeVotes);
      expect(votes.every((vote) => vote.userId === null)).toBe(true);
    });
  });

  it("reproduces the file status of every one of the 325 links", () => {
    const statusCounts = new Map<string, number>();

    (venueBeersSeed as LinkRow[]).forEach((row, index) => {
      const votes: VoteLike[] = buildSeedVotes(row, index + 1, NOW);

      expect(computeStatus(votes)).toBe(row.status);
      statusCounts.set(row.status, (statusCounts.get(row.status) ?? 0) + 1);
    });

    expect(Object.fromEntries(statusCounts)).toEqual({ confirmed: 227, maybeGone: 32, gone: 24, unknown: 42 });
  });

  it("puts the last confirmation of the 320 other links at lastConfirmedDaysAgo", () => {
    const otherLinks = (venueBeersSeed as LinkRow[]).filter((row) => !isAmendedLink(row));

    expect(otherLinks).toHaveLength(SEEDED_LINK_COUNT - AMENDED_LINK_COUNT);
    (venueBeersSeed as LinkRow[]).forEach((row, index) => {
      if (isAmendedLink(row)) {
        return;
      }
      const votes: VoteLike[] = buildSeedVotes(row, index + 1, NOW);

      expect(lastConfirmationDaysAgo(votes)).toBe(row.lastConfirmedDaysAgo);
    });
  });

  it("amended AC2: the 5 gone links without a positive vote have no last confirmation despite their lastConfirmedDaysAgo", () => {
    const amendedLinks = (venueBeersSeed as LinkRow[]).filter(isAmendedLink);

    expect(amendedLinks).toHaveLength(AMENDED_LINK_COUNT);
    amendedLinks.forEach((row) => {
      const votes: VoteLike[] = buildSeedVotes(row, 1, NOW);

      expect(row.status).toBe("gone");
      expect(row.lastConfirmedDaysAgo).not.toBeNull();
      expect(votes.filter((vote) => vote.sense === "still")).toEqual([]);
      expect(lastConfirmationDaysAgo(votes)).toBeNull();
    });
  });
});
