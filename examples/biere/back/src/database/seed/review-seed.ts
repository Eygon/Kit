import { BOB_USER_ID, CAROL_USER_ID } from "@/database/seed.constants";
import type { Review } from "@/modules/beers/entities/review.entity";
import { DAY_MS } from "@/modules/venues/venues.constants";

export interface ReviewSeedRow {
  readonly userName: string;
  readonly beerName: string;
  readonly rating: number;
  readonly text: string;
  readonly sweetness: number | null;
  readonly acidity: number | null;
  readonly body: number | null;
  readonly daysAgo: number;
}

export type ReviewInsertRow = Omit<Review, "id">;

const USER_IDS_BY_NAME: Readonly<Record<string, number>> = { Bob: BOB_USER_ID, Carol: CAROL_USER_ID };

const findUserId = (row: ReviewSeedRow): number => {
  if (!Object.hasOwn(USER_IDS_BY_NAME, row.userName)) {
    throw new Error(`Review of "${row.beerName}" has an unknown user "${row.userName}".`);
  }
  return USER_IDS_BY_NAME[row.userName];
};

const findBeerId = (ids: ReadonlyMap<string, number>, row: ReviewSeedRow): number => {
  const id = ids.get(row.beerName.toLowerCase());
  if (id === undefined) {
    throw new Error(`Review by "${row.userName}" has an unknown beer "${row.beerName}".`);
  }
  return id;
};

export const buildReviewRows = (
  rows: readonly ReviewSeedRow[],
  beerIdsByName: ReadonlyMap<string, number>,
  now: Date,
): ReviewInsertRow[] =>
  rows.map((row) => {
    const reviewedAt = new Date(now.getTime() - row.daysAgo * DAY_MS);
    return {
      userId: findUserId(row),
      beerId: findBeerId(beerIdsByName, row),
      rating: row.rating,
      text: row.text,
      sweetness: row.sweetness,
      acidity: row.acidity,
      body: row.body,
      createdAt: reviewedAt,
      updatedAt: reviewedAt,
    };
  });
