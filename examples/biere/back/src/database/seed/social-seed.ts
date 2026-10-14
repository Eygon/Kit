import { BOB_USER_ID, CAROL_USER_ID, SEED_DEMO_FOLLOWS } from "@/database/seed.constants";
import { isBeerFormat } from "@/modules/beers/enums/beer-format.enum";
import type { Follow } from "@/modules/social/entities/follow.entity";
import type { Checkin } from "@/modules/tastings/entities/checkin.entity";
import { DAY_MS } from "@/modules/venues/venues.constants";

export interface DemoCheckinSeedRow {
  readonly userName: string;
  readonly beerName: string;
  readonly place: string;
  readonly rating: number | null;
  readonly format: string;
  readonly daysAgo: number;
}

export type DemoCheckinInsertRow = Omit<Checkin, "id" | "createdAt">;

export type DemoFollowInsertRow = Omit<Follow, "id" | "createdAt">;

const USER_IDS_BY_NAME: Readonly<Record<string, number>> = { Bob: BOB_USER_ID, Carol: CAROL_USER_ID };

const findUserId = (row: DemoCheckinSeedRow): number => {
  if (!Object.hasOwn(USER_IDS_BY_NAME, row.userName)) {
    throw new Error(`Demo tasting of "${row.beerName}" has an unknown user "${row.userName}".`);
  }
  return USER_IDS_BY_NAME[row.userName];
};

const findBeerId = (ids: ReadonlyMap<string, number>, row: DemoCheckinSeedRow): number => {
  const id = ids.get(row.beerName.toLowerCase());
  if (id === undefined) {
    throw new Error(`Demo tasting by "${row.userName}" has an unknown beer "${row.beerName}".`);
  }
  return id;
};

const findFormat = (row: DemoCheckinSeedRow): Checkin["format"] => {
  if (!isBeerFormat(row.format)) {
    throw new Error(`Demo tasting of "${row.beerName}" has an unknown format "${row.format}".`);
  }
  return row.format;
};

export const buildDemoCheckinRows = (
  rows: readonly DemoCheckinSeedRow[],
  beerIdsByName: ReadonlyMap<string, number>,
  venueIdsByName: ReadonlyMap<string, number>,
  now: Date,
): DemoCheckinInsertRow[] =>
  rows.map((row) => ({
    userId: findUserId(row),
    beerId: findBeerId(beerIdsByName, row),
    drankAt: new Date(now.getTime() - row.daysAgo * DAY_MS),
    place: row.place,
    venueId: venueIdsByName.get(row.place) ?? null,
    rating: row.rating,
    aromas: [],
    format: findFormat(row),
    price: null,
    comment: "",
    photoId: null,
  }));

export const buildDemoFollowRows = (): DemoFollowInsertRow[] => SEED_DEMO_FOLLOWS.map((follow) => ({ ...follow }));
