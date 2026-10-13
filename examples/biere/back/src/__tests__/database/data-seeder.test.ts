import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { Test } from "@nestjs/testing";
import type { TestingModule } from "@nestjs/testing";
import type { Repository } from "typeorm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DataSeeder } from "@/database/data-seeder";
import { ALICE_USER_ID, SEED_VOTE_BATCH_SIZE } from "@/database/seed.constants";
import beersSeed from "@/database/seed/data/beers.json";
import breweriesSeed from "@/database/seed/data/breweries.json";
import venueBeersSeed from "@/database/seed/data/venue-beers.json";
import venuesSeed from "@/database/seed/data/venues.json";
import stylesSeed from "@/database/seed/data/styles.json";
import { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";
import { Beer } from "@/modules/beers/entities/beer.entity";
import { BeerStyle } from "@/modules/beers/entities/beer-style.entity";
import { Brewery } from "@/modules/beers/entities/brewery.entity";
import { User } from "@/modules/users/entities/user.entity";
import { AvailabilityVote } from "@/modules/venues/entities/availability-vote.entity";
import { VenueBeer } from "@/modules/venues/entities/venue-beer.entity";
import { Venue } from "@/modules/venues/entities/venue.entity";
import { VoteSenseEnum } from "@/modules/venues/enums/vote-sense.enum";
import { inMemoryDatabase } from "@/__tests__/support/test-database";

const SEEDED_STYLE_COUNT = 34;
const SEEDED_BREWERY_COUNT = 70;
const SEEDED_BEER_COUNT = 120;
const SEEDED_VENUE_COUNT = 36;
const SEEDED_LINK_COUNT = 325;
const SEEDED_VOTE_COUNT = 2266;
const LOAD_TIME = new Date("2026-03-15T12:00:00.000Z");
const DAY_MS = 86_400_000;
const WINDOW_DAYS = 30;

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

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [inMemoryDatabase(), TypeOrmModule.forFeature([User, BeerStyle, Brewery, Beer, Venue, VenueBeer, AvailabilityVote])],
      providers: [DataSeeder],
    }).compile();
    users = moduleRef.get<Repository<User>>(getRepositoryToken(User));
    styles = moduleRef.get<Repository<BeerStyle>>(getRepositoryToken(BeerStyle));
    breweries = moduleRef.get<Repository<Brewery>>(getRepositoryToken(Brewery));
    beers = moduleRef.get<Repository<Beer>>(getRepositoryToken(Beer));
    venues = moduleRef.get<Repository<Venue>>(getRepositoryToken(Venue));
    venueBeers = moduleRef.get<Repository<VenueBeer>>(getRepositoryToken(VenueBeer));
    votes = moduleRef.get<Repository<AvailabilityVote>>(getRepositoryToken(AvailabilityVote));
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it("inserts Alice, Bob and Carol on bootstrap", async () => {
    await moduleRef.get(DataSeeder).onApplicationBootstrap();

    const seeded = await users.find({ order: { id: "ASC" } });
    expect(seeded.map((user) => user.displayName)).toEqual(["Alice", "Bob", "Carol"]);
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
});
