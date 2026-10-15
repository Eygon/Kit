import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { Test } from "@nestjs/testing";
import type { TestingModule } from "@nestjs/testing";
import { DataSource, IsNull } from "typeorm";
import type { Repository } from "typeorm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APP_CONFIG } from "@/config/app-config.constants";
import { DataSeeder } from "@/database/data-seeder";
import { ALICE_USER_ID, BOB_USER_ID, CAROL_USER_ID, SEED_VOTE_BATCH_SIZE } from "@/database/seed.constants";
import beersSeed from "@/database/seed/data/beers.json";
import demoCheckinsSeed from "@/database/seed/data/demo-checkins.json";
import breweriesSeed from "@/database/seed/data/breweries.json";
import reviewsSeed from "@/database/seed/data/reviews.json";
import venueBeersSeed from "@/database/seed/data/venue-beers.json";
import venuesSeed from "@/database/seed/data/venues.json";
import stylesSeed from "@/database/seed/data/styles.json";
import { BeerCharacteristicEnum } from "@/modules/beers/enums/beer-characteristic.enum";
import { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";
import { Beer } from "@/modules/beers/entities/beer.entity";
import { BeerStyle } from "@/modules/beers/entities/beer-style.entity";
import { Brewery } from "@/modules/beers/entities/brewery.entity";
import { BeerFormatEnum } from "@/modules/beers/enums/beer-format.enum";
import { BeerCorrection } from "@/modules/beers/entities/beer-correction.entity";
import { BeerCorrectionVote } from "@/modules/beers/entities/beer-correction-vote.entity";
import { CorrectionStatusEnum } from "@/modules/beers/enums/correction-status.enum";
import { CorrectionVoteSenseEnum } from "@/modules/beers/enums/correction-vote-sense.enum";
import { Review } from "@/modules/beers/entities/review.entity";
import { Follow } from "@/modules/social/entities/follow.entity";
import { Checkin } from "@/modules/tastings/entities/checkin.entity";
import { User } from "@/modules/users/entities/user.entity";
import { AvailabilityVote } from "@/modules/venues/entities/availability-vote.entity";
import { VenueBeer } from "@/modules/venues/entities/venue-beer.entity";
import { Venue } from "@/modules/venues/entities/venue.entity";
import { VoteSenseEnum } from "@/modules/venues/enums/vote-sense.enum";
import { TEST_CONFIG } from "@/__tests__/support/test-config";
import { inMemoryDatabase } from "@/__tests__/support/test-database";

const SEEDED_STYLE_COUNT = 34;
const SEEDED_BREWERY_COUNT = 70;
const SEEDED_BEER_COUNT = 120;
const SEEDED_VENUE_COUNT = 36;
const SEEDED_LINK_COUNT = 325;
const SEEDED_VOTE_COUNT = 2266;
const SEEDED_REVIEW_COUNT = reviewsSeed.length;
const LOAD_TIME = new Date("2026-03-15T12:00:00.000Z");
const DAY_MS = 86_400_000;
const WINDOW_DAYS = 30;
const BOB_DEMO_COUNT = 10;
const CAROL_DEMO_COUNT = 11;
const appConfig = { ...TEST_CONFIG };

interface StoredVote {
  readonly sense: string;
  readonly votedAt: Date;
}

const ageInDays = (votedAt: Date): number => (LOAD_TIME.getTime() - votedAt.getTime()) / DAY_MS;

const newestVote = <T extends StoredVote>(candidates: readonly T[]): T | undefined =>
  [...candidates].sort((left, right) => right.votedAt.getTime() - left.votedAt.getTime())[0];

const computeStoredStatus = (candidates: readonly StoredVote[]): string => {
  const recent = candidates.filter((vote) => ageInDays(vote.votedAt) <= WINDOW_DAYS);
  const positive = recent.filter((vote) => vote.sense === "still").length;
  const negative = recent.length - positive;
  if (recent.length === 0) {
    return "unknown";
  }
  if (negative >= 2 && negative > positive) {
    return "gone";
  }
  if (newestVote(recent)?.sense === "gone" || positive === negative) {
    return "maybeGone";
  }
  if (positive >= 2 && positive > negative) {
    return "confirmed";
  }
  return "unknown";
};

describe("DataSeeder", () => {
  let moduleRef: TestingModule;
  let users: Repository<User>;
  let styles: Repository<BeerStyle>;
  let breweries: Repository<Brewery>;
  let beers: Repository<Beer>;
  let venues: Repository<Venue>;
  let venueBeers: Repository<VenueBeer>;
  let votes: Repository<AvailabilityVote>;
  let reviews: Repository<Review>;
  let checkins: Repository<Checkin>;
  let follows: Repository<Follow>;
  let corrections: Repository<BeerCorrection>;
  let correctionVotes: Repository<BeerCorrectionVote>;

  beforeEach(async () => {
    Object.assign(appConfig, TEST_CONFIG);
    moduleRef = await Test.createTestingModule({
      imports: [inMemoryDatabase(), TypeOrmModule.forFeature([User, BeerStyle, Brewery, Beer, Venue, VenueBeer, AvailabilityVote, Review, Checkin, Follow, BeerCorrection, BeerCorrectionVote])],
      providers: [DataSeeder, { provide: APP_CONFIG, useValue: appConfig }],
    }).compile();
    users = moduleRef.get<Repository<User>>(getRepositoryToken(User));
    styles = moduleRef.get<Repository<BeerStyle>>(getRepositoryToken(BeerStyle));
    breweries = moduleRef.get<Repository<Brewery>>(getRepositoryToken(Brewery));
    beers = moduleRef.get<Repository<Beer>>(getRepositoryToken(Beer));
    venues = moduleRef.get<Repository<Venue>>(getRepositoryToken(Venue));
    venueBeers = moduleRef.get<Repository<VenueBeer>>(getRepositoryToken(VenueBeer));
    votes = moduleRef.get<Repository<AvailabilityVote>>(getRepositoryToken(AvailabilityVote));
    reviews = moduleRef.get<Repository<Review>>(getRepositoryToken(Review));
    checkins = moduleRef.get<Repository<Checkin>>(getRepositoryToken(Checkin));
    follows = moduleRef.get<Repository<Follow>>(getRepositoryToken(Follow));
    corrections = moduleRef.get<Repository<BeerCorrection>>(getRepositoryToken(BeerCorrection));
    correctionVotes = moduleRef.get<Repository<BeerCorrectionVote>>(getRepositoryToken(BeerCorrectionVote));
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it("inserts Alice, Bob and Carol on bootstrap", async () => {
    await moduleRef.get(DataSeeder).onApplicationBootstrap();

    const seeded = await users.find({ order: { id: "ASC" } });
    expect(seeded.map((user) => user.displayName)).toEqual(["Alice", "Bob", "Carol"]);
    expect(seeded.map((user) => user.avatar)).toEqual(["hop", "malt", "glass"]);
  });

  it("is idempotent", async () => {
    const seeder = moduleRef.get(DataSeeder);

    await seeder.seed();
    await seeder.seed();

    expect(await users.count()).toBe(3);
  });

  it("leaves an already populated table untouched", async () => {
    await users.insert({ id: 10, displayName: "Dave", avatarColor: "#000000" });

    await moduleRef.get(DataSeeder).seed();

    expect(await users.count()).toBe(1);
  });

  it("gives an existing user created without avatar the hop avatar", async () => {
    await users.insert({ id: 10, displayName: "Dave", avatarColor: "#000000" });

    await moduleRef.get(DataSeeder).seed();

    expect((await users.findOneByOrFail({ id: 10 })).avatar).toBe("hop");
  });

  it("loads 34 styles and 70 breweries into an empty database", async () => {
    await moduleRef.get(DataSeeder).onApplicationBootstrap();

    expect(await styles.count()).toBe(SEEDED_STYLE_COUNT);
    expect(await breweries.count()).toBe(SEEDED_BREWERY_COUNT);
    expect(stylesSeed).toHaveLength(SEEDED_STYLE_COUNT);
    expect(breweriesSeed).toHaveLength(SEEDED_BREWERY_COUNT);
  });

  it("gives every style one of the 18 contract families", async () => {
    await moduleRef.get(DataSeeder).seed();

    const families = new Set((await styles.find()).map((style) => style.family));

    expect([...families].every((family) => Object.values(BeerFamilyEnum).includes(family))).toBe(true);
    expect(families.size).toBe(Object.values(BeerFamilyEnum).length);
  });

  it("translates the seed labels Ambrée into amber and Sans alcool into nonAlcoholic", async () => {
    await moduleRef.get(DataSeeder).seed();

    const amberNames = stylesSeed.filter((style) => style.family === "Ambrée").map((style) => style.name);
    const nonAlcoholicNames = stylesSeed.filter((style) => style.family === "Sans alcool").map((style) => style.name);
    const storedAmber = (await styles.findBy({ family: BeerFamilyEnum.AMBER })).map((style) => style.name);
    const storedNonAlcoholic = (await styles.findBy({ family: BeerFamilyEnum.NON_ALCOHOLIC })).map(
      (style) => style.name,
    );

    expect(amberNames.length).toBeGreaterThan(0);
    expect(nonAlcoholicNames.length).toBeGreaterThan(0);
    expect(storedAmber.sort()).toEqual([...amberNames].sort());
    expect(storedNonAlcoholic.sort()).toEqual([...nonAlcoholicNames].sort());
  });

  it("keeps 34 styles and 70 breweries when the load is replayed", async () => {
    const seeder = moduleRef.get(DataSeeder);

    await seeder.seed();
    const stylesBefore = await styles.find({ order: { id: "ASC" } });
    await seeder.seed();

    expect(await styles.count()).toBe(SEEDED_STYLE_COUNT);
    expect(await breweries.count()).toBe(SEEDED_BREWERY_COUNT);
    expect(await styles.find({ order: { id: "ASC" } })).toEqual(stylesBefore);
  });

  it("does not modify a styles table already populated by something else", async () => {
    await styles.insert({
      name: "Style maison",
      family: BeerFamilyEnum.STOUT,
      description: "Déjà là.",
      ebcMin: 30,
      ebcMax: 60,
      ibuMin: 20,
      ibuMax: 40,
      abvMin: 4,
      abvMax: 7,
    });
    const before = await styles.find();

    await expect(moduleRef.get(DataSeeder).seed()).rejects.toThrow(/Chimay Rouge/);

    expect(await styles.find()).toEqual(before);
    expect(await breweries.count()).toBe(SEEDED_BREWERY_COUNT);
    expect(await beers.count()).toBe(0);
  });

  it("does not modify a breweries table already populated by something else", async () => {
    await breweries.insert({ name: "Brasserie maison", country: "FR", city: "Lille" });
    const before = await breweries.find();

    await expect(moduleRef.get(DataSeeder).seed()).rejects.toThrow(/Chimay Rouge/);

    expect(await breweries.find()).toEqual(before);
    expect(await styles.count()).toBe(SEEDED_STYLE_COUNT);
    expect(await beers.count()).toBe(0);
  });

  it("loads 120 beers, none without a brewery or a style, into an empty database", async () => {
    await moduleRef.get(DataSeeder).onApplicationBootstrap();

    const seeded = await beers.find({ relations: { brewery: true, style: true } });

    expect(beersSeed).toHaveLength(SEEDED_BEER_COUNT);
    expect(seeded).toHaveLength(SEEDED_BEER_COUNT);
    expect(seeded.every((beer) => beer.brewery !== null && beer.style !== null)).toBe(true);
    expect(seeded.every((beer) => beer.breweryId === beer.brewery.id && beer.styleId === beer.style.id)).toBe(true);
  });

  it("stores Chimay Rouge with its brewery, style, degree, aromas, format and country", async () => {
    await moduleRef.get(DataSeeder).seed();

    const chimay = await beers.findOneOrFail({ where: { name: "Chimay Rouge" }, relations: { brewery: true, style: true } });

    expect(chimay.brewery.name).toBe("Bières de Chimay");
    expect(chimay.style.name).toBe("Dubbel trappiste");
    expect(chimay.abv).toBe(7);
    expect(chimay.aromas).toEqual(["fruity", "caramel", "spicy", "malty"]);
    expect(chimay.formats).toEqual(["bottle"]);
    expect(chimay.country).toBe("BE");
    expect(chimay.ibu).toBeNull();
    expect(chimay.ebc).toBeNull();
  });

  it("stores the search text of Lindemans Pêcheresse without accents", async () => {
    await moduleRef.get(DataSeeder).seed();

    const beer = await beers.findOneByOrFail({ name: "Lindemans Pêcheresse" });

    expect(beer.searchText).toBe("lindemans pecheresse brouwerij lindemans");
  });

  it("folds ß into ss in the search text of Erdinger Dunkel", async () => {
    await moduleRef.get(DataSeeder).seed();

    const beer = await beers.findOneByOrFail({ name: "Erdinger Dunkel" });

    expect(beer.searchText).toContain("erdinger weissbrau");
  });

  it("keeps 120 identical beers when the load is replayed", async () => {
    const seeder = moduleRef.get(DataSeeder);

    await seeder.seed();
    const before = await beers.find({ order: { id: "ASC" } });
    await seeder.seed();

    expect(await beers.count()).toBe(SEEDED_BEER_COUNT);
    expect(await beers.find({ order: { id: "ASC" } })).toEqual(before);
  });

  it("does not modify a beers table already populated by something else", async () => {
    await moduleRef.get(DataSeeder).seed();
    await beers.clear();
    const brewery = await breweries.findOneByOrFail({ name: "Bières de Chimay" });
    const style = await styles.findOneByOrFail({ name: "Dubbel trappiste" });
    await beers.insert({
      name: "Bière maison",
      breweryId: brewery.id,
      styleId: style.id,
      abv: 5,
      ibu: null,
      ebc: null,
      description: "Déjà là.",
      aromas: [],
      formats: [],
      country: "BE",
      searchText: "biere maison",
    });
    const before = await beers.find();

    await moduleRef.get(DataSeeder).seed();

    expect(await beers.find()).toEqual(before);
  });

  it("fails with the name of the beer and loads no beer when its brewery is missing", async () => {
    await breweries.insert({ name: "Brasserie maison", country: "FR", city: "Lille" });

    await expect(moduleRef.get(DataSeeder).seed()).rejects.toThrow(/Chimay Rouge/);

    expect(await beers.count()).toBe(0);
  });

  it("loads none of the earlier beers when only the brewery of the last seed beer is missing", async () => {
    const seeder = moduleRef.get(DataSeeder);
    await seeder.seed();
    await beers.clear();
    await breweries.delete({ name: "Grupo Modelo" });

    await expect(seeder.seed()).rejects.toThrow(/Corona Extra/);

    expect(beersSeed.at(-1)?.name).toBe("Corona Extra");
    expect(await beers.count()).toBe(0);
  });

  it("fails with the name of the style and loads nothing when a style family is unknown", async () => {
    const original = stylesSeed[0].family;
    stylesSeed[0].family = "Inconnue";

    try {
      await expect(moduleRef.get(DataSeeder).seed()).rejects.toThrow(new RegExp(`Style "${stylesSeed[0].name}" has an unknown family`));
    } finally {
      stylesSeed[0].family = original;
    }

    expect(await styles.count()).toBe(0);
    expect(await beers.count()).toBe(0);
  });

  it("loads the 36 venues of the file into an empty database", async () => {
    await moduleRef.get(DataSeeder).onApplicationBootstrap();

    expect(await venues.count()).toBe(SEEDED_VENUE_COUNT);
    expect(venuesSeed).toHaveLength(SEEDED_VENUE_COUNT);
  });

  it("spreads the venues over 14 in Paris, 6 in Lyon, 6 in Lille and 10 in Brussels", async () => {
    await moduleRef.get(DataSeeder).seed();

    const cities = (await venues.find()).map((venue) => venue.city);
    const countByCity = (city: string): number => cities.filter((entry) => entry === city).length;
    expect([countByCity("Paris"), countByCity("Lyon"), countByCity("Lille"), countByCity("Bruxelles")]).toEqual([
      14, 6, 6, 10,
    ]);
  });

  it("keeps the type and the coordinates of the file", async () => {
    await moduleRef.get(DataSeeder).seed();

    const first = venuesSeed[0];
    const stored = await venues.findOneByOrFail({ name: first.name });
    expect(stored).toMatchObject({
      type: first.type,
      latitude: first.latitude,
      longitude: first.longitude,
      address: first.address,
    });
    expect(new Set((await venues.find()).map((venue) => venue.type))).toEqual(new Set(["bar", "shop", "brewery"]));
  });

  it("stores each of the 36 venues of the file with its name, type, city, address, coordinates and description", async () => {
    await moduleRef.get(DataSeeder).seed();

    const stored = await venues.find({ order: { id: "ASC" } });

    expect(stored).toHaveLength(SEEDED_VENUE_COUNT);
    stored.forEach((venue, index) => {
      const { name, type, city, address, latitude, longitude, description } = venuesSeed[index];
      expect(venue).toMatchObject({ name, type, city, address, latitude, longitude, description });
    });
  });

  it("fails with the name of the venue and loads no venue when a venue type of the file is unknown", async () => {
    const lastVenue = venuesSeed[venuesSeed.length - 1];
    const original = lastVenue.type;
    lastVenue.type = "cave";

    try {
      await expect(moduleRef.get(DataSeeder).seed()).rejects.toThrow(
        new Error(`Venue "${lastVenue.name}" has an unknown type "cave".`),
      );
    } finally {
      lastVenue.type = original;
    }

    expect(await venues.count()).toBe(0);
    expect(await venueBeers.count()).toBe(0);
  });

  it("keeps 36 venues on a second seed", async () => {
    const seeder = moduleRef.get(DataSeeder);

    await seeder.seed();
    await seeder.seed();

    expect(await venues.count()).toBe(SEEDED_VENUE_COUNT);
  });

  it("leaves an already populated venues table untouched", async () => {
    await venues.insert({
      name: "Le Seul",
      nameKey: "le seul",
      searchName: "le seul",
      searchCity: "",
      type: "bar" as Venue["type"],
      city: null,
      address: "1 rue X",
      latitude: 1,
      longitude: 2,
      description: null,
    });

    const [seedVenue] = await venues.find();
    await venueBeers.insert({ venueId: seedVenue.id, beerId: 1 });

    await moduleRef.get(DataSeeder).seed();

    expect(await venues.count()).toBe(1);
  });

  it("seeds the search keys of every venue on an empty database", async () => {
    await moduleRef.get(DataSeeder).seed();

    const stored = await venues.find();
    const academy = stored.find((venue) => venue.name === "Académie de la Bière");
    expect(academy).toMatchObject({ searchName: "academie de la biere", searchCity: "paris" });
    expect(stored.filter((venue) => venue.searchName === "")).toHaveLength(0);
  });

  describe("search keys catch-up", () => {
    const LEGACY_VENUE_COUNT = 2;
    const UNTOUCHED_SEARCH_NAME = "custom key";

    it("fills the keys of venues with an empty name key and changes nothing else, even on a second start", async () => {
      const seeder = moduleRef.get(DataSeeder);
      await seeder.seed();
      const before = await venues.find({ order: { id: "ASC" } });
      const legacyIds = before.slice(0, LEGACY_VENUE_COUNT).map((venue) => venue.id);
      const untouched = before[LEGACY_VENUE_COUNT];
      await venues.update({ id: untouched.id }, { searchName: UNTOUCHED_SEARCH_NAME, searchCity: "custom city" });
      await venues.update({ id: legacyIds[0] }, { searchName: "", searchCity: "" });
      await venues.update({ id: legacyIds[1] }, { searchName: "", searchCity: "" });
      const linksBefore = await venueBeers.find({ order: { id: "ASC" } });
      const votesBefore = await votes.count();
      const venuesBefore = await venues.find({ order: { id: "ASC" } });
      const usersBefore = await users.find({ order: { id: "ASC" } });
      const stylesBefore = await styles.find({ order: { id: "ASC" } });
      const breweriesBefore = await breweries.find({ order: { id: "ASC" } });
      const beersBefore = await beers.find({ order: { id: "ASC" } });

      await seeder.seed();

      expect(await users.find({ order: { id: "ASC" } })).toEqual(usersBefore);
      expect(await styles.find({ order: { id: "ASC" } })).toEqual(stylesBefore);
      expect(await breweries.find({ order: { id: "ASC" } })).toEqual(breweriesBefore);
      expect(await beers.find({ order: { id: "ASC" } })).toEqual(beersBefore);
      const after = await venues.find({ order: { id: "ASC" } });
      expect(after).toHaveLength(before.length);
      expect(after.filter((venue) => legacyIds.includes(venue.id))).toEqual(
        before.filter((venue) => legacyIds.includes(venue.id)),
      );
      expect(after.filter((venue) => !legacyIds.includes(venue.id))).toEqual(
        venuesBefore.filter((venue) => !legacyIds.includes(venue.id)),
      );
      expect(after.find((venue) => venue.id === untouched.id)?.searchName).toBe(UNTOUCHED_SEARCH_NAME);
      expect(await venueBeers.find({ order: { id: "ASC" } })).toEqual(linksBefore);
      expect(await votes.count()).toBe(votesBefore);

      await seeder.seed();

      expect(await venues.find({ order: { id: "ASC" } })).toEqual(after);
    });

    it("gives an empty city key to a legacy venue without a city", async () => {
      const seeder = moduleRef.get(DataSeeder);
      await seeder.seed();
      const [first] = await venues.find({ order: { id: "ASC" } });
      await venues.update({ id: first.id }, { city: null, name: "Café  Ébène", searchName: "", searchCity: "" });

      await seeder.seed();

      expect(await venues.findOneByOrFail({ id: first.id })).toMatchObject({
        searchName: "cafe ebene",
        searchCity: "",
      });
    });
  });

  it("loads the 325 links of the file, one per venue and beer pair", async () => {
    await moduleRef.get(DataSeeder).onApplicationBootstrap();

    const links = await venueBeers.find();
    expect(venueBeersSeed).toHaveLength(SEEDED_LINK_COUNT);
    expect(links).toHaveLength(SEEDED_LINK_COUNT);
    expect(new Set(links.map((link) => `${link.venueId}-${link.beerId}`)).size).toBe(SEEDED_LINK_COUNT);
  });

  it("gives every link exactly its positive and negative votes, all without a user", async () => {
    await moduleRef.get(DataSeeder).seed();

    const venueIds = new Map((await venues.find()).map((venue) => [venue.name.toLowerCase(), venue.id]));
    const beerIds = new Map((await beers.find()).map((beer) => [beer.name.toLowerCase(), beer.id]));
    const links = await venueBeers.find();
    const allVotes = await votes.find();
    const countFor = (linkId: number, sense: string): number =>
      allVotes.filter((vote) => vote.venueBeerId === linkId && vote.sense === sense).length;
    expect(allVotes).toHaveLength(SEEDED_VOTE_COUNT);
    expect(allVotes.every((vote) => vote.userId === null)).toBe(true);
    for (const row of venueBeersSeed) {
      const link = links.find(
        (entry) =>
          entry.venueId === venueIds.get(row.venueName.toLowerCase()) &&
          entry.beerId === beerIds.get(row.beerName.toLowerCase()),
      );
      expect(link).toBeDefined();
      expect([countFor(link!.id, "still"), countFor(link!.id, "gone")]).toEqual([
        row.positiveVotes,
        row.negativeVotes,
      ]);
    }
  });

  it("inserts the votes in batches of the seed batch size", async () => {
    const insert = vi.spyOn(votes, "insert");

    await moduleRef.get(DataSeeder).seed();

    const batchSizes = insert.mock.calls.map(([rows]) => (rows as unknown[]).length);
    expect(SEED_VOTE_BATCH_SIZE).toBe(200);
    expect(batchSizes.slice(0, -1).every((size) => size === SEED_VOTE_BATCH_SIZE)).toBe(true);
    expect(batchSizes.at(-1)).toBe(SEEDED_VOTE_COUNT % SEED_VOTE_BATCH_SIZE);
    expect(batchSizes.reduce((total, size) => total + size, 0)).toBe(SEEDED_VOTE_COUNT);
  });

  it("dates the votes from the load time", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-03-15T12:00:00.000Z"));

    try {
      await moduleRef.get(DataSeeder).seed();
    } finally {
      vi.useRealTimers();
    }

    const dates = (await votes.find()).map((vote) => new Date(vote.votedAt).getTime());
    expect(Math.max(...dates)).toBeLessThanOrEqual(new Date("2026-03-15T12:00:00.000Z").getTime());
    expect(Math.max(...dates)).toBeGreaterThan(new Date("2026-03-14T12:00:00.000Z").getTime());
  });

  it("stores votes whose recomputed status is the file status for the 325 links and whose last confirmation is at lastConfirmedDaysAgo, absent without positive vote", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(LOAD_TIME);

    try {
      await moduleRef.get(DataSeeder).seed();
    } finally {
      vi.useRealTimers();
    }

    const venueIds = new Map((await venues.find()).map((venue) => [venue.name.toLowerCase(), venue.id]));
    const beerIds = new Map((await beers.find()).map((beer) => [beer.name.toLowerCase(), beer.id]));
    const links = await venueBeers.find();
    const storedVotes = (await votes.find()).map((vote) => ({
      linkId: vote.venueBeerId,
      sense: vote.sense as string,
      votedAt: new Date(vote.votedAt),
    }));
    const statusCounts = new Map<string, number>();

    for (const row of venueBeersSeed) {
      const link = links.find(
        (entry) =>
          entry.venueId === venueIds.get(row.venueName.toLowerCase()) &&
          entry.beerId === beerIds.get(row.beerName.toLowerCase()),
      );
      const linkVotes = storedVotes.filter((vote) => vote.linkId === link!.id);
      const lastStill = newestVote(linkVotes.filter((vote) => vote.sense === "still"));

      expect(computeStoredStatus(linkVotes)).toBe(row.status);
      expect(lastStill === undefined ? null : Math.round(ageInDays(lastStill.votedAt))).toBe(
        row.positiveVotes === 0 ? null : row.lastConfirmedDaysAgo,
      );
      statusCounts.set(row.status, (statusCounts.get(row.status) ?? 0) + 1);
    }

    expect(Object.fromEntries(statusCounts)).toEqual({ confirmed: 227, maybeGone: 32, gone: 24, unknown: 42 });
  });

  it("adds no link and no vote on a second seed", async () => {
    const seeder = moduleRef.get(DataSeeder);

    await seeder.seed();
    await seeder.seed();

    expect(await venueBeers.count()).toBe(SEEDED_LINK_COUNT);
    expect(await votes.count()).toBe(SEEDED_VOTE_COUNT);
  });

  it("leaves an already populated links table untouched", async () => {
    await moduleRef.get(DataSeeder).seed();
    await votes.clear();
    await votes.insert({ venueBeerId: 1, userId: ALICE_USER_ID, sense: VoteSenseEnum.STILL, votedAt: new Date() });

    await moduleRef.get(DataSeeder).seed();

    expect(await venueBeers.count()).toBe(SEEDED_LINK_COUNT);
    expect(await votes.count()).toBe(1);
  });

  it("fails naming the link and loads nothing when a venue of the file is missing", async () => {
    await venues.insert({
      name: "Le Seul",
      nameKey: "le seul",
      searchName: "le seul",
      searchCity: "",
      type: "bar" as Venue["type"],
      city: null,
      address: "1 rue X",
      latitude: 1,
      longitude: 2,
      description: null,
    });
    const first = venueBeersSeed[0];

    await expect(moduleRef.get(DataSeeder).seed()).rejects.toThrow(
      new Error(`Venue beer "${first.venueName} / ${first.beerName}" has an unknown venue.`),
    );

    expect(await venueBeers.count()).toBe(0);
    expect(await votes.count()).toBe(0);
  });
  it("loads the demo reviews of Bob and Carol into an empty database", async () => {
    await moduleRef.get(DataSeeder).onApplicationBootstrap();

    const stored = await reviews.find({ order: { id: "ASC" } });
    const beerIds = new Map((await beers.find()).map((beer) => [beer.name.toLowerCase(), beer.id]));

    expect(stored).toHaveLength(SEEDED_REVIEW_COUNT);
    stored.forEach((review, index) => {
      const { userName, beerName, rating, text, sweetness, acidity, body } = reviewsSeed[index];
      expect(review).toMatchObject({
        userId: userName === "Bob" ? BOB_USER_ID : CAROL_USER_ID,
        beerId: beerIds.get(beerName.toLowerCase()),
        rating,
        text,
        sweetness,
        acidity,
        body,
      });
    });
  });

  it("rates at least 6 beers by both Bob and Carol, including the 5 beers with an IBU", async () => {
    await moduleRef.get(DataSeeder).seed();

    const stored = await reviews.find();
    const beerIdsOf = (userId: number): number[] => stored.filter((review) => review.userId === userId).map((review) => review.beerId);
    const ibuBeerIds = (await beers.find()).filter((beer) => beer.ibu !== null).map((beer) => beer.id);
    const ratedByBoth = beerIdsOf(BOB_USER_ID).filter((beerId) => beerIdsOf(CAROL_USER_ID).includes(beerId));

    expect(ibuBeerIds).toHaveLength(5);
    expect(ratedByBoth.length).toBeGreaterThanOrEqual(6);
    expect(ibuBeerIds.every((beerId) => ratedByBoth.includes(beerId))).toBe(true);
  });

  it("dates every review from 1 to 60 days before the load time", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(LOAD_TIME);

    try {
      await moduleRef.get(DataSeeder).seed();
    } finally {
      vi.useRealTimers();
    }

    const stored = await reviews.find();
    const ages = stored.map((review) => ageInDays(new Date(review.createdAt)));

    expect(stored).toHaveLength(SEEDED_REVIEW_COUNT);
    expect(Math.min(...ages)).toBeCloseTo(Math.min(...reviewsSeed.map((row) => row.daysAgo)), 5);
    expect(Math.max(...ages)).toBeCloseTo(Math.max(...reviewsSeed.map((row) => row.daysAgo)), 5);
    expect(stored.every((review) => review.updatedAt.getTime() === review.createdAt.getTime())).toBe(true);
    expect(ages.every((age) => age >= 1 && age <= 60)).toBe(true);
  });

  it("adds and modifies no review on a second seed", async () => {
    const seeder = moduleRef.get(DataSeeder);

    await seeder.seed();
    const before = await reviews.find({ order: { id: "ASC" } });
    await seeder.seed();

    expect(await reviews.count()).toBe(SEEDED_REVIEW_COUNT);
    expect(await reviews.find({ order: { id: "ASC" } })).toEqual(before);
  });

  it("leaves an already populated reviews table untouched", async () => {
    await moduleRef.get(DataSeeder).seed();
    await reviews.clear();
    await reviews.insert({
      userId: ALICE_USER_ID,
      beerId: 1,
      rating: 3,
      text: "Déjà là.",
      sweetness: null,
      acidity: null,
      body: null,
      createdAt: LOAD_TIME,
      updatedAt: LOAD_TIME,
    });
    const before = await reviews.find();

    await moduleRef.get(DataSeeder).seed();

    expect(await reviews.find()).toEqual(before);
  });

  it("creates no check-in for the demo reviews of Bob and Carol", async () => {
    await moduleRef.get(DataSeeder).onApplicationBootstrap();

    expect(await reviews.count()).toBe(SEEDED_REVIEW_COUNT);
    expect(await checkins.count()).toBe(0);
  });

  describe("community beers sharing the name of an official beer", () => {
    const SHARED_NAMES = ["Orval", reviewsSeed[0].beerName];

    const replayWithCommunityTwins = async (): Promise<number[]> => {
      Object.assign(appConfig, { seedDemoActivity: true });
      await moduleRef.get(DataSeeder).seed();
      const official = await beers.find({ where: { createdBy: IsNull() } });
      const twins = SHARED_NAMES.map((name) => {
        const source = official.find((beer) => beer.name.toLowerCase() === name.toLowerCase());
        if (source === undefined) {
          throw new Error(`${name} is not seeded`);
        }
        return beers.create({
          name: source.name,
          breweryId: source.breweryId,
          styleId: source.styleId,
          abv: source.abv,
          ibu: null,
          ebc: null,
          description: "",
          aromas: [],
          formats: [],
          country: source.country,
          searchText: source.searchText,
          createdBy: ALICE_USER_ID,
          createdAt: LOAD_TIME,
        });
      });
      const inserted = await beers.save(twins);
      await votes.clear();
      await venueBeers.clear();
      await reviews.clear();
      await checkins.clear();
      await moduleRef.get(DataSeeder).seed();
      return inserted.map((beer) => beer.id);
    };

    it("keeps the venue links, the reviews and the demo tastings on the official beers when the seed is replayed", async () => {
      const communityIds = await replayWithCommunityTwins();
      const officialIds = (await beers.find({ where: { createdBy: IsNull() } })).map((beer) => beer.id);

      const links = await venueBeers.find();
      const storedReviews = await reviews.find();
      const storedCheckins = await checkins.find();
      expect(links).toHaveLength(SEEDED_LINK_COUNT);
      expect(storedReviews).toHaveLength(SEEDED_REVIEW_COUNT);
      expect(storedCheckins).toHaveLength(demoCheckinsSeed.length);
      for (const rows of [links, storedReviews, storedCheckins]) {
        expect(rows.every((row) => officialIds.includes(row.beerId))).toBe(true);
        expect(rows.some((row) => communityIds.includes(row.beerId))).toBe(false);
      }
    });

    it("attaches the Orval demo tastings to the official Orval", async () => {
      const [communityOrvalId] = await replayWithCommunityTwins();
      const officialOrval = await beers.findOneByOrFail({ name: "Orval", createdBy: IsNull() });

      const orvalCheckins = await checkins.findBy({ beerId: officialOrval.id });

      expect(orvalCheckins).toHaveLength(demoCheckinsSeed.filter((row) => row.beerName === "Orval").length);
      expect(orvalCheckins.length).toBeGreaterThan(0);
      expect(await checkins.countBy({ beerId: communityOrvalId })).toBe(0);
    });
  });


  describe("demo corrections", () => {
    const HOUR_MS = 3_600_000;
    const SOON_HOURS = 24;

    const enableDemo = (): void => {
      Object.assign(appConfig, { seedDemoActivity: true });
    };

    const beerIdOf = async (name: string): Promise<number> => (await beers.findOneByOrFail({ name, createdBy: IsNull() })).id;

    it("creates no correction and no vote when the demo is off", async () => {
      await moduleRef.get(DataSeeder).seed();

      expect(await corrections.count()).toBe(0);
      expect(await correctionVotes.count()).toBe(0);
    });

    it("seeds 4 open proposals by Bob or Carol on official beers, one of them closing in less than 24 hours", async () => {
      enableDemo();
      const before = Date.now();

      await moduleRef.get(DataSeeder).seed();

      const open = await corrections.findBy({ status: CorrectionStatusEnum.OPEN });
      const officialIds = (await beers.find({ where: { createdBy: IsNull() } })).map((beer) => beer.id);
      expect(open).toHaveLength(4);
      expect(open.every((row) => row.proposedBy === BOB_USER_ID || row.proposedBy === CAROL_USER_ID)).toBe(true);
      expect(open.every((row) => officialIds.includes(row.beerId))).toBe(true);
      expect(open.every((row) => row.closesAt.getTime() > before && row.resolvedAt === null)).toBe(true);
      expect(open.filter((row) => row.closesAt.getTime() - before < SOON_HOURS * HOUR_MS)).toHaveLength(1);
      expect(new Set(open.map((row) => row.createdAt.getTime())).size).toBe(4);
    });

    it("seeds one validated and one rejected proposal, resolved in the past", async () => {
      enableDemo();
      const before = Date.now();

      await moduleRef.get(DataSeeder).seed();

      const accepted = await corrections.findBy({ status: CorrectionStatusEnum.ACCEPTED });
      const rejected = await corrections.findBy({ status: CorrectionStatusEnum.REJECTED });
      expect(accepted).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(accepted[0]).toMatchObject({ characteristic: "body", proposedValue: "4", previousValue: "null", proposedBy: BOB_USER_ID });
      expect(rejected[0]).toMatchObject({ characteristic: "abv", proposedValue: "7.5", previousValue: "6.6", proposedBy: CAROL_USER_ID });
      expect(accepted[0].resolvedAt?.getTime()).toBeLessThan(before);
      expect(rejected[0].resolvedAt?.getTime()).toBeLessThan(before);
    });

    it("applies the validated value to its beer and leaves the beer of the rejected proposal alone", async () => {
      enableDemo();

      await moduleRef.get(DataSeeder).seed();

      expect((await beers.findOneByOrFail({ id: await beerIdOf("Westmalle Tripel") })).body).toBe(4);
      expect((await beers.findOneByOrFail({ id: await beerIdOf("Leffe Blonde") })).abv).toBe(6.6);
      expect((await beers.findOneByOrFail({ id: await beerIdOf("Chimay Bleue") })).ibu).toBeNull();
    });

    it("stores the votes of Bob, Carol and Alice on the right proposals and none by Alice on an open one", async () => {
      enableDemo();

      await moduleRef.get(DataSeeder).seed();

      const stored = await correctionVotes.find();
      const open = await corrections.findBy({ status: CorrectionStatusEnum.OPEN });
      const openIds = open.map((row) => row.id);
      expect(stored).toHaveLength(7);
      expect(stored.filter((vote) => openIds.includes(vote.correctionId))).toHaveLength(3);
      expect(stored.filter((vote) => vote.userId === ALICE_USER_ID && openIds.includes(vote.correctionId))).toHaveLength(0);
      expect(stored.filter((vote) => vote.sense === CorrectionVoteSenseEnum.AGREE)).toHaveLength(4);
      expect(stored.filter((vote) => vote.sense === CorrectionVoteSenseEnum.DISAGREE)).toHaveLength(3);
      expect(stored.every((vote) => vote.votedAt.getTime() <= Date.now())).toBe(true);
      const accepted = await corrections.findOneByOrFail({ status: CorrectionStatusEnum.ACCEPTED });
      expect(stored.filter((vote) => vote.correctionId === accepted.id).map((vote) => vote.userId).sort()).toEqual([ALICE_USER_ID, CAROL_USER_ID]);
    });

    it("attaches each vote to the proposal of the right beer, with the right voter and sense", async () => {
      enableDemo();
      const userNames = new Map([
        [ALICE_USER_ID, "Alice"],
        [BOB_USER_ID, "Bob"],
        [CAROL_USER_ID, "Carol"],
      ]);

      await moduleRef.get(DataSeeder).seed();

      const stored = await correctionVotes.find();
      const proposals = await corrections.find();
      const labels: string[] = [];
      for (const vote of stored) {
        const proposal = proposals.find((candidate) => candidate.id === vote.correctionId);
        if (proposal === undefined) {
          throw new Error(`Vote ${vote.id} points to no proposal.`);
        }
        const beer = await beers.findOneByOrFail({ id: proposal.beerId });
        labels.push(`${beer.name} | ${proposal.characteristic} | ${userNames.get(vote.userId)} | ${vote.sense}`);
      }
      expect(labels.sort()).toEqual([
        "Chimay Bleue | ibu | Carol | agree",
        "La Chouffe | formats | Bob | agree",
        "Leffe Blonde | abv | Alice | disagree",
        "Leffe Blonde | abv | Bob | disagree",
        "Orval | ebc | Bob | disagree",
        "Westmalle Tripel | body | Alice | agree",
        "Westmalle Tripel | body | Carol | agree",
      ]);
    });

    it("adds nothing when the API restarts on an already seeded base", async () => {
      enableDemo();
      const seeder = moduleRef.get(DataSeeder);
      await seeder.seed();
      const storedCorrections = await corrections.find({ order: { id: "ASC" } });
      const storedVotes = await correctionVotes.find({ order: { id: "ASC" } });

      await seeder.seed();

      expect(await corrections.find({ order: { id: "ASC" } })).toEqual(storedCorrections);
      expect(await correctionVotes.find({ order: { id: "ASC" } })).toEqual(storedVotes);
    });

    it("does not seed again once a correction exists", async () => {
      enableDemo();
      await moduleRef.get(DataSeeder).seed();
      await correctionVotes.clear();
      await corrections.clear();
      await corrections.insert({
        beerId: await beerIdOf("Duvel"),
        characteristic: BeerCharacteristicEnum.ABV,
        proposedValue: "8",
        reason: "",
        proposedBy: BOB_USER_ID,
        createdAt: new Date(),
        closesAt: new Date(Date.now() + HOUR_MS),
      });

      await moduleRef.get(DataSeeder).seed();

      expect(await corrections.count()).toBe(1);
      expect(await correctionVotes.count()).toBe(0);
    });
  });

  describe("demo activity", () => {
    const enableDemo = (): void => {
      Object.assign(appConfig, { seedDemoActivity: true });
    };

    const demoCheckin = (userId: number) => ({
      userId,
      beerId: 1,
      drankAt: LOAD_TIME,
      place: "Paris",
      venueId: null,
      rating: null,
      aromas: [],
      format: BeerFormatEnum.DRAFT,
      price: null,
      comment: "",
      photoId: null,
    });

    it("creates no tasting and no follow when the demo is off", async () => {
      await moduleRef.get(DataSeeder).seed();

      expect(await checkins.count()).toBe(0);
      expect(await follows.count()).toBe(0);
    });

    it("gives Bob 10 and Carol 11 tastings dated in the last 30 days when the demo is on", async () => {
      enableDemo();
      const before = Date.now();

      await moduleRef.get(DataSeeder).seed();

      const bob = await checkins.findBy({ userId: BOB_USER_ID });
      const carol = await checkins.findBy({ userId: CAROL_USER_ID });
      expect([bob.length, carol.length]).toEqual([BOB_DEMO_COUNT, CAROL_DEMO_COUNT]);
      expect(await checkins.count()).toBe(demoCheckinsSeed.length);
      expect([...bob, ...carol]).toHaveLength(BOB_DEMO_COUNT + CAROL_DEMO_COUNT);
      for (const { drankAt } of [...bob, ...carol]) {
        const age = (before - drankAt.getTime()) / DAY_MS;
        expect(age).toBeGreaterThanOrEqual(0);
        expect(age).toBeLessThanOrEqual(WINDOW_DAYS);
      }
    });

    it("links each of the 21 demo tastings to the venue named in its text", async () => {
      enableDemo();

      await moduleRef.get(DataSeeder).seed();

      const venueIds = new Map((await venues.find()).map(({ id, name }) => [name, id]));
      const stored = await checkins.find({ order: { id: "ASC" } });
      expect(stored).toHaveLength(demoCheckinsSeed.length);
      expect(venueIds.size).toBe(SEEDED_VENUE_COUNT);
      expect(stored.map(({ place, venueId }) => [place, venueId])).toEqual(
        stored.map(({ place }) => [place, venueIds.get(place)]),
      );
      expect(stored.filter(({ venueId }) => venueId === null)).toEqual([]);
    });

    it("modifies no existing tasting without a venue and links only the tastings it loads", async () => {
      enableDemo();
      const seeder = moduleRef.get(DataSeeder);
      await seeder.seed();
      await checkins.clear();
      await checkins.insert({ ...demoCheckin(BOB_USER_ID), place: venuesSeed[0].name });
      await checkins.insert({ ...demoCheckin(ALICE_USER_ID), place: venuesSeed[1].name });
      const before = await checkins.find({ order: { id: "ASC" } });

      await seeder.seed();

      const after = await checkins.find({ order: { id: "ASC" } });
      expect(before.map(({ venueId }) => venueId)).toEqual([null, null]);
      expect(after.filter(({ userId }) => userId !== CAROL_USER_ID)).toEqual(before);
      expect(after.filter(({ userId }) => userId === CAROL_USER_ID)).toHaveLength(CAROL_DEMO_COUNT);
      expect(after.filter(({ userId }) => userId === CAROL_USER_ID).every(({ venueId }) => venueId !== null)).toBe(true);
    });

    it("makes Alice follow Bob and Carol and gives Alice no tasting", async () => {
      enableDemo();

      await moduleRef.get(DataSeeder).seed();

      const stored = await follows.find({ order: { followedId: "ASC" } });
      expect(stored.map(({ followerId, followedId }) => [followerId, followedId])).toEqual([
        [ALICE_USER_ID, BOB_USER_ID],
        [ALICE_USER_ID, CAROL_USER_ID],
      ]);
      expect(await checkins.countBy({ userId: ALICE_USER_ID })).toBe(0);
    });

    it("duplicates nothing on a second seed", async () => {
      enableDemo();
      const seeder = moduleRef.get(DataSeeder);
      await seeder.seed();
      const before = [await checkins.find({ order: { id: "ASC" } }), await follows.find({ order: { id: "ASC" } })];

      await seeder.seed();

      expect([await checkins.find({ order: { id: "ASC" } }), await follows.find({ order: { id: "ASC" } })]).toEqual(before);
    });

    it("does not reload the tastings of a user who already has some, and still loads the other user", async () => {
      enableDemo();
      await moduleRef.get(DataSeeder).seed();
      await checkins.clear();
      await checkins.insert(demoCheckin(BOB_USER_ID));

      await moduleRef.get(DataSeeder).seed();

      expect(await checkins.countBy({ userId: BOB_USER_ID })).toBe(1);
      expect(await checkins.countBy({ userId: CAROL_USER_ID })).toBe(CAROL_DEMO_COUNT);
    });

    it("does not touch the follows of an Alice who already follows someone", async () => {
      enableDemo();
      await moduleRef.get(DataSeeder).seed();
      await follows.clear();
      await follows.insert({ followerId: ALICE_USER_ID, followedId: CAROL_USER_ID });

      await moduleRef.get(DataSeeder).seed();

      const stored = await follows.find();
      expect(stored.map(({ followerId, followedId }) => [followerId, followedId])).toEqual([[ALICE_USER_ID, CAROL_USER_ID]]);
    });

    it("loads the demo tastings of Bob and Carol although Alice already has a tasting", async () => {
      enableDemo();
      await checkins.insert(demoCheckin(ALICE_USER_ID));

      await moduleRef.get(DataSeeder).seed();

      expect(await checkins.countBy({ userId: ALICE_USER_ID })).toBe(1);
      expect(await checkins.countBy({ userId: BOB_USER_ID })).toBe(BOB_DEMO_COUNT);
      expect(await checkins.countBy({ userId: CAROL_USER_ID })).toBe(CAROL_DEMO_COUNT);
    });
  });
});

describe("users table created before F5", () => {
  it("gives every existing user the hop avatar when the application starts", async () => {
    const root = mkdtempSync(join(tmpdir(), "mousse-pre-f5-"));
    const database = join(root, "mousse.db");
    const legacy = new DataSource({ type: "better-sqlite3", database });
    await legacy.initialize();
    await legacy.query(
      'CREATE TABLE "users" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "displayName" varchar(50) NOT NULL, "avatarColor" varchar(7) NOT NULL)',
    );
    await legacy.query(`INSERT INTO "users" ("id", "displayName", "avatarColor") VALUES (1, 'Alice', '#F59E0B'), (2, 'Bob', '#10B981')`);
    await legacy.destroy();
    const upgraded = new DataSource({ type: "better-sqlite3", database, entities: [User], synchronize: true });

    try {
      await upgraded.initialize();
      const stored = await upgraded.getRepository(User).find({ order: { id: "ASC" } });
      expect(stored.map((user) => [user.displayName, user.avatar])).toEqual([
        ["Alice", "hop"],
        ["Bob", "hop"],
      ]);
    } finally {
      if (upgraded.isInitialized) {
        await upgraded.destroy();
      }
      rmSync(root, { recursive: true, force: true });
    }
  });
});
