import { getRepositoryToken } from "@nestjs/typeorm";
import { Test } from "@nestjs/testing";
import { DataSource } from "typeorm";
import type { Repository } from "typeorm";
import { describe, expect, it } from "vitest";
import { AppConfigModule } from "@/config/app-config.module";
import { APP_CONFIG } from "@/config/app-config.constants";
import { DataSeeder } from "@/database/data-seeder";
import { DatabaseModule } from "@/database/database.module";
import { Beer } from "@/modules/beers/entities/beer.entity";
import { BeerStyle } from "@/modules/beers/entities/beer-style.entity";
import { Brewery } from "@/modules/beers/entities/brewery.entity";
import { BeerCorrection } from "@/modules/beers/entities/beer-correction.entity";
import { BeerCorrectionVote } from "@/modules/beers/entities/beer-correction-vote.entity";
import { Review } from "@/modules/beers/entities/review.entity";
import { Follow } from "@/modules/social/entities/follow.entity";
import { Checkin } from "@/modules/tastings/entities/checkin.entity";
import { AvailabilityVote } from "@/modules/venues/entities/availability-vote.entity";
import { VenueBeer } from "@/modules/venues/entities/venue-beer.entity";
import { Venue } from "@/modules/venues/entities/venue.entity";
import { TEST_CONFIG } from "@/__tests__/support/test-config";

describe("DatabaseModule", () => {
  it("opens the configured SQLite database and provides the seeder", async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppConfigModule, DatabaseModule] })
      .overrideProvider(APP_CONFIG)
      .useValue(TEST_CONFIG)
      .compile();

    const dataSource = moduleRef.get(DataSource);
    expect(dataSource.isInitialized).toBe(true);
    expect(dataSource.options).toMatchObject({ type: "better-sqlite3", database: ":memory:" });
    expect(moduleRef.get(DataSeeder)).toBeInstanceOf(DataSeeder);

    await moduleRef.close();
  });

  it("registers the beer, beer style and brewery repositories", async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppConfigModule, DatabaseModule] })
      .overrideProvider(APP_CONFIG)
      .useValue(TEST_CONFIG)
      .compile();

    expect(moduleRef.get(getRepositoryToken(BeerStyle))).toBeDefined();
    expect(moduleRef.get(getRepositoryToken(Brewery))).toBeDefined();
    expect(moduleRef.get(getRepositoryToken(Beer))).toBeDefined();

    await moduleRef.close();
  });

  it("creates the venues table and registers its repository", async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppConfigModule, DatabaseModule] })
      .overrideProvider(APP_CONFIG)
      .useValue(TEST_CONFIG)
      .compile();

    const dataSource = moduleRef.get(DataSource);
    const tables = await dataSource.query("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'venues'");
    expect(tables).toEqual([{ name: "venues" }]);
    expect(moduleRef.get<Repository<Venue>>(getRepositoryToken(Venue))).toBeDefined();

    await moduleRef.close();
  });

  it("creates the venue_beers and availability_votes tables and registers their repositories", async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppConfigModule, DatabaseModule] })
      .overrideProvider(APP_CONFIG)
      .useValue(TEST_CONFIG)
      .compile();

    const dataSource = moduleRef.get(DataSource);
    const tables = await dataSource.query(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('venue_beers', 'availability_votes') ORDER BY name",
    );
    expect(tables).toEqual([{ name: "availability_votes" }, { name: "venue_beers" }]);
    expect(moduleRef.get<Repository<VenueBeer>>(getRepositoryToken(VenueBeer))).toBeDefined();
    expect(moduleRef.get<Repository<AvailabilityVote>>(getRepositoryToken(AvailabilityVote))).toBeDefined();

    await moduleRef.close();
  });
  it("creates the reviews table and registers its repository", async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppConfigModule, DatabaseModule] })
      .overrideProvider(APP_CONFIG)
      .useValue(TEST_CONFIG)
      .compile();

    const dataSource = moduleRef.get(DataSource);
    const tables = await dataSource.query("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'reviews'");
    expect(tables).toEqual([{ name: "reviews" }]);
    expect(moduleRef.get<Repository<Review>>(getRepositoryToken(Review))).toBeDefined();

    await moduleRef.close();
  });

  it("creates the checkins and follows tables and registers their repositories", async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppConfigModule, DatabaseModule] })
      .overrideProvider(APP_CONFIG)
      .useValue(TEST_CONFIG)
      .compile();

    const dataSource = moduleRef.get(DataSource);
    const tables = await dataSource.query(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('checkins', 'follows') ORDER BY name",
    );
    expect(tables).toEqual([{ name: "checkins" }, { name: "follows" }]);
    expect(moduleRef.get<Repository<Checkin>>(getRepositoryToken(Checkin))).toBeDefined();
    expect(moduleRef.get<Repository<Follow>>(getRepositoryToken(Follow))).toBeDefined();

    await moduleRef.close();
  });

  it("creates the beer_corrections and beer_correction_votes tables and registers their repositories", async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppConfigModule, DatabaseModule] })
      .overrideProvider(APP_CONFIG)
      .useValue(TEST_CONFIG)
      .compile();

    const dataSource = moduleRef.get(DataSource);
    const tables = await dataSource.query(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('beer_corrections', 'beer_correction_votes') ORDER BY name",
    );
    expect(tables).toEqual([{ name: "beer_correction_votes" }, { name: "beer_corrections" }]);
    expect(moduleRef.get<Repository<BeerCorrection>>(getRepositoryToken(BeerCorrection))).toBeDefined();
    expect(moduleRef.get<Repository<BeerCorrectionVote>>(getRepositoryToken(BeerCorrectionVote))).toBeDefined();

    await moduleRef.close();
  });
});
