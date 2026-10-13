import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { Test } from "@nestjs/testing";
import type { TestingModule } from "@nestjs/testing";
import type { Repository } from "typeorm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AvailabilityVote } from "@/modules/venues/entities/availability-vote.entity";
import { Venue } from "@/modules/venues/entities/venue.entity";
import { VenueBeer } from "@/modules/venues/entities/venue-beer.entity";
import { VenueTypeEnum } from "@/modules/venues/enums/venue-type.enum";
import { VoteSenseEnum } from "@/modules/venues/enums/vote-sense.enum";
import { VenuesRepository } from "@/modules/venues/venues.repository";
import { inMemoryDatabase } from "@/__tests__/support/test-database";

const ZYTHOS_ID = 1;
const ALPHA_ID = 2;
const NORD_ID = 3;
const BORD_ID = 4;

const FIRST_VOTE_DATE = new Date("2026-03-01T10:00:00.000Z");
const SECOND_VOTE_DATE = new Date("2026-03-02T10:00:00.000Z");

const toVenue = (id: number, name: string, type: VenueTypeEnum, latitude: number, longitude: number) => ({
  id,
  name,
  nameKey: name.toLowerCase(),
  type,
  city: "Lille",
  address: `${id} rue de Test`,
  latitude,
  longitude,
  description: "Un lieu.",
});

describe("VenuesRepository", () => {
  let moduleRef: TestingModule;
  let repository: VenuesRepository;
  let linksStore: Repository<VenueBeer>;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [inMemoryDatabase(), TypeOrmModule.forFeature([Venue, VenueBeer, AvailabilityVote])],
      providers: [VenuesRepository],
    }).compile();
    repository = moduleRef.get(VenuesRepository);
    linksStore = moduleRef.get<Repository<VenueBeer>>(getRepositoryToken(VenueBeer));
    await moduleRef.get<Repository<Venue>>(getRepositoryToken(Venue)).insert([
      toVenue(ZYTHOS_ID, "Zythos", VenueTypeEnum.BAR, 50.64, 3.06),
      { ...toVenue(ALPHA_ID, "Alpha", VenueTypeEnum.SHOP, 48.85, 2.35), city: null, description: null },
      toVenue(NORD_ID, "Brasserie Nord", VenueTypeEnum.BREWERY, 50.7, 3.1),
      toVenue(BORD_ID, "Bord", VenueTypeEnum.BAR, 50.64, 3.2),
    ]);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it("lists every venue ordered by name when there is no filter", async () => {
    const venues = await repository.findVenues({ bounds: null, types: [] });

    expect(venues.map((venue) => venue.name)).toEqual(["Alpha", "Bord", "Brasserie Nord", "Zythos"]);
  });

  it("returns venues as DTOs with empty strings for an absent city and description", async () => {
    const venues = await repository.findVenues({ bounds: null, types: [] });

    expect(venues[0]).toEqual({
      id: ALPHA_ID,
      name: "Alpha",
      type: VenueTypeEnum.SHOP,
      city: "",
      address: "2 rue de Test",
      latitude: 48.85,
      longitude: 2.35,
      description: "",
    });
  });

  it("keeps only the venues inside the bounds", async () => {
    const venues = await repository.findVenues({
      bounds: { north: 50.65, south: 50.63, east: 3.1, west: 3.05 },
      types: [],
    });

    expect(venues.map((venue) => venue.name)).toEqual(["Zythos"]);
  });

  it("includes a venue lying exactly on the four bounds", async () => {
    const venues = await repository.findVenues({
      bounds: { north: 50.64, south: 50.64, east: 3.06, west: 3.06 },
      types: [],
    });

    expect(venues.map((venue) => venue.name)).toEqual(["Zythos"]);
  });

  it("excludes a venue just outside each bound", async () => {
    const outside = [
      { north: 50.639, south: 50.6, east: 3.3, west: 3.0 },
      { north: 50.7, south: 50.641, east: 3.3, west: 3.0 },
      { north: 50.7, south: 50.6, east: 3.059, west: 3.0 },
      { north: 50.7, south: 50.6, east: 3.3, west: 3.061 },
    ];

    for (const bounds of outside) {
      const venues = await repository.findVenues({ bounds, types: [VenueTypeEnum.BAR] });
      expect(venues.map((venue) => venue.id)).not.toContain(ZYTHOS_ID);
    }
  });

  it("keeps the venues of any requested type", async () => {
    const bars = await repository.findVenues({ bounds: null, types: [VenueTypeEnum.BAR] });
    const barsAndShops = await repository.findVenues({
      bounds: null,
      types: [VenueTypeEnum.BAR, VenueTypeEnum.SHOP],
    });

    expect(bars.map((venue) => venue.name)).toEqual(["Bord", "Zythos"]);
    expect(barsAndShops.map((venue) => venue.name)).toEqual(["Alpha", "Bord", "Zythos"]);
  });

  it("combines the bounds and the types", async () => {
    const venues = await repository.findVenues({
      bounds: { north: 50.8, south: 50.5, east: 3.5, west: 3.0 },
      types: [VenueTypeEnum.BREWERY],
    });

    expect(venues.map((venue) => venue.name)).toEqual(["Brasserie Nord"]);
  });

  it("finds a venue by id as a DTO", async () => {
    expect(await repository.findVenueById(ZYTHOS_ID)).toEqual({
      id: ZYTHOS_ID,
      name: "Zythos",
      type: VenueTypeEnum.BAR,
      city: "Lille",
      address: "1 rue de Test",
      latitude: 50.64,
      longitude: 3.06,
      description: "Un lieu.",
    });
  });

  it("returns null for an unknown venue id", async () => {
    expect(await repository.findVenueById(404)).toBeNull();
  });

  describe("findLinks", () => {
    const insertLinks = async () => {
      await linksStore.insert([
        { id: 20, venueId: NORD_ID, beerId: 300 },
        { id: 10, venueId: ZYTHOS_ID, beerId: 100 },
        { id: 11, venueId: ZYTHOS_ID, beerId: 101 },
        { id: 12, venueId: ALPHA_ID, beerId: 102 },
      ]);
      await moduleRef.get<Repository<AvailabilityVote>>(getRepositoryToken(AvailabilityVote)).insert([
        { id: 2, venueBeerId: 10, userId: null, sense: VoteSenseEnum.GONE, votedAt: SECOND_VOTE_DATE },
        { id: 1, venueBeerId: 10, userId: 2, sense: VoteSenseEnum.STILL, votedAt: FIRST_VOTE_DATE },
        { id: 3, venueBeerId: 12, userId: 1, sense: VoteSenseEnum.STILL, votedAt: SECOND_VOTE_DATE },
      ]);
    };

    it("returns the links of the requested venues ordered by id, with their votes", async () => {
      await insertLinks();

      expect(await repository.findLinks([ZYTHOS_ID, ALPHA_ID])).toEqual([
        {
          id: 10,
          venueId: ZYTHOS_ID,
          beerId: 100,
          votes: [
            { userId: 2, sense: VoteSenseEnum.STILL, votedAt: FIRST_VOTE_DATE },
            { userId: null, sense: VoteSenseEnum.GONE, votedAt: SECOND_VOTE_DATE },
          ],
        },
        { id: 11, venueId: ZYTHOS_ID, beerId: 101, votes: [] },
        {
          id: 12,
          venueId: ALPHA_ID,
          beerId: 102,
          votes: [{ userId: 1, sense: VoteSenseEnum.STILL, votedAt: SECOND_VOTE_DATE }],
        },
      ]);
    });

    it("returns an empty list without querying when no venue id is given", async () => {
      await insertLinks();
      const createQueryBuilder = vi.spyOn(linksStore, "createQueryBuilder");

      expect(await repository.findLinks([])).toEqual([]);
      expect(createQueryBuilder).not.toHaveBeenCalled();
    });

    it("returns an empty list for a venue without link", async () => {
      await insertLinks();

      expect(await repository.findLinks([BORD_ID])).toEqual([]);
    });
  });

  describe("findLinksByBeer", () => {
    const votesStore = () => moduleRef.get<Repository<AvailabilityVote>>(getRepositoryToken(AvailabilityVote));

    const insertLinks = async () => {
      await linksStore.insert([
        { id: 31, venueId: NORD_ID, beerId: 100 },
        { id: 30, venueId: ZYTHOS_ID, beerId: 100 },
        { id: 32, venueId: ALPHA_ID, beerId: 101 },
      ]);
      await votesStore().insert([
        { id: 2, venueBeerId: 30, userId: null, sense: VoteSenseEnum.GONE, votedAt: SECOND_VOTE_DATE },
        { id: 1, venueBeerId: 30, userId: 2, sense: VoteSenseEnum.STILL, votedAt: FIRST_VOTE_DATE },
        { id: 3, venueBeerId: 32, userId: 1, sense: VoteSenseEnum.STILL, votedAt: SECOND_VOTE_DATE },
      ]);
    };

    it("returns the links of the beer ordered by id with their votes and none of another beer", async () => {
      await insertLinks();

      expect(await repository.findLinksByBeer(100)).toEqual([
        {
          id: 30,
          venueId: ZYTHOS_ID,
          beerId: 100,
          votes: [
            { userId: 2, sense: VoteSenseEnum.STILL, votedAt: FIRST_VOTE_DATE },
            { userId: null, sense: VoteSenseEnum.GONE, votedAt: SECOND_VOTE_DATE },
          ],
        },
        { id: 31, venueId: NORD_ID, beerId: 100, votes: [] },
      ]);
    });

    it("returns an empty list for a beer without link", async () => {
      await insertLinks();

      expect(await repository.findLinksByBeer(404)).toEqual([]);
    });
  });

  describe("findLinksByVenue", () => {
    const votesStore = () => moduleRef.get<Repository<AvailabilityVote>>(getRepositoryToken(AvailabilityVote));

    const insertLinks = async () => {
      await linksStore.insert([
        { id: 33, venueId: ZYTHOS_ID, beerId: 101 },
        { id: 31, venueId: NORD_ID, beerId: 100 },
        { id: 30, venueId: ZYTHOS_ID, beerId: 100 },
      ]);
      await votesStore().insert([
        { id: 2, venueBeerId: 30, userId: null, sense: VoteSenseEnum.GONE, votedAt: SECOND_VOTE_DATE },
        { id: 1, venueBeerId: 30, userId: 2, sense: VoteSenseEnum.STILL, votedAt: FIRST_VOTE_DATE },
        { id: 3, venueBeerId: 31, userId: 1, sense: VoteSenseEnum.STILL, votedAt: SECOND_VOTE_DATE },
      ]);
    };

    it("returns the links of the venue ordered by id with their votes and none of another venue", async () => {
      await insertLinks();

      expect(await repository.findLinksByVenue(ZYTHOS_ID)).toEqual([
        {
          id: 30,
          venueId: ZYTHOS_ID,
          beerId: 100,
          votes: [
            { userId: 2, sense: VoteSenseEnum.STILL, votedAt: FIRST_VOTE_DATE },
            { userId: null, sense: VoteSenseEnum.GONE, votedAt: SECOND_VOTE_DATE },
          ],
        },
        { id: 33, venueId: ZYTHOS_ID, beerId: 101, votes: [] },
      ]);
    });

    it("returns an empty list for a venue without link", async () => {
      await insertLinks();

      expect(await repository.findLinksByVenue(ALPHA_ID)).toEqual([]);
    });
  });

  describe("findVenuesByIds", () => {
    it("returns the requested venues as DTOs ordered by id", async () => {
      const venues = await repository.findVenuesByIds([BORD_ID, ALPHA_ID]);

      expect(venues.map((venue) => venue.id)).toEqual([ALPHA_ID, BORD_ID]);
      expect(venues[0]).toEqual({
        id: ALPHA_ID,
        name: "Alpha",
        type: VenueTypeEnum.SHOP,
        city: "",
        address: "2 rue de Test",
        latitude: 48.85,
        longitude: 2.35,
        description: "",
      });
    });

    it("ignores an unknown id", async () => {
      const venues = await repository.findVenuesByIds([ZYTHOS_ID, 404]);

      expect(venues.map((venue) => venue.id)).toEqual([ZYTHOS_ID]);
    });

    it("returns an empty list without querying when no id is given", async () => {
      const createQueryBuilder = vi.spyOn(moduleRef.get<Repository<Venue>>(getRepositoryToken(Venue)), "createQueryBuilder");

      expect(await repository.findVenuesByIds([])).toEqual([]);
      expect(createQueryBuilder).not.toHaveBeenCalled();
    });
  });

  describe("vote persistence", () => {
    const votesStore = () => moduleRef.get<Repository<AvailabilityVote>>(getRepositoryToken(AvailabilityVote));
    const LINK_ID = 40;
    const OTHER_LINK_ID = 41;
    const ALICE = 1;
    const BOB = 2;
    const THIRD_VOTE_DATE = new Date("2026-03-03T10:00:00.000Z");

    const insertLinks = async () => {
      await linksStore.insert([
        { id: LINK_ID, venueId: ZYTHOS_ID, beerId: 100 },
        { id: OTHER_LINK_ID, venueId: ZYTHOS_ID, beerId: 101 },
        { id: 42, venueId: NORD_ID, beerId: 100 },
      ]);
    };

    it("finds the link of a venue and a beer with its votes ordered by id", async () => {
      await insertLinks();
      await votesStore().insert([
        { id: 2, venueBeerId: LINK_ID, userId: null, sense: VoteSenseEnum.GONE, votedAt: SECOND_VOTE_DATE },
        { id: 1, venueBeerId: LINK_ID, userId: ALICE, sense: VoteSenseEnum.STILL, votedAt: FIRST_VOTE_DATE },
        { id: 3, venueBeerId: OTHER_LINK_ID, userId: BOB, sense: VoteSenseEnum.STILL, votedAt: THIRD_VOTE_DATE },
      ]);

      expect(await repository.findLink(ZYTHOS_ID, 100)).toEqual({
        id: LINK_ID,
        venueId: ZYTHOS_ID,
        beerId: 100,
        votes: [
          { userId: ALICE, sense: VoteSenseEnum.STILL, votedAt: FIRST_VOTE_DATE },
          { userId: null, sense: VoteSenseEnum.GONE, votedAt: SECOND_VOTE_DATE },
        ],
      });
    });

    it("finds a link without vote with an empty vote list", async () => {
      await insertLinks();

      expect(await repository.findLink(ZYTHOS_ID, 101)).toEqual({
        id: OTHER_LINK_ID,
        venueId: ZYTHOS_ID,
        beerId: 101,
        votes: [],
      });
    });

    it("returns null when the beer is not linked to the venue", async () => {
      await insertLinks();

      expect(await repository.findLink(ZYTHOS_ID, 404)).toBeNull();
      expect(await repository.findLink(ALPHA_ID, 100)).toBeNull();
    });

    it("finds the latest vote of a user on a link, ignoring other users and other links", async () => {
      await insertLinks();
      await votesStore().insert([
        { id: 1, venueBeerId: LINK_ID, userId: ALICE, sense: VoteSenseEnum.STILL, votedAt: FIRST_VOTE_DATE },
        { id: 2, venueBeerId: LINK_ID, userId: ALICE, sense: VoteSenseEnum.GONE, votedAt: SECOND_VOTE_DATE },
        { id: 3, venueBeerId: LINK_ID, userId: BOB, sense: VoteSenseEnum.STILL, votedAt: THIRD_VOTE_DATE },
        { id: 4, venueBeerId: OTHER_LINK_ID, userId: ALICE, sense: VoteSenseEnum.STILL, votedAt: THIRD_VOTE_DATE },
        { id: 5, venueBeerId: LINK_ID, userId: null, sense: VoteSenseEnum.STILL, votedAt: THIRD_VOTE_DATE },
      ]);

      expect(await repository.findLastUserVote(LINK_ID, ALICE)).toEqual({
        userId: ALICE,
        sense: VoteSenseEnum.GONE,
        votedAt: SECOND_VOTE_DATE,
      });
    });

    it("prefers the most recent date over the highest vote id", async () => {
      await insertLinks();
      await votesStore().insert([
        { id: 1, venueBeerId: LINK_ID, userId: ALICE, sense: VoteSenseEnum.GONE, votedAt: SECOND_VOTE_DATE },
        { id: 2, venueBeerId: LINK_ID, userId: ALICE, sense: VoteSenseEnum.STILL, votedAt: FIRST_VOTE_DATE },
      ]);

      expect(await repository.findLastUserVote(LINK_ID, ALICE)).toEqual({
        userId: ALICE,
        sense: VoteSenseEnum.GONE,
        votedAt: SECOND_VOTE_DATE,
      });
    });

    it("breaks a tie on the date with the highest vote id", async () => {
      await insertLinks();
      await votesStore().insert([
        { id: 7, venueBeerId: LINK_ID, userId: ALICE, sense: VoteSenseEnum.GONE, votedAt: FIRST_VOTE_DATE },
        { id: 9, venueBeerId: LINK_ID, userId: ALICE, sense: VoteSenseEnum.STILL, votedAt: FIRST_VOTE_DATE },
        { id: 8, venueBeerId: LINK_ID, userId: ALICE, sense: VoteSenseEnum.GONE, votedAt: FIRST_VOTE_DATE },
      ]);

      expect(await repository.findLastUserVote(LINK_ID, ALICE)).toEqual({
        userId: ALICE,
        sense: VoteSenseEnum.STILL,
        votedAt: FIRST_VOTE_DATE,
      });
    });

    it("returns null when the user has no vote on the link", async () => {
      await insertLinks();
      await votesStore().insert([
        { id: 1, venueBeerId: OTHER_LINK_ID, userId: ALICE, sense: VoteSenseEnum.STILL, votedAt: FIRST_VOTE_DATE },
      ]);

      expect(await repository.findLastUserVote(LINK_ID, ALICE)).toBeNull();
    });

    it("stores a vote that findLink then returns", async () => {
      await insertLinks();

      const result = await repository.createVote({
        venueBeerId: LINK_ID,
        userId: BOB,
        sense: VoteSenseEnum.GONE,
        votedAt: THIRD_VOTE_DATE,
      });

      expect(result).toBeUndefined();
      expect(await votesStore().count()).toBe(1);
      expect((await repository.findLink(ZYTHOS_ID, 100))?.votes).toEqual([
        { userId: BOB, sense: VoteSenseEnum.GONE, votedAt: THIRD_VOTE_DATE },
      ]);
    });
  });
  describe("venue and link creation", () => {
    const NEW_VENUE = {
      name: "Chez Mousse",
      nameKey: "chez mousse",
      type: VenueTypeEnum.SHOP,
      city: "Lille",
      address: "12 rue de la Biere",
      latitude: 50.63,
      longitude: 3.06,
      description: "Une cave.",
    };
    const venuesStore = () => moduleRef.get<Repository<Venue>>(getRepositoryToken(Venue));
    const votesStore = () => moduleRef.get<Repository<AvailabilityVote>>(getRepositoryToken(AvailabilityVote));

    it("finds an existing name key", async () => {
      expect(await repository.existsByNameKey("zythos")).toBe(true);
    });

    it("does not find a name key that no venue has, nor the display name of one that has", async () => {
      expect(await repository.existsByNameKey("inconnu")).toBe(false);
      expect(await repository.existsByNameKey("Zythos")).toBe(false);
    });

    it("stores a venue with its name key and returns it as a record", async () => {
      const record = await repository.createVenue(NEW_VENUE);

      expect(record).toEqual({
        id: expect.any(Number),
        name: "Chez Mousse",
        type: VenueTypeEnum.SHOP,
        city: "Lille",
        address: "12 rue de la Biere",
        latitude: 50.63,
        longitude: 3.06,
        description: "Une cave.",
      });
      expect(await venuesStore().findOneByOrFail({ id: record.id })).toMatchObject({ nameKey: "chez mousse" });
      expect(await repository.findVenueById(record.id)).toEqual(record);
    });

    it("stores a venue without city and description and returns empty strings for them", async () => {
      const record = await repository.createVenue({ ...NEW_VENUE, city: null, description: null });

      expect(record).toMatchObject({ city: "", description: "" });
      expect(await venuesStore().findOneByOrFail({ id: record.id })).toMatchObject({ city: null, description: null });
    });

    it("rejects a second venue with the same name key", async () => {
      await expect(repository.createVenue({ ...NEW_VENUE, nameKey: "zythos", name: "ZYTHOS" })).rejects.toThrow();
      expect(await venuesStore().count()).toBe(4);
    });

    it("stores a link without vote and returns it with an empty vote list", async () => {
      const link = await repository.createLink(ZYTHOS_ID, 100);

      expect(link).toEqual({ id: expect.any(Number), venueId: ZYTHOS_ID, beerId: 100, votes: [] });
      expect(await linksStore.count()).toBe(1);
      expect(await votesStore().count()).toBe(0);
      expect(await repository.findLink(ZYTHOS_ID, 100)).toEqual(link);
    });

    it("rejects a second link between the same venue and beer", async () => {
      await repository.createLink(ZYTHOS_ID, 100);

      await expect(repository.createLink(ZYTHOS_ID, 100)).rejects.toThrow();
      expect(await linksStore.count()).toBe(1);
    });
  });
});
