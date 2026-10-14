import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BeerSourceEnum } from "@/modules/beers/enums/beer-source.enum";
import type { BeersService } from "@/modules/beers/beers.service";
import type { BeerDto } from "@/modules/beers/dtos/beer.dto";
import type { TastingsService } from "@/modules/tastings/tastings.service";
import { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";
import type { VenueLinkDto } from "@/modules/venues/dtos/venue-link.dto";
import type { VenueRecordDto } from "@/modules/venues/dtos/venue-record.dto";
import type { CreateVenueDto } from "@/modules/venues/dtos/create-venue.dto";
import type { VenuesQueryDto } from "@/modules/venues/dtos/venues-query.dto";
import { AvailabilityStatusEnum } from "@/modules/venues/enums/availability-status.enum";
import { VenueTypeEnum } from "@/modules/venues/enums/venue-type.enum";
import { VoteSenseEnum } from "@/modules/venues/enums/vote-sense.enum";
import { DAY_MS, HOUR_MS } from "@/modules/venues/venues.constants";
import type { VenuesRepository } from "@/modules/venues/venues.repository";
import { VenuesService } from "@/modules/venues/venues.service";

const NOW = new Date("2026-03-15T12:00:00.000Z");

const PARTIAL_BOUNDS_MESSAGE = "north, south, east and west must be supplied together.";
const SOUTH_ABOVE_NORTH_MESSAGE = "south must not be greater than north.";
const WEST_AFTER_EAST_MESSAGE = "west must not be greater than east.";

const toRecord = (id: number, name: string): VenueRecordDto => ({
  id,
  name,
  type: VenueTypeEnum.BAR,
  city: "Lille",
  address: `${id} rue de Test`,
  latitude: 50.64,
  longitude: 3.06,
  description: "Un lieu.",
});

const votesOf = (sense: VoteSenseEnum, count: number) =>
  Array.from({ length: count }, (_, index) => ({
    userId: null,
    sense,
    votedAt: new Date(NOW.getTime() - (index + 1) * HOUR_MS),
  }));

const toLink = (id: number, venueId: number, votes: VenueLinkDto["votes"]): VenueLinkDto => ({
  id,
  venueId,
  beerId: id * 10,
  votes,
});

const CONFIRMED_VOTES = votesOf(VoteSenseEnum.STILL, 2);
const GONE_VOTES = votesOf(VoteSenseEnum.GONE, 3);
const MAYBE_GONE_VOTES = votesOf(VoteSenseEnum.GONE, 1);

const BEER_ID = 4;
const ALICE = 1;
const BOB = 2;
const POSITION_MESSAGE = "latitude and longitude must be supplied together.";
const RADIUS_MESSAGE = "radiusKm requires latitude and longitude.";
const PARIS = { latitude: 48.8566, longitude: 2.3522 };

const WHOLE_AREA: VenuesQueryDto = {};
const NO_VISIT = { checkinCount: 0, lastCheckinAt: null };

describe("VenuesService", () => {
  const repository = {
    findVenues: vi.fn(),
    findVenueById: vi.fn(),
    existsById: vi.fn(),
    findLinks: vi.fn(),
    findLinksByBeer: vi.fn(),
    findVenuesByIds: vi.fn(),
    findLinksByVenue: vi.fn(),
    findLink: vi.fn(),
    findLastUserVote: vi.fn(),
    findVotesByUser: vi.fn(),
    createVote: vi.fn(),
    existsByNameKey: vi.fn(),
    createVenue: vi.fn(),
    createLink: vi.fn(),
  };
  const beersService = { getBeer: vi.fn(), getBeersByIds: vi.fn() };
  const tastingsService = {
    getBeerStates: vi.fn(),
    getDiscoveries: vi.fn(),
    getDrunkBeerIds: vi.fn(),
    getVenueVisits: vi.fn(),
  };
  let service: VenuesService;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    service = new VenuesService(
      repository as unknown as VenuesRepository,
      beersService as unknown as BeersService,
      tastingsService as unknown as TastingsService,
    );
    tastingsService.getBeerStates.mockResolvedValue([]);
    tastingsService.getDiscoveries.mockResolvedValue([]);
    tastingsService.getDrunkBeerIds.mockResolvedValue([]);
    tastingsService.getVenueVisits.mockResolvedValue([]);
    repository.findLinksByBeer.mockResolvedValue([]);
    repository.findVenuesByIds.mockResolvedValue([]);
    beersService.getBeer.mockResolvedValue({ id: BEER_ID });
    repository.findVenues.mockResolvedValue([]);
    repository.findLinks.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("getVenues validation order", () => {
    it.each([
      ["north only", { north: 51 }],
      ["north and south", { north: 51, south: 50 }],
      ["north, south and east", { north: 51, south: 50, east: 4 }],
      ["west only", { west: 3 }],
    ])("rejects partial bounds (%s) without reading anything", async (_label, query) => {
      await expect(service.getVenues(ALICE, query)).rejects.toThrow(new BadRequestException(PARTIAL_BOUNDS_MESSAGE));
      expect(repository.findVenues).not.toHaveBeenCalled();
      expect(repository.findLinks).not.toHaveBeenCalled();
    });

    it("rejects a south bound above the north bound", async () => {
      await expect(service.getVenues(ALICE, { north: 50, south: 51, east: 4, west: 3 })).rejects.toThrow(
        new BadRequestException(SOUTH_ABOVE_NORTH_MESSAGE),
      );
      expect(repository.findVenues).not.toHaveBeenCalled();
    });

    it("rejects a west bound east of the east bound", async () => {
      await expect(service.getVenues(ALICE, { north: 51, south: 50, east: 3, west: 4 })).rejects.toThrow(
        new BadRequestException(WEST_AFTER_EAST_MESSAGE),
      );
      expect(repository.findVenues).not.toHaveBeenCalled();
    });

    it("reports partial bounds before a south bound above the north bound", async () => {
      await expect(service.getVenues(ALICE, { north: 50, south: 51, east: 4 })).rejects.toThrow(
        new BadRequestException(PARTIAL_BOUNDS_MESSAGE),
      );
    });

    it("reports partial bounds before a west bound east of the east bound", async () => {
      await expect(service.getVenues(ALICE, { north: 50, east: 3, west: 4 })).rejects.toThrow(
        new BadRequestException(PARTIAL_BOUNDS_MESSAGE),
      );
      expect(repository.findVenues).not.toHaveBeenCalled();
    });

    it("reports a south bound above the north bound before a west bound east of the east bound", async () => {
      await expect(service.getVenues(ALICE, { north: 50, south: 51, east: 3, west: 4 })).rejects.toThrow(
        new BadRequestException(SOUTH_ABOVE_NORTH_MESSAGE),
      );
    });

    it.each([
      ["a latitude without longitude", { latitude: 48.8 }],
      ["a longitude without latitude", { longitude: 2.3 }],
      ["a latitude of 0 without longitude", { latitude: 0 }],
      ["a longitude of 0 without latitude", { longitude: 0 }],
    ])("rejects %s without reading anything", async (_label, query) => {
      await expect(service.getVenues(ALICE, query)).rejects.toThrow(new BadRequestException(POSITION_MESSAGE));
      expect(repository.findVenues).not.toHaveBeenCalled();
      expect(repository.findLinks).not.toHaveBeenCalled();
      expect(beersService.getBeersByIds).not.toHaveBeenCalled();
    });

    it("rejects a radius without position without reading anything", async () => {
      await expect(service.getVenues(ALICE, { radiusKm: 5 })).rejects.toThrow(new BadRequestException(RADIUS_MESSAGE));
      expect(repository.findVenues).not.toHaveBeenCalled();
      expect(beersService.getBeersByIds).not.toHaveBeenCalled();
    });

    it("reports partial bounds before a half position", async () => {
      await expect(service.getVenues(ALICE, { north: 50, latitude: 48.8 })).rejects.toThrow(
        new BadRequestException(PARTIAL_BOUNDS_MESSAGE),
      );
    });

    it("reports a south bound above the north bound before a half position", async () => {
      await expect(service.getVenues(ALICE, { north: 50, south: 51, east: 4, west: 3, latitude: 48.8 })).rejects.toThrow(
        new BadRequestException(SOUTH_ABOVE_NORTH_MESSAGE),
      );
    });

    it("reports a west bound east of the east bound before a half position", async () => {
      await expect(service.getVenues(ALICE, { north: 51, south: 50, east: 3, west: 4, longitude: 2.3 })).rejects.toThrow(
        new BadRequestException(WEST_AFTER_EAST_MESSAGE),
      );
    });

    it("reports a half position before a radius", async () => {
      await expect(service.getVenues(ALICE, { latitude: 48.8, radiusKm: 5 })).rejects.toThrow(
        new BadRequestException(POSITION_MESSAGE),
      );
    });

    it("reports a west bound east of the east bound before a radius without position", async () => {
      await expect(service.getVenues(ALICE, { north: 51, south: 50, east: 3, west: 4, radiusKm: 5 })).rejects.toThrow(
        new BadRequestException(WEST_AFTER_EAST_MESSAGE),
      );
    });

    it("reports partial bounds before a radius without position", async () => {
      await expect(service.getVenues(ALICE, { north: 50, radiusKm: 5 })).rejects.toThrow(
        new BadRequestException(PARTIAL_BOUNDS_MESSAGE),
      );
      expect(repository.findVenues).not.toHaveBeenCalled();
    });

    it("reports a south bound above the north bound before a radius without position", async () => {
      await expect(service.getVenues(ALICE, { north: 50, south: 51, east: 4, west: 3, radiusKm: 5 })).rejects.toThrow(
        new BadRequestException(SOUTH_ABOVE_NORTH_MESSAGE),
      );
      expect(repository.findVenues).not.toHaveBeenCalled();
    });

    it("accepts a zone of size zero", async () => {
      await expect(service.getVenues(ALICE, { north: 50.5, south: 50.5, east: 3, west: 3 })).resolves.toEqual([]);
      expect(repository.findVenues).toHaveBeenCalledWith({
        bounds: { north: 50.5, south: 50.5, east: 3, west: 3 },
        types: [],
        search: "",
      });
    });
  });

  describe("getVenues", () => {
    it("reads the whole area when no filter is given", async () => {
      await service.getVenues(ALICE, WHOLE_AREA);

      expect(repository.findVenues).toHaveBeenCalledWith({ bounds: null, types: [], search: "" });
    });

    it("passes the bounds and the requested types to the repository", async () => {
      await service.getVenues(ALICE, {
        north: 51,
        south: 50,
        east: 4,
        west: 3,
        type: [VenueTypeEnum.BAR, VenueTypeEnum.SHOP],
      });

      expect(repository.findVenues).toHaveBeenCalledWith({
        bounds: { north: 51, south: 50, east: 4, west: 3 },
        types: [VenueTypeEnum.BAR, VenueTypeEnum.SHOP],
        search: "",
      });
    });

    it("reads the links of every venue found in one call", async () => {
      repository.findVenues.mockResolvedValue([toRecord(1, "Alpha"), toRecord(2, "Bravo")]);

      await service.getVenues(ALICE, WHOLE_AREA);

      expect(repository.findLinks).toHaveBeenCalledTimes(1);
      expect(repository.findLinks).toHaveBeenCalledWith([1, 2]);
    });

    it("gives each venue the best state of its beers, no distance and the order of the repository", async () => {
      repository.findVenues.mockResolvedValue([
        toRecord(1, "Alpha"),
        toRecord(2, "Bravo"),
        toRecord(3, "Charlie"),
        toRecord(4, "Delta"),
      ]);
      repository.findLinks.mockResolvedValue([
        toLink(10, 1, GONE_VOTES),
        toLink(11, 1, CONFIRMED_VOTES),
        toLink(12, 2, GONE_VOTES),
        toLink(13, 4, MAYBE_GONE_VOTES),
        toLink(14, 4, GONE_VOTES),
      ]);

      const venues = await service.getVenues(ALICE, WHOLE_AREA);

      expect(venues).toEqual([
        { ...toRecord(1, "Alpha"), distanceKm: null, status: AvailabilityStatusEnum.CONFIRMED, ...NO_VISIT, isApproximateMatch: false },
        { ...toRecord(2, "Bravo"), distanceKm: null, status: AvailabilityStatusEnum.GONE, ...NO_VISIT, isApproximateMatch: false },
        { ...toRecord(3, "Charlie"), distanceKm: null, status: AvailabilityStatusEnum.UNKNOWN, ...NO_VISIT, isApproximateMatch: false },
        { ...toRecord(4, "Delta"), distanceKm: null, status: AvailabilityStatusEnum.MAYBE_GONE, ...NO_VISIT, isApproximateMatch: false },
      ]);
    });

    it("ranks an unknown beer above a gone beer", async () => {
      repository.findVenues.mockResolvedValue([toRecord(1, "Alpha")]);
      repository.findLinks.mockResolvedValue([toLink(10, 1, GONE_VOTES), toLink(11, 1, [])]);

      expect(await service.getVenues(ALICE, WHOLE_AREA)).toEqual([
        { ...toRecord(1, "Alpha"), distanceKm: null, status: AvailabilityStatusEnum.UNKNOWN, ...NO_VISIT, isApproximateMatch: false },
      ]);
    });

    it("returns an empty list when no venue matches", async () => {
      expect(await service.getVenues(ALICE, WHOLE_AREA)).toEqual([]);
    });

    it("reads the visits of the user for every venue found in one call", async () => {
      repository.findVenues.mockResolvedValue([toRecord(1, "Alpha"), toRecord(2, "Bravo")]);

      await service.getVenues(BOB, WHOLE_AREA);

      expect(tastingsService.getVenueVisits).toHaveBeenCalledExactlyOnceWith(BOB, [1, 2]);
    });

    it("gives each venue the count and the last date of its visit and zero and null to the others", async () => {
      repository.findVenues.mockResolvedValue([toRecord(1, "Alpha"), toRecord(2, "Bravo"), toRecord(3, "Charlie")]);
      tastingsService.getVenueVisits.mockResolvedValue([
        { venueId: 3, checkinCount: 2, lastCheckinAt: "2026-10-09T18:30:00.000Z" },
        { venueId: 1, checkinCount: 1, lastCheckinAt: "2026-10-02T12:00:00.000Z" },
      ]);

      const venues = await service.getVenues(ALICE, WHOLE_AREA);

      expect(venues.map(({ id, checkinCount, lastCheckinAt }) => ({ id, checkinCount, lastCheckinAt }))).toEqual([
        { id: 1, checkinCount: 1, lastCheckinAt: "2026-10-02T12:00:00.000Z" },
        { id: 2, ...NO_VISIT },
        { id: 3, checkinCount: 2, lastCheckinAt: "2026-10-09T18:30:00.000Z" },
      ]);
    });
  });

  describe("getVenues approximate fallback", () => {
    const CLUNY = { ...toRecord(1, "La Taverne de Cluny"), city: "Paris" };
    const LILLE_BAR = { ...toRecord(2, "Le Bar Lillois"), city: "Lille" };
    const UNRELATED = { ...toRecord(3, "Le Triangle"), city: "Lyon" };
    const SEARCH_ALL = { bounds: null, types: [], search: "" };

    it("returns the exact venues, none flagged, without a second read when they are found", async () => {
      repository.findVenues.mockResolvedValue([CLUNY]);

      const venues = await service.getVenues(ALICE, { q: "taverne" });

      expect(repository.findVenues).toHaveBeenCalledExactlyOnceWith({ bounds: null, types: [], search: "taverne" });
      expect(venues.map((venue) => [venue.name, venue.isApproximateMatch])).toEqual([["La Taverne de Cluny", false]]);
    });

    it("falls back to the venues close to the text, flagged, when nothing matches exactly", async () => {
      repository.findVenues.mockResolvedValueOnce([]).mockResolvedValueOnce([CLUNY, UNRELATED]);

      const venues = await service.getVenues(ALICE, { q: "taverne cluni" });

      expect(repository.findVenues).toHaveBeenCalledTimes(2);
      expect(repository.findVenues).toHaveBeenNthCalledWith(2, SEARCH_ALL);
      expect(venues).toEqual([
        { ...CLUNY, distanceKm: null, status: AvailabilityStatusEnum.UNKNOWN, ...NO_VISIT, isApproximateMatch: true },
      ]);
    });

    it("keeps the bounds and the types of the query in the fallback read and only drops the text", async () => {
      repository.findVenues.mockResolvedValue([]);

      await service.getVenues(ALICE, { q: "lile", north: 51, south: 50, east: 4, west: 3, type: [VenueTypeEnum.BAR] });

      expect(repository.findVenues).toHaveBeenNthCalledWith(2, {
        bounds: { north: 51, south: 50, east: 4, west: 3 },
        types: [VenueTypeEnum.BAR],
        search: "",
      });
    });

    it("matches the city as well as the name and keeps the order of the repository", async () => {
      repository.findVenues.mockResolvedValueOnce([]).mockResolvedValueOnce([LILLE_BAR, CLUNY, UNRELATED]);

      const venues = await service.getVenues(ALICE, { q: "lile" });

      expect(venues.map((venue) => [venue.name, venue.isApproximateMatch])).toEqual([["Le Bar Lillois", true]]);
    });

    it("applies no fallback when the text has no word of four letters", async () => {
      repository.findVenues.mockResolvedValueOnce([]).mockResolvedValueOnce([LILLE_BAR, CLUNY, UNRELATED]);

      expect(await service.getVenues(ALICE, { q: "bqr" })).toEqual([]);
      expect(repository.findVenues).toHaveBeenCalledExactlyOnceWith({ bounds: null, types: [], search: "bqr" });
    });

    it("applies no fallback and reads once without a text", async () => {
      expect(await service.getVenues(ALICE, WHOLE_AREA)).toEqual([]);
      expect(repository.findVenues).toHaveBeenCalledTimes(1);
    });

    it("returns an empty list when no venue is close either", async () => {
      repository.findVenues.mockResolvedValueOnce([]).mockResolvedValueOnce([UNRELATED]);

      expect(await service.getVenues(ALICE, { q: "taverne cluni" })).toEqual([]);
    });

    it("reads the links and the visits of the fallback venues only", async () => {
      repository.findVenues.mockResolvedValueOnce([]).mockResolvedValueOnce([CLUNY, UNRELATED]);
      repository.findLinks.mockResolvedValue([toLink(10, 1, CONFIRMED_VOTES)]);

      const venues = await service.getVenues(BOB, { q: "taverne cluni" });

      expect(repository.findLinks).toHaveBeenLastCalledWith([1]);
      expect(tastingsService.getVenueVisits).toHaveBeenLastCalledWith(BOB, [1]);
      expect(venues.map((venue) => venue.status)).toEqual([AvailabilityStatusEnum.CONFIRMED]);
    });

    it("applies confirmedOnly to the close venues: the confirmed one stays, the gone one goes", async () => {
      repository.findLinks.mockResolvedValue([toLink(10, 1, CONFIRMED_VOTES), toLink(11, 2, GONE_VOTES)]);

      repository.findVenues.mockResolvedValueOnce([]).mockResolvedValueOnce([CLUNY, LILLE_BAR]);
      const kept = await service.getVenues(ALICE, { q: "taverne cluni", confirmedOnly: true });
      repository.findVenues.mockResolvedValueOnce([]).mockResolvedValueOnce([CLUNY, LILLE_BAR]);
      const dropped = await service.getVenues(ALICE, { q: "lile", confirmedOnly: true });
      repository.findVenues.mockResolvedValueOnce([]).mockResolvedValueOnce([CLUNY, LILLE_BAR]);
      const unfiltered = await service.getVenues(ALICE, { q: "lile" });

      expect(kept.map((venue) => [venue.name, venue.isApproximateMatch])).toEqual([["La Taverne de Cluny", true]]);
      expect(dropped).toEqual([]);
      expect(unfiltered.map((venue) => [venue.name, venue.status])).toEqual([
        ["Le Bar Lillois", AvailabilityStatusEnum.GONE],
      ]);
    });

    it("applies the beer filter to the close venues", async () => {
      const LINKED_BEER_ID = 100;
      repository.findLinks.mockResolvedValue([toLink(10, 1, CONFIRMED_VOTES)]);
      beersService.getBeersByIds.mockResolvedValue([{ id: LINKED_BEER_ID, family: BeerFamilyEnum.STOUT, styleId: 1 }]);

      repository.findVenues.mockResolvedValueOnce([]).mockResolvedValueOnce([CLUNY, LILLE_BAR]);
      const other = await service.getVenues(ALICE, { q: "taverne cluni", beer: 999 });
      repository.findVenues.mockResolvedValueOnce([]).mockResolvedValueOnce([CLUNY, LILLE_BAR]);
      const matching = await service.getVenues(ALICE, { q: "taverne cluni", beer: LINKED_BEER_ID });

      expect(other).toEqual([]);
      expect(matching.map((venue) => [venue.name, venue.isApproximateMatch])).toEqual([["La Taverne de Cluny", true]]);
    });

    it("falls back when the exact venues are all removed by the in-memory filters", async () => {
      repository.findVenues.mockResolvedValueOnce([LILLE_BAR]).mockResolvedValueOnce([LILLE_BAR, CLUNY]);
      repository.findLinks.mockResolvedValue([toLink(11, 2, GONE_VOTES), toLink(10, 1, CONFIRMED_VOTES)]);

      const venues = await service.getVenues(ALICE, { q: "bar lillois", confirmedOnly: true });

      expect(repository.findVenues).toHaveBeenCalledTimes(2);
      expect(venues).toEqual([]);
    });

    describe("keeps every other filter of the query on the close venues", () => {
      const BIS = { ...CLUNY, id: 4, name: "Taverne Cluny Bis", ...PARIS };
      const DRUNK_BEER_ID = 100;
      const OTHER_BEER_ID = 110;

      const givenCloseVenues = () => {
        repository.findVenues.mockResolvedValueOnce([]).mockResolvedValueOnce([CLUNY, BIS]);
        repository.findLinks.mockResolvedValue([
          toLink(10, CLUNY.id, CONFIRMED_VOTES),
          toLink(11, BIS.id, CONFIRMED_VOTES),
        ]);
        beersService.getBeersByIds.mockResolvedValue([
          { id: DRUNK_BEER_ID, family: BeerFamilyEnum.STOUT, styleId: 1 },
          { id: OTHER_BEER_ID, family: BeerFamilyEnum.TRAPPIST, styleId: 2 },
        ]);
        tastingsService.getDrunkBeerIds.mockResolvedValue([DRUNK_BEER_ID]);
      };

      const flaggedNamesOf = (venues: { name: string; isApproximateMatch: boolean }[]) =>
        venues.map((venue) => [venue.name, venue.isApproximateMatch]);

      it("applies the radius around the position", async () => {
        givenCloseVenues();

        const venues = await service.getVenues(ALICE, { ...PARIS, q: "taverne cluni", radiusKm: 10 });

        expect(flaggedNamesOf(venues)).toEqual([["Taverne Cluny Bis", true]]);
      });

      it("applies the visited filter", async () => {
        givenCloseVenues();
        tastingsService.getVenueVisits.mockResolvedValue([{ venueId: BIS.id, checkinCount: 1, lastCheckinAt: "2026-10-09T18:30:00.000Z" }]);

        const venues = await service.getVenues(ALICE, { q: "taverne cluni", visited: true });

        expect(flaggedNamesOf(venues)).toEqual([["Taverne Cluny Bis", true]]);
      });

      it("applies the undiscovered filter", async () => {
        givenCloseVenues();

        const venues = await service.getVenues(ALICE, { q: "taverne cluni", undiscovered: true });

        expect(flaggedNamesOf(venues)).toEqual([["Taverne Cluny Bis", true]]);
      });

      it("applies the beer family filter", async () => {
        givenCloseVenues();

        const venues = await service.getVenues(ALICE, { q: "taverne cluni", family: BeerFamilyEnum.TRAPPIST });

        expect(flaggedNamesOf(venues)).toEqual([["Taverne Cluny Bis", true]]);
      });

      it("applies the beer style filter", async () => {
        givenCloseVenues();

        const venues = await service.getVenues(ALICE, { q: "taverne cluni", style: [2] });

        expect(flaggedNamesOf(venues)).toEqual([["Taverne Cluny Bis", true]]);
      });
    });

    it("computes the distance of the close venues and keeps the order by name", async () => {
      const BIS_IN_PARIS = { ...CLUNY, id: 4, name: "Taverne Cluny Bis", ...PARIS };
      repository.findVenues.mockResolvedValueOnce([]).mockResolvedValueOnce([CLUNY, BIS_IN_PARIS]);

      const venues = await service.getVenues(ALICE, { ...PARIS, q: "taverne cluni" });

      expect(venues.map((venue) => venue.name)).toEqual(["La Taverne de Cluny", "Taverne Cluny Bis"]);
      expect(venues[1].distanceKm).toBe(0);
      expect(venues[0].distanceKm).toBeGreaterThan(venues[1].distanceKm as number);
    });
  });

  describe("getVenues filters and distance", () => {
    const ORVAL_ID = 10;
    const CHIMAY_ID = 20;
    const GUINNESS_ID = 30;
    const ORVAL_STYLE_ID = 100;
    const STOUT_STYLE_ID = 300;
    const IMPERIAL_STYLE_ID = 301;

    const beerOf = (id: number, family: BeerFamilyEnum, styleId: number): BeerDto => ({
      id,
      name: `Beer ${id}`,
      breweryName: `Brasserie ${id}`,
      country: "BE",
      styleId,
      styleName: `Style ${styleId}`,
      family,
      abv: 5,
      aromas: [],
      formats: [],
      description: "Une bière.",
      bitternessLevel: null,
      colorLevel: null,
      styleColorRange: null,
      source: BeerSourceEnum.OFFICIAL,
      createdBy: null,
    });

    const CATALOGUE = [
      beerOf(ORVAL_ID, BeerFamilyEnum.TRAPPIST, ORVAL_STYLE_ID),
      beerOf(CHIMAY_ID, BeerFamilyEnum.TRAPPIST, ORVAL_STYLE_ID + 1),
      beerOf(GUINNESS_ID, BeerFamilyEnum.STOUT, STOUT_STYLE_ID),
      beerOf(31, BeerFamilyEnum.STOUT, IMPERIAL_STYLE_ID),
    ];

    const linkTo = (id: number, venueId: number, beerId: number, votes: VenueLinkDto["votes"]): VenueLinkDto => ({
      id,
      venueId,
      beerId,
      votes,
    });

    const given = (records: VenueRecordDto[], links: VenueLinkDto[]) => {
      repository.findVenues.mockResolvedValue(records);
      repository.findLinks.mockResolvedValue(links);
      beersService.getBeersByIds.mockResolvedValue(CATALOGUE);
    };

    const at = (id: number, name: string, latitude: number, longitude: number): VenueRecordDto => ({
      ...toRecord(id, name),
      latitude,
      longitude,
    });

    const namesOf = (venues: { name: string }[]) => venues.map((venue) => venue.name);

    const THREE_VENUES = [toRecord(1, "Alpha"), toRecord(2, "Bravo"), toRecord(3, "Charlie")];

    it("does not read the beers when no beer, family or style filter is given", async () => {
      given(THREE_VENUES, [linkTo(1, 1, ORVAL_ID, CONFIRMED_VOTES)]);

      await service.getVenues(ALICE, { confirmedOnly: false });

      expect(beersService.getBeersByIds).not.toHaveBeenCalled();
    });

    it("reads the distinct beers of the links once when a filter is given", async () => {
      given(THREE_VENUES, [
        linkTo(1, 1, ORVAL_ID, CONFIRMED_VOTES),
        linkTo(2, 2, ORVAL_ID, []),
        linkTo(3, 2, GUINNESS_ID, []),
      ]);

      await service.getVenues(ALICE, { beer: ORVAL_ID });

      expect(beersService.getBeersByIds).toHaveBeenCalledTimes(1);
      expect(beersService.getBeersByIds).toHaveBeenCalledWith([ORVAL_ID, GUINNESS_ID]);
    });

    it("keeps the venues linked to the beer and gives them the state of that beer, not their best", async () => {
      given(THREE_VENUES, [
        linkTo(1, 1, ORVAL_ID, []),
        linkTo(2, 1, CHIMAY_ID, CONFIRMED_VOTES),
        linkTo(3, 2, ORVAL_ID, GONE_VOTES),
        linkTo(4, 3, CHIMAY_ID, CONFIRMED_VOTES),
      ]);

      const venues = await service.getVenues(ALICE, { beer: ORVAL_ID });

      expect(venues.map((venue) => [venue.name, venue.status])).toEqual([
        ["Alpha", AvailabilityStatusEnum.UNKNOWN],
        ["Bravo", AvailabilityStatusEnum.GONE],
      ]);
    });

    it("returns an empty list for a beer that is not in the catalogue", async () => {
      given(THREE_VENUES, [linkTo(1, 1, ORVAL_ID, CONFIRMED_VOTES)]);

      expect(await service.getVenues(ALICE, { beer: 999 })).toEqual([]);
    });

    it("returns an empty list for a beer that no venue sells", async () => {
      given(THREE_VENUES, [linkTo(1, 1, ORVAL_ID, CONFIRMED_VOTES)]);

      expect(await service.getVenues(ALICE, { beer: CHIMAY_ID })).toEqual([]);
    });

    it("keeps the venues with a beer of the family and computes the state on those beers only", async () => {
      given(THREE_VENUES, [
        linkTo(1, 1, ORVAL_ID, CONFIRMED_VOTES),
        linkTo(2, 1, GUINNESS_ID, GONE_VOTES),
        linkTo(3, 2, GUINNESS_ID, CONFIRMED_VOTES),
        linkTo(4, 3, ORVAL_ID, CONFIRMED_VOTES),
      ]);

      const venues = await service.getVenues(ALICE, { family: BeerFamilyEnum.STOUT });

      expect(venues.map((venue) => [venue.name, venue.status])).toEqual([
        ["Alpha", AvailabilityStatusEnum.GONE],
        ["Bravo", AvailabilityStatusEnum.CONFIRMED],
      ]);
    });

    it("keeps the venues with a beer of any of the requested styles", async () => {
      given(THREE_VENUES, [
        linkTo(1, 1, GUINNESS_ID, CONFIRMED_VOTES),
        linkTo(2, 2, 31, CONFIRMED_VOTES),
        linkTo(3, 3, ORVAL_ID, CONFIRMED_VOTES),
      ]);

      expect(namesOf(await service.getVenues(ALICE, { style: [STOUT_STYLE_ID] }))).toEqual(["Alpha"]);
      expect(namesOf(await service.getVenues(ALICE, { style: [STOUT_STYLE_ID, IMPERIAL_STYLE_ID] }))).toEqual([
        "Alpha",
        "Bravo",
      ]);
    });

    it("combines the beer, family and style filters with AND on the same link", async () => {
      given(THREE_VENUES, [
        linkTo(1, 1, GUINNESS_ID, CONFIRMED_VOTES),
        linkTo(2, 2, 31, CONFIRMED_VOTES),
        linkTo(3, 3, ORVAL_ID, CONFIRMED_VOTES),
      ]);

      expect(
        namesOf(await service.getVenues(ALICE, { beer: GUINNESS_ID, family: BeerFamilyEnum.STOUT, style: [STOUT_STYLE_ID] })),
      ).toEqual(["Alpha"]);
      expect(await service.getVenues(ALICE, { beer: GUINNESS_ID, family: BeerFamilyEnum.TRAPPIST })).toEqual([]);
      expect(await service.getVenues(ALICE, { beer: GUINNESS_ID, style: [IMPERIAL_STYLE_ID] })).toEqual([]);
      expect(await service.getVenues(ALICE, { family: BeerFamilyEnum.TRAPPIST, style: [STOUT_STYLE_ID] })).toEqual([]);
    });

    it("requires a venue to hold one single link matching every filter", async () => {
      given(THREE_VENUES, [linkTo(1, 1, ORVAL_ID, CONFIRMED_VOTES), linkTo(2, 1, GUINNESS_ID, CONFIRMED_VOTES)]);

      expect(await service.getVenues(ALICE, { beer: ORVAL_ID, family: BeerFamilyEnum.STOUT })).toEqual([]);
    });

    it("keeps only the venues with a confirmed beer for the confirmed only filter, without beer filter", async () => {
      given(THREE_VENUES, [
        linkTo(1, 1, ORVAL_ID, GONE_VOTES),
        linkTo(2, 1, CHIMAY_ID, CONFIRMED_VOTES),
        linkTo(3, 2, ORVAL_ID, MAYBE_GONE_VOTES),
        linkTo(4, 3, ORVAL_ID, []),
      ]);

      const venues = await service.getVenues(ALICE, { confirmedOnly: true });

      expect(venues.map((venue) => [venue.name, venue.status])).toEqual([["Alpha", AvailabilityStatusEnum.CONFIRMED]]);
    });

    it("keeps a venue without any link out of the confirmed only answer and in the unfiltered one", async () => {
      given(THREE_VENUES, [linkTo(1, 1, ORVAL_ID, CONFIRMED_VOTES)]);

      expect(namesOf(await service.getVenues(ALICE, { confirmedOnly: true }))).toEqual(["Alpha"]);
      expect(namesOf(await service.getVenues(ALICE, { confirmedOnly: false }))).toEqual(["Alpha", "Bravo", "Charlie"]);
    });

    it("keeps only the venues where the filtered beer itself is confirmed", async () => {
      given(THREE_VENUES, [
        linkTo(1, 1, ORVAL_ID, CONFIRMED_VOTES),
        linkTo(2, 2, ORVAL_ID, GONE_VOTES),
        linkTo(3, 2, CHIMAY_ID, CONFIRMED_VOTES),
        linkTo(4, 3, ORVAL_ID, []),
      ]);

      expect(namesOf(await service.getVenues(ALICE, { beer: ORVAL_ID, confirmedOnly: true }))).toEqual(["Alpha"]);
      expect(namesOf(await service.getVenues(ALICE, { beer: ORVAL_ID, confirmedOnly: false }))).toEqual([
        "Alpha",
        "Bravo",
        "Charlie",
      ]);
    });

    it("passes the zone and the types to the repository whatever the beer filters", async () => {
      given([], []);

      await service.getVenues(ALICE, { north: 51, south: 50, east: 4, west: 3, type: [VenueTypeEnum.SHOP], beer: ORVAL_ID });

      expect(repository.findVenues).toHaveBeenCalledWith({
        bounds: { north: 51, south: 50, east: 4, west: 3 },
        types: [VenueTypeEnum.SHOP],
        search: "",
      });
    });

    it("gives each venue its distance from the position and sorts by distance then name", async () => {
      given(
        [
          at(1, "Brussels", 50.8503, 4.3517),
          at(2, "Lille", 50.6292, 3.0573),
          at(3, "Paris Zeta", 48.8566, 2.3522),
          at(4, "Paris Alpha", 48.8566, 2.3522),
        ],
        [linkTo(1, 1, ORVAL_ID, CONFIRMED_VOTES), linkTo(2, 2, ORVAL_ID, GONE_VOTES)],
      );

      const venues = await service.getVenues(ALICE, PARIS);

      expect(namesOf(venues)).toEqual(["Paris Alpha", "Paris Zeta", "Lille", "Brussels"]);
      expect(venues[0].distanceKm).toBe(0);
      expect(venues[1].distanceKm).toBe(0);
      expect(venues[2].distanceKm).toBeGreaterThan(203);
      expect(venues[2].distanceKm).toBeLessThan(205);
      expect(venues[3].distanceKm).toBeGreaterThan(venues[2].distanceKm as number);
      expect(venues[2].status).toBe(AvailabilityStatusEnum.GONE);
    });

    it("keeps the venues at the radius or closer and drops the farther ones", async () => {
      given(
        [at(1, "Near", 48.8566, 2.3622), at(2, "Edge", 48.8566, 2.3722), at(3, "Far", 48.8566, 2.4522)],
        [],
      );
      const distances = (await service.getVenues(ALICE, PARIS)).map((venue) => venue.distanceKm as number);
      const edgeDistance = distances[1];

      const venues = await service.getVenues(ALICE, { ...PARIS, radiusKm: edgeDistance });

      expect(namesOf(venues)).toEqual(["Near", "Edge"]);
      expect(distances[2]).toBeGreaterThan(edgeDistance);
    });

    it("treats a position at latitude 0 and longitude 0 as supplied and applies the radius", async () => {
      given([at(1, "Origin", 0, 0), at(2, "Away", 10, 10)], []);

      const venues = await service.getVenues(ALICE, { latitude: 0, longitude: 0, radiusKm: 5 });

      expect(venues.map((venue) => [venue.name, venue.distanceKm])).toEqual([["Origin", 0]]);
    });

    it("gives the distance without radius to every venue left by the other filters", async () => {
      given(
        [at(1, "Far", 50.6292, 3.0573), at(2, "Near", 48.8566, 2.3522), at(3, "Unlinked", 48.8566, 2.3522)],
        [linkTo(1, 1, ORVAL_ID, CONFIRMED_VOTES), linkTo(2, 2, ORVAL_ID, CONFIRMED_VOTES)],
      );

      const venues = await service.getVenues(ALICE, { ...PARIS, beer: ORVAL_ID });

      expect(namesOf(venues)).toEqual(["Near", "Far"]);
      expect(venues.every((venue) => venue.distanceKm !== null)).toBe(true);
    });

    it("keeps the order of the repository and no distance without position", async () => {
      given([toRecord(2, "Bravo"), toRecord(1, "Alpha"), toRecord(3, "Charlie")], []);

      const venues = await service.getVenues(ALICE, {});

      expect(namesOf(venues)).toEqual(["Bravo", "Alpha", "Charlie"]);
      expect(venues.map((venue) => venue.distanceKm)).toEqual([null, null, null]);
    });
  });

  describe("getVenues undiscovered", () => {
    const ORVAL_ID = 10;
    const CHIMAY_ID = 20;
    const GUINNESS_ID = 30;

    const beerOf = (id: number, family: BeerFamilyEnum): BeerDto => ({
      id,
      name: `Beer ${id}`,
      breweryName: `Brasserie ${id}`,
      country: "BE",
      styleId: id,
      styleName: `Style ${id}`,
      family,
      abv: 5,
      aromas: [],
      formats: [],
      description: "Une bière.",
      bitternessLevel: null,
      colorLevel: null,
      styleColorRange: null,
      source: BeerSourceEnum.OFFICIAL,
      createdBy: null,
    });

    const linkTo = (id: number, venueId: number, beerId: number, votes: VenueLinkDto["votes"]): VenueLinkDto => ({
      id,
      venueId,
      beerId,
      votes,
    });

    const namesOf = (venues: { name: string }[]) => venues.map((venue) => venue.name);

    const THREE_VENUES = [toRecord(1, "Alpha"), toRecord(2, "Bravo"), toRecord(3, "Charlie")];

    const given = (links: VenueLinkDto[], drunkBeerIds: number[]) => {
      repository.findVenues.mockResolvedValue(THREE_VENUES);
      repository.findLinks.mockResolvedValue(links);
      beersService.getBeersByIds.mockResolvedValue([
        beerOf(ORVAL_ID, BeerFamilyEnum.TRAPPIST),
        beerOf(CHIMAY_ID, BeerFamilyEnum.TRAPPIST),
        beerOf(GUINNESS_ID, BeerFamilyEnum.STOUT),
      ]);
      tastingsService.getDrunkBeerIds.mockResolvedValue(drunkBeerIds);
    };

    it("keeps the venues with a beer not yet drunk and drops the venue without any link", async () => {
      given([linkTo(1, 1, ORVAL_ID, []), linkTo(2, 2, CHIMAY_ID, [])], []);

      const venues = await service.getVenues(ALICE, { undiscovered: true });

      expect(namesOf(venues)).toEqual(["Alpha", "Bravo"]);
      expect(tastingsService.getDrunkBeerIds).toHaveBeenCalledExactlyOnceWith(ALICE);
    });

    it("drops a venue whose every beer is drunk and keeps one with a single beer left", async () => {
      given(
        [
          linkTo(1, 1, ORVAL_ID, []),
          linkTo(2, 2, ORVAL_ID, []),
          linkTo(3, 2, CHIMAY_ID, []),
          linkTo(4, 3, ORVAL_ID, []),
          linkTo(5, 3, CHIMAY_ID, []),
          linkTo(6, 3, GUINNESS_ID, []),
        ],
        [ORVAL_ID, CHIMAY_ID],
      );

      const venues = await service.getVenues(ALICE, { undiscovered: true });

      expect(namesOf(venues)).toEqual(["Charlie"]);
    });

    it("reads the drunk beers of the current user only", async () => {
      given([linkTo(1, 1, ORVAL_ID, [])], [ORVAL_ID]);
      tastingsService.getDrunkBeerIds.mockImplementation((userId: number) => Promise.resolve(userId === ALICE ? [ORVAL_ID] : []));

      expect(await service.getVenues(ALICE, { undiscovered: true })).toEqual([]);
      expect(namesOf(await service.getVenues(BOB, { undiscovered: true }))).toEqual(["Alpha"]);
      expect(tastingsService.getDrunkBeerIds).toHaveBeenCalledWith(BOB);
    });

    it.each([
      ["false", { undiscovered: false }],
      ["absent", {}],
    ])("does not read the drunk beers and keeps every venue when undiscovered is %s", async (_label, query) => {
      given([linkTo(1, 1, ORVAL_ID, [])], [ORVAL_ID]);

      const venues = await service.getVenues(ALICE, query);

      expect(namesOf(venues)).toEqual(["Alpha", "Bravo", "Charlie"]);
      expect(tastingsService.getDrunkBeerIds).not.toHaveBeenCalled();
    });

    it("judges only the links kept by the beer filter", async () => {
      given([linkTo(1, 1, ORVAL_ID, []), linkTo(2, 1, CHIMAY_ID, []), linkTo(3, 2, ORVAL_ID, [])], [ORVAL_ID]);
      tastingsService.getDrunkBeerIds.mockImplementation((userId: number) => Promise.resolve(userId === ALICE ? [ORVAL_ID] : []));

      expect(await service.getVenues(ALICE, { beer: ORVAL_ID, undiscovered: true })).toEqual([]);
      expect(namesOf(await service.getVenues(BOB, { beer: ORVAL_ID, undiscovered: true }))).toEqual(["Alpha", "Bravo"]);
      expect(namesOf(await service.getVenues(ALICE, { family: BeerFamilyEnum.TRAPPIST, undiscovered: true }))).toEqual([
        "Alpha",
      ]);
    });

    it("still computes the state on the retained links of the venue", async () => {
      given([linkTo(1, 1, ORVAL_ID, CONFIRMED_VOTES), linkTo(2, 1, CHIMAY_ID, GONE_VOTES)], [ORVAL_ID]);

      const venues = await service.getVenues(ALICE, { undiscovered: true });

      expect(venues.map((venue) => [venue.name, venue.status])).toEqual([["Alpha", AvailabilityStatusEnum.CONFIRMED]]);
    });

    it("applies confirmedOnly after the undiscovered filter", async () => {
      given([linkTo(1, 1, ORVAL_ID, CONFIRMED_VOTES), linkTo(2, 2, CHIMAY_ID, GONE_VOTES), linkTo(3, 3, ORVAL_ID, CONFIRMED_VOTES)], [
        ORVAL_ID,
      ]);

      const venues = await service.getVenues(ALICE, { undiscovered: true, confirmedOnly: true });

      expect(venues).toEqual([]);
      expect(namesOf(await service.getVenues(ALICE, { undiscovered: true, confirmedOnly: false }))).toEqual(["Bravo"]);
    });

    it("sorts the remaining venues by distance when a position is given", async () => {
      repository.findVenues.mockResolvedValue([
        { ...toRecord(1, "Far"), latitude: 50.64, longitude: 3.06 },
        { ...toRecord(2, "Near"), latitude: 48.86, longitude: 2.35 },
        { ...toRecord(3, "Drunk"), latitude: 48.86, longitude: 2.36 },
      ]);
      repository.findLinks.mockResolvedValue([
        linkTo(1, 1, CHIMAY_ID, []),
        linkTo(2, 2, CHIMAY_ID, []),
        linkTo(3, 3, ORVAL_ID, []),
      ]);
      tastingsService.getDrunkBeerIds.mockResolvedValue([ORVAL_ID]);

      const venues = await service.getVenues(ALICE, { ...PARIS, undiscovered: true });

      expect(namesOf(venues)).toEqual(["Near", "Far"]);
    });

    describe("combined with the radius, the type and the style", () => {
      const NEAR = { latitude: 48.86, longitude: 2.35 };
      const FAR = { latitude: 50.64, longitude: 3.06 };
      const RADIUS_KM = 50;

      const recordOf = (id: number, name: string, place: typeof NEAR, type: VenueTypeEnum): VenueRecordDto => ({
        ...toRecord(id, name),
        ...place,
        type,
      });

      const givenVenues = () => {
        const records = [
          recordOf(1, "Near bar", NEAR, VenueTypeEnum.BAR),
          recordOf(2, "Near shop", NEAR, VenueTypeEnum.SHOP),
          recordOf(3, "Far bar", FAR, VenueTypeEnum.BAR),
          recordOf(4, "Near drunk", NEAR, VenueTypeEnum.BAR),
        ];
        repository.findVenues.mockImplementation(({ types }: { types: VenueTypeEnum[] }) =>
          Promise.resolve(records.filter((record) => types.length === 0 || types.includes(record.type))),
        );
        repository.findLinks.mockImplementation((venueIds: number[]) =>
          Promise.resolve(
            [
              linkTo(1, 1, CHIMAY_ID, []),
              linkTo(2, 2, CHIMAY_ID, []),
              linkTo(3, 3, CHIMAY_ID, []),
              linkTo(4, 4, ORVAL_ID, []),
              linkTo(5, 1, GUINNESS_ID, []),
            ].filter((link) => venueIds.includes(link.venueId)),
          ),
        );
        beersService.getBeersByIds.mockResolvedValue([
          beerOf(ORVAL_ID, BeerFamilyEnum.TRAPPIST),
          beerOf(CHIMAY_ID, BeerFamilyEnum.TRAPPIST),
          beerOf(GUINNESS_ID, BeerFamilyEnum.STOUT),
        ]);
        tastingsService.getDrunkBeerIds.mockResolvedValue([ORVAL_ID]);
      };

      it("keeps only the nearby venues with a beer left to discover when a radius is given", async () => {
        givenVenues();

        expect(namesOf(await service.getVenues(ALICE, { ...PARIS, undiscovered: true }))).toEqual([
          "Near bar",
          "Near shop",
          "Far bar",
        ]);
        expect(namesOf(await service.getVenues(ALICE, { ...PARIS, radiusKm: RADIUS_KM, undiscovered: true }))).toEqual([
          "Near bar",
          "Near shop",
        ]);
      });

      it("keeps the intersection of the type and of the beers left to discover", async () => {
        givenVenues();

        const venues = await service.getVenues(ALICE, { type: [VenueTypeEnum.BAR], undiscovered: true });

        expect(namesOf(venues)).toEqual(["Near bar", "Far bar"]);
      });

      it("keeps the intersection of the style and of the beers left to discover", async () => {
        givenVenues();

        const venues = await service.getVenues(ALICE, { style: [GUINNESS_ID], undiscovered: true });

        expect(namesOf(venues)).toEqual(["Near bar"]);
      });

      it("intersects the radius, the type and the beers left to discover", async () => {
        givenVenues();

        const venues = await service.getVenues(ALICE, {
          ...PARIS,
          radiusKm: RADIUS_KM,
          type: [VenueTypeEnum.BAR],
          undiscovered: true,
        });

        expect(namesOf(venues)).toEqual(["Near bar"]);
      });
    });

    it("passes the search text to the repository and keeps its order", async () => {
      repository.findVenues.mockResolvedValue([toRecord(2, "Bravo"), toRecord(1, "Alpha")]);
      repository.findLinks.mockResolvedValue([linkTo(1, 1, ORVAL_ID, []), linkTo(2, 2, ORVAL_ID, [])]);

      const venues = await service.getVenues(ALICE, { q: "paris", undiscovered: true });

      expect(repository.findVenues).toHaveBeenCalledWith(expect.objectContaining({ search: "paris" }));
      expect(namesOf(venues)).toEqual(["Bravo", "Alpha"]);
    });

    it("rejects an invalid zone, position or radius before reading the drunk beers", async () => {
      await expect(service.getVenues(ALICE, { north: 50, undiscovered: true })).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.getVenues(ALICE, { latitude: 48.8, undiscovered: true })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(service.getVenues(ALICE, { radiusKm: 5, undiscovered: true })).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(tastingsService.getDrunkBeerIds).not.toHaveBeenCalled();
      expect(repository.findVenues).not.toHaveBeenCalled();
    });
  });

  describe("getVenues visited", () => {
    const ORVAL_ID = 10;
    const CHIMAY_ID = 20;
    const STOUT_ID = 30;
    const RADIUS_KM = 50;
    const NEAR = { latitude: 48.86, longitude: 2.35 };
    const FAR = { latitude: 50.64, longitude: 3.06 };

    const namesOf = (venues: { name: string }[]) => venues.map((venue) => venue.name);

    const visitTo = (venueId: number, checkinCount: number) => ({
      venueId,
      checkinCount,
      lastCheckinAt: "2026-10-09T18:30:00.000Z",
    });

    const THREE_VENUES = [toRecord(1, "Alpha"), toRecord(2, "Bravo"), toRecord(3, "Charlie")];

    const givenVisits = (visits: ReturnType<typeof visitTo>[]) => {
      repository.findVenues.mockResolvedValue(THREE_VENUES);
      tastingsService.getVenueVisits.mockResolvedValue(visits);
    };

    it("keeps only the venues with a visit and gives each its count", async () => {
      givenVisits([visitTo(3, 2), visitTo(1, 1)]);

      const venues = await service.getVenues(ALICE, { visited: true });

      expect(venues.map(({ name, checkinCount }) => [name, checkinCount])).toEqual([
        ["Alpha", 1],
        ["Charlie", 2],
      ]);
    });

    it("returns an empty list for a user without any visit", async () => {
      givenVisits([]);

      expect(await service.getVenues(BOB, { visited: true })).toEqual([]);
    });

    it("drops a venue whose visit count is zero", async () => {
      givenVisits([visitTo(1, 0), visitTo(2, 1)]);

      expect(namesOf(await service.getVenues(ALICE, { visited: true }))).toEqual(["Bravo"]);
    });

    it.each([
      ["false", { visited: false }],
      ["absent", {}],
    ])("keeps every venue when visited is %s", async (_label, query) => {
      givenVisits([visitTo(1, 1)]);

      expect(namesOf(await service.getVenues(ALICE, query))).toEqual(["Alpha", "Bravo", "Charlie"]);
    });

    it("reads the visits of the current user only", async () => {
      givenVisits([]);
      tastingsService.getVenueVisits.mockImplementation((userId: number) =>
        Promise.resolve(userId === ALICE ? [visitTo(2, 1)] : []),
      );

      expect(namesOf(await service.getVenues(ALICE, { visited: true }))).toEqual(["Bravo"]);
      expect(await service.getVenues(BOB, { visited: true })).toEqual([]);
    });

    it("keeps the order of the search text", async () => {
      repository.findVenues.mockResolvedValue([toRecord(2, "Bravo"), toRecord(1, "Alpha")]);
      tastingsService.getVenueVisits.mockResolvedValue([visitTo(1, 1), visitTo(2, 1)]);

      const venues = await service.getVenues(ALICE, { q: "lille", visited: true });

      expect(repository.findVenues).toHaveBeenCalledWith(expect.objectContaining({ search: "lille" }));
      expect(namesOf(venues)).toEqual(["Bravo", "Alpha"]);
    });

    it("intersects the visits with the undiscovered beers", async () => {
      givenVisits([visitTo(1, 1), visitTo(2, 1)]);
      repository.findLinks.mockResolvedValue([
        { id: 1, venueId: 1, beerId: ORVAL_ID, votes: [] },
        { id: 2, venueId: 2, beerId: CHIMAY_ID, votes: [] },
        { id: 3, venueId: 3, beerId: CHIMAY_ID, votes: [] },
      ]);
      tastingsService.getDrunkBeerIds.mockResolvedValue([ORVAL_ID]);

      const venues = await service.getVenues(ALICE, { visited: true, undiscovered: true });

      expect(namesOf(venues)).toEqual(["Bravo"]);
    });

    it("applies confirmedOnly after the visited filter", async () => {
      givenVisits([visitTo(1, 1), visitTo(2, 1)]);
      repository.findLinks.mockResolvedValue([
        { id: 1, venueId: 1, beerId: ORVAL_ID, votes: CONFIRMED_VOTES },
        { id: 2, venueId: 2, beerId: CHIMAY_ID, votes: GONE_VOTES },
        { id: 3, venueId: 3, beerId: CHIMAY_ID, votes: CONFIRMED_VOTES },
      ]);

      expect(namesOf(await service.getVenues(ALICE, { visited: true, confirmedOnly: true }))).toEqual(["Alpha"]);
    });

    it("applies the radius after the visited filter and sorts by distance", async () => {
      repository.findVenues.mockResolvedValue([
        { ...toRecord(1, "Far visited"), ...FAR },
        { ...toRecord(2, "Near visited"), ...NEAR },
        { ...toRecord(3, "Near not visited"), ...NEAR },
      ]);
      tastingsService.getVenueVisits.mockResolvedValue([visitTo(1, 1), visitTo(2, 1)]);

      expect(namesOf(await service.getVenues(ALICE, { ...PARIS, visited: true }))).toEqual(["Near visited", "Far visited"]);
      expect(namesOf(await service.getVenues(ALICE, { ...PARIS, radiusKm: RADIUS_KM, visited: true }))).toEqual([
        "Near visited",
      ]);
    });

    describe("combined with the beer filters and the type", () => {
      const TRAPPIST_STYLE_ID = 100;
      const STOUT_STYLE_ID = 300;

      const beerOf = (id: number, family: BeerFamilyEnum, styleId: number): BeerDto => ({
        id,
        name: `Beer ${id}`,
        breweryName: `Brasserie ${id}`,
        country: "BE",
        styleId,
        styleName: `Style ${styleId}`,
        family,
        abv: 5,
        aromas: [],
        formats: [],
        description: "Une bière.",
        bitternessLevel: null,
        colorLevel: null,
        styleColorRange: null,
        source: BeerSourceEnum.OFFICIAL,
        createdBy: null,
      });

      const FOUR_VENUES = [toRecord(1, "Alpha"), toRecord(2, "Bravo"), toRecord(3, "Charlie"), toRecord(4, "Delta")];

      const givenStoutAndTrappist = () => {
        repository.findVenues.mockResolvedValue(FOUR_VENUES);
        repository.findLinks.mockResolvedValue([
          { id: 1, venueId: 1, beerId: CHIMAY_ID, votes: [] },
          { id: 2, venueId: 1, beerId: STOUT_ID, votes: [] },
          { id: 3, venueId: 2, beerId: CHIMAY_ID, votes: [] },
          { id: 4, venueId: 3, beerId: STOUT_ID, votes: [] },
          { id: 5, venueId: 4, beerId: STOUT_ID, votes: [] },
        ]);
        beersService.getBeersByIds.mockResolvedValue([
          beerOf(CHIMAY_ID, BeerFamilyEnum.TRAPPIST, TRAPPIST_STYLE_ID),
          beerOf(STOUT_ID, BeerFamilyEnum.STOUT, STOUT_STYLE_ID),
        ]);
        tastingsService.getVenueVisits.mockResolvedValue([visitTo(1, 1), visitTo(2, 1), visitTo(4, 3)]);
      };

      it.each([
        ["family", { family: BeerFamilyEnum.STOUT }],
        ["style", { style: [STOUT_STYLE_ID] }],
        ["beer", { beer: STOUT_ID }],
      ])(
        "keeps the visited venues with a beer matching the %s filter, not the visited without nor the matching not visited",
        async (_label, filter) => {
          givenStoutAndTrappist();

          const venues = await service.getVenues(ALICE, { ...filter, visited: true });

          expect(venues.map(({ name, checkinCount }) => [name, checkinCount])).toEqual([
            ["Alpha", 1],
            ["Delta", 3],
          ]);
        },
      );

      it("keeps the visited venues of the requested types only", async () => {
        repository.findVenues.mockResolvedValue([toRecord(1, "Alpha"), toRecord(3, "Charlie")]);
        tastingsService.getVenueVisits.mockResolvedValue([visitTo(1, 1)]);

        const venues = await service.getVenues(ALICE, { type: [VenueTypeEnum.SHOP], visited: true });

        expect(repository.findVenues).toHaveBeenCalledWith(expect.objectContaining({ types: [VenueTypeEnum.SHOP] }));
        expect(namesOf(venues)).toEqual(["Alpha"]);
      });
    });

    it("rejects an invalid zone, position or radius before reading the visits", async () => {
      await expect(service.getVenues(ALICE, { north: 50, visited: true })).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.getVenues(ALICE, { latitude: 48.8, visited: true })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(service.getVenues(ALICE, { radiusKm: 5, visited: true })).rejects.toBeInstanceOf(BadRequestException);

      expect(tastingsService.getVenueVisits).not.toHaveBeenCalled();
    });
  });

  describe("getVenues search", () => {
    const BRUSSELS_TEXT = "bruxelles";
    const ORVAL_ID = 10;

    const at = (id: number, name: string, latitude: number, longitude: number): VenueRecordDto => ({
      ...toRecord(id, name),
      latitude,
      longitude,
    });

    const namesOf = (venues: { name: string }[]) => venues.map((venue) => venue.name);

    it("passes the text as the search of the area filters with the zone and the types", async () => {
      await service.getVenues(ALICE, {
        north: 51,
        south: 50,
        east: 4,
        west: 3,
        type: [VenueTypeEnum.SHOP],
        q: BRUSSELS_TEXT,
      });

      expect(repository.findVenues).toHaveBeenCalledWith({
        bounds: { north: 51, south: 50, east: 4, west: 3 },
        types: [VenueTypeEnum.SHOP],
        search: BRUSSELS_TEXT,
      });
    });

    it("passes an empty search when the text is an empty string", async () => {
      await service.getVenues(ALICE, { q: "" });

      expect(repository.findVenues).toHaveBeenCalledWith({ bounds: null, types: [], search: "" });
    });

    it("keeps the relevance order of the repository and gives each venue its distance when a text and a position are given", async () => {
      repository.findVenues.mockResolvedValue([
        at(1, "Far first", 50.8503, 4.3517),
        at(2, "Near second", 48.8566, 2.3522),
        at(3, "Middle third", 50.6292, 3.0573),
      ]);

      const venues = await service.getVenues(ALICE, { ...PARIS, q: BRUSSELS_TEXT });

      expect(namesOf(venues)).toEqual(["Far first", "Near second", "Middle third"]);
      expect(venues.map((venue) => venue.distanceKm)).toEqual([expect.any(Number), 0, expect.any(Number)]);
      expect(venues[0].distanceKm as number).toBeGreaterThan(venues[2].distanceKm as number);
    });

    it("still sorts by distance when the position comes with an empty text", async () => {
      repository.findVenues.mockResolvedValue([at(1, "Far first", 50.8503, 4.3517), at(2, "Near second", 48.8566, 2.3522)]);

      const venues = await service.getVenues(ALICE, { ...PARIS, q: "" });

      expect(namesOf(venues)).toEqual(["Near second", "Far first"]);
    });

    it("keeps the relevance order without position and gives no distance", async () => {
      repository.findVenues.mockResolvedValue([toRecord(2, "Bravo"), toRecord(1, "Alpha")]);

      const venues = await service.getVenues(ALICE, { q: "a" });

      expect(namesOf(venues)).toEqual(["Bravo", "Alpha"]);
      expect(venues.map((venue) => venue.distanceKm)).toEqual([null, null]);
    });

    it("applies the radius on the venues found while keeping the relevance order", async () => {
      repository.findVenues.mockResolvedValue([
        at(1, "Far first", 50.8503, 4.3517),
        at(2, "Near second", 48.8566, 2.3522),
        at(3, "Near third", 48.8566, 2.3622),
      ]);

      const venues = await service.getVenues(ALICE, { ...PARIS, radiusKm: 5, q: BRUSSELS_TEXT });

      expect(namesOf(venues)).toEqual(["Near second", "Near third"]);
    });

    it("applies the beer filter on the venues found while keeping the relevance order", async () => {
      repository.findVenues.mockResolvedValue([toRecord(1, "Zulu"), toRecord(2, "Alpha"), toRecord(3, "Mike")]);
      repository.findLinks.mockResolvedValue([
        { id: 1, venueId: 1, beerId: ORVAL_ID, votes: [] },
        { id: 2, venueId: 3, beerId: ORVAL_ID, votes: [] },
      ]);
      beersService.getBeersByIds.mockResolvedValue([
        {
          id: ORVAL_ID,
          name: "Orval",
          breweryName: "Orval",
          country: "BE",
          styleId: 100,
          styleName: "Trappiste",
          family: BeerFamilyEnum.TRAPPIST,
          abv: 6.2,
          aromas: [],
          formats: [],
          description: "Une bière.",
        },
      ]);

      const venues = await service.getVenues(ALICE, { beer: ORVAL_ID, q: "u" });

      expect(namesOf(venues)).toEqual(["Zulu", "Mike"]);
    });

    describe("combined with the other filters", () => {
      const CHIMAY_ID = 20;
      const TRAPPIST_STYLE_ID = 100;
      const STOUT_STYLE_ID = 300;

      const beerOf = (id: number, family: BeerFamilyEnum, styleId: number): BeerDto => ({
        id,
        name: `Beer ${id}`,
        breweryName: `Brasserie ${id}`,
        country: "BE",
        styleId,
        styleName: `Style ${styleId}`,
        family,
        abv: 5,
        aromas: [],
        formats: [],
        description: "Une bière.",
        bitternessLevel: null,
        colorLevel: null,
        styleColorRange: null,
        source: BeerSourceEnum.OFFICIAL,
        createdBy: null,
      });

      const linkTo = (id: number, venueId: number, beerId: number, votes: VenueLinkDto["votes"]): VenueLinkDto => ({
        id,
        venueId,
        beerId,
        votes,
      });

      const givenFoundVenues = () => {
        repository.findVenues.mockResolvedValue([toRecord(1, "Zulu"), toRecord(2, "Alpha"), toRecord(3, "Mike")]);
        repository.findLinks.mockResolvedValue([
          linkTo(1, 1, ORVAL_ID, CONFIRMED_VOTES),
          linkTo(2, 2, CHIMAY_ID, CONFIRMED_VOTES),
          linkTo(3, 3, ORVAL_ID, GONE_VOTES),
        ]);
        beersService.getBeersByIds.mockResolvedValue([
          beerOf(ORVAL_ID, BeerFamilyEnum.TRAPPIST, TRAPPIST_STYLE_ID),
          beerOf(CHIMAY_ID, BeerFamilyEnum.STOUT, STOUT_STYLE_ID),
        ]);
      };

      it("keeps only the confirmed venues among the venues found by the text", async () => {
        givenFoundVenues();

        expect(namesOf(await service.getVenues(ALICE, { q: "u" }))).toEqual(["Zulu", "Alpha", "Mike"]);
        expect(namesOf(await service.getVenues(ALICE, { q: "u", confirmedOnly: true }))).toEqual(["Zulu", "Alpha"]);
      });

      it.each([
        ["family", { family: BeerFamilyEnum.TRAPPIST }],
        ["style", { style: [TRAPPIST_STYLE_ID] }],
        ["beer", { beer: ORVAL_ID }],
      ])("drops the venues found by the text whose beers do not match the %s filter", async (_label, filter) => {
        givenFoundVenues();

        expect(namesOf(await service.getVenues(ALICE, { q: "u", ...filter }))).toEqual(["Zulu", "Mike"]);
      });

      it("intersects the text with the confirmation and the beer filters", async () => {
        givenFoundVenues();

        const venues = await service.getVenues(ALICE, { q: "u", confirmedOnly: true, family: BeerFamilyEnum.TRAPPIST });

        expect(namesOf(venues)).toEqual(["Zulu"]);
      });
    });

    it("rejects a bad zone before reading anything even with a text", async () => {
      await expect(service.getVenues(ALICE, { north: 50, south: 51, east: 4, west: 3, q: BRUSSELS_TEXT })).rejects.toThrow(
        new BadRequestException(SOUTH_ABOVE_NORTH_MESSAGE),
      );
      expect(repository.findVenues).not.toHaveBeenCalled();
    });

    it("rejects a radius without position before reading anything even with a text", async () => {
      await expect(service.getVenues(ALICE, { radiusKm: 5, q: BRUSSELS_TEXT })).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.findVenues).not.toHaveBeenCalled();
    });
  });

  describe("getVenue", () => {
    it("returns the venue with its best state", async () => {
      repository.findVenueById.mockResolvedValue(toRecord(5, "Echo"));
      repository.findLinks.mockResolvedValue([toLink(20, 5, CONFIRMED_VOTES)]);

      expect(await service.getVenue(ALICE, 5)).toEqual({
        ...toRecord(5, "Echo"),
        distanceKm: null,
        status: AvailabilityStatusEnum.CONFIRMED,
        ...NO_VISIT,
        isApproximateMatch: false,
      });
      expect(repository.findLinks).toHaveBeenCalledWith([5]);
    });

    it("gives the venue the count and the last date of the visits of the user", async () => {
      repository.findVenueById.mockResolvedValue(toRecord(5, "Echo"));
      tastingsService.getVenueVisits.mockResolvedValue([
        { venueId: 5, checkinCount: 2, lastCheckinAt: "2026-10-09T18:30:00.000Z" },
      ]);

      const venue = await service.getVenue(ALICE, 5);

      expect(venue).toEqual({
        ...toRecord(5, "Echo"),
        distanceKm: null,
        status: AvailabilityStatusEnum.UNKNOWN,
        checkinCount: 2,
        isApproximateMatch: false,
        lastCheckinAt: "2026-10-09T18:30:00.000Z",
      });
      expect(tastingsService.getVenueVisits).toHaveBeenCalledExactlyOnceWith(ALICE, [5]);
    });

    it("gives the unknown state to a venue without beer", async () => {
      repository.findVenueById.mockResolvedValue(toRecord(5, "Echo"));

      expect(await service.getVenue(ALICE, 5)).toEqual({
        ...toRecord(5, "Echo"),
        distanceKm: null,
        status: AvailabilityStatusEnum.UNKNOWN,
        ...NO_VISIT,
        isApproximateMatch: false,
      });
    });

    it("throws not found for an unknown venue and reads no link", async () => {
      repository.findVenueById.mockResolvedValue(null);

      await expect(service.getVenue(ALICE, 42)).rejects.toThrow(new NotFoundException("Venue 42 not found."));
      expect(repository.findLinks).not.toHaveBeenCalled();
      expect(tastingsService.getVenueVisits).not.toHaveBeenCalled();
    });
  });

  describe("ensureVenueExists", () => {
    it("resolves with nothing for a known venue", async () => {
      repository.existsById.mockResolvedValue(true);

      await expect(service.ensureVenueExists(5)).resolves.toBeUndefined();
      expect(repository.existsById).toHaveBeenCalledExactlyOnceWith(5);
    });

    it("throws the not found of getVenue for an unknown venue", async () => {
      repository.existsById.mockResolvedValue(false);

      const rejection = service.ensureVenueExists(42);

      await expect(rejection).rejects.toBeInstanceOf(NotFoundException);
      await expect(rejection).rejects.toThrow(new NotFoundException("Venue 42 not found."));
      expect(repository.existsById).toHaveBeenCalledExactlyOnceWith(42);
    });
  });

  describe("getBeerVenues", () => {
    const at = (id: number, name: string, latitude: number, longitude: number): VenueRecordDto => ({
      ...toRecord(id, name),
      latitude,
      longitude,
    });

    const daysAgo = (days: number): Date => new Date(NOW.getTime() - days * DAY_MS);

    const vote = (userId: number | null, sense: VoteSenseEnum, votedAt: Date) => ({ userId, sense, votedAt });

    const given = (venues: VenueRecordDto[], links: VenueLinkDto[]) => {
      repository.findVenuesByIds.mockResolvedValue(venues);
      repository.findLinksByBeer.mockResolvedValue(links);
    };

    const namesOf = (beerVenues: { venueName: string }[]) => beerVenues.map((beerVenue) => beerVenue.venueName);

    it.each([
      ["a latitude without longitude", { latitude: 48.8 }],
      ["a longitude without latitude", { longitude: 2.3 }],
      ["a latitude of 0 without longitude", { latitude: 0 }],
      ["a longitude of 0 without latitude", { longitude: 0 }],
    ])("rejects %s before looking for the beer", async (_label, query) => {
      await expect(service.getBeerVenues(BEER_ID, query)).rejects.toThrow(new BadRequestException(POSITION_MESSAGE));
      expect(beersService.getBeer).not.toHaveBeenCalled();
      expect(repository.findLinksByBeer).not.toHaveBeenCalled();
      expect(repository.findVenuesByIds).not.toHaveBeenCalled();
    });

    it("rejects a half position on an unknown beer with the 400 rather than the 404", async () => {
      beersService.getBeer.mockRejectedValue(new NotFoundException("Beer 42 not found."));

      await expect(service.getBeerVenues(42, { latitude: 48.8 })).rejects.toThrow(
        new BadRequestException(POSITION_MESSAGE),
      );
    });

    it("throws not found for an unknown beer and reads no link nor venue", async () => {
      beersService.getBeer.mockRejectedValue(new NotFoundException("Beer 42 not found."));

      await expect(service.getBeerVenues(42, {})).rejects.toThrow(new NotFoundException("Beer 42 not found."));
      expect(beersService.getBeer).toHaveBeenCalledWith(42);
      expect(repository.findLinksByBeer).not.toHaveBeenCalled();
      expect(repository.findVenuesByIds).not.toHaveBeenCalled();
    });

    it("returns an empty list for a beer without link", async () => {
      expect(await service.getBeerVenues(BEER_ID, {})).toEqual([]);
      expect(repository.findLinksByBeer).toHaveBeenCalledWith(BEER_ID);
      expect(repository.findVenuesByIds).toHaveBeenCalledWith([]);
    });

    it("sorts five venues by state, then last confirmation, with no distance", async () => {
      const olderConfirmed = [vote(1, VoteSenseEnum.STILL, daysAgo(5)), vote(2, VoteSenseEnum.STILL, daysAgo(4))];
      const newerConfirmed = [vote(1, VoteSenseEnum.STILL, daysAgo(2)), vote(2, VoteSenseEnum.STILL, daysAgo(1))];
      given(
        [at(1, "Echo", 50, 3), at(2, "Delta", 50, 3), at(3, "Charlie", 50, 3), at(4, "Bravo", 50, 3), at(5, "Alpha", 50, 3)],
        [
          toLink(1, 1, GONE_VOTES),
          toLink(2, 2, []),
          toLink(3, 3, MAYBE_GONE_VOTES),
          toLink(4, 4, olderConfirmed),
          toLink(5, 5, newerConfirmed),
        ],
      );

      const result = await service.getBeerVenues(BEER_ID, {});

      expect(namesOf(result)).toEqual(["Alpha", "Bravo", "Charlie", "Delta", "Echo"]);
      expect(result.map((beerVenue) => beerVenue.status)).toEqual([
        AvailabilityStatusEnum.CONFIRMED,
        AvailabilityStatusEnum.CONFIRMED,
        AvailabilityStatusEnum.MAYBE_GONE,
        AvailabilityStatusEnum.UNKNOWN,
        AvailabilityStatusEnum.GONE,
      ]);
      expect(result.map((beerVenue) => beerVenue.distanceKm)).toEqual([null, null, null, null, null]);
      expect(result[0].lastConfirmedAt).toBe(daysAgo(1).toISOString());
      expect(result[1].lastConfirmedAt).toBe(daysAgo(4).toISOString());
      expect(result[3].lastConfirmedAt).toBeNull();
    });

    it("puts the most recent confirmation first inside a state even against the name order", async () => {
      given(
        [at(1, "Alpha", 50, 3), at(2, "Zeta", 50, 3)],
        [toLink(1, 1, [vote(1, VoteSenseEnum.STILL, daysAgo(9))]), toLink(2, 2, [vote(1, VoteSenseEnum.STILL, daysAgo(8))])],
      );

      expect(namesOf(await service.getBeerVenues(BEER_ID, {}))).toEqual(["Zeta", "Alpha"]);
    });

    it("puts a never confirmed link after a confirmed one of the same state, then sorts by name", async () => {
      const expired = [vote(1, VoteSenseEnum.STILL, daysAgo(40))];
      given(
        [at(1, "Aaa Never", 50, 3), at(2, "Zzz Expired", 50, 3), at(3, "Bbb Never", 50, 3)],
        [toLink(1, 1, []), toLink(2, 2, expired), toLink(3, 3, [])],
      );

      const result = await service.getBeerVenues(BEER_ID, {});

      expect(namesOf(result)).toEqual(["Zzz Expired", "Aaa Never", "Bbb Never"]);
      expect(result.map((beerVenue) => beerVenue.status)).toEqual(Array(3).fill(AvailabilityStatusEnum.UNKNOWN));
    });

    it("sorts by distance from the position whatever the state and gives each venue its distance", async () => {
      given(
        [at(1, "Brussels", 50.8503, 4.3517), at(2, "Lille", 50.6292, 3.0573), at(3, "Paris", 48.8566, 2.3522)],
        [toLink(1, 1, CONFIRMED_VOTES), toLink(2, 2, GONE_VOTES), toLink(3, 3, [])],
      );

      const result = await service.getBeerVenues(BEER_ID, PARIS);

      expect(namesOf(result)).toEqual(["Paris", "Lille", "Brussels"]);
      expect(result[0].distanceKm).toBe(0);
      expect(result[1].distanceKm).toBeGreaterThan(203);
      expect(result[1].distanceKm).toBeLessThan(205);
      expect(result[2].distanceKm).toBeGreaterThan(result[1].distanceKm as number);
      expect(result[1].status).toBe(AvailabilityStatusEnum.GONE);
    });

    it("breaks a distance tie by name", async () => {
      given([at(1, "Zeta", 50, 3), at(2, "Alpha", 50, 3)], [toLink(1, 1, CONFIRMED_VOTES), toLink(2, 2, [])]);

      expect(namesOf(await service.getBeerVenues(BEER_ID, PARIS))).toEqual(["Alpha", "Zeta"]);
    });

    it("treats a position at latitude 0 and longitude 0 as supplied", async () => {
      given([at(1, "Origin", 0, 0)], [toLink(1, 1, [])]);

      const result = await service.getBeerVenues(BEER_ID, { latitude: 0, longitude: 0 });

      expect(result[0].distanceKm).toBe(0);
    });

    it("reads the links of the beer then the venues those links point to", async () => {
      given([at(1, "Alpha", 50, 3)], [toLink(1, 1, []), toLink(2, 7, [])]);

      await service.getBeerVenues(BEER_ID, {});

      expect(repository.findLinksByBeer).toHaveBeenCalledWith(BEER_ID);
      expect(repository.findVenuesByIds).toHaveBeenCalledWith([1, 7]);
    });

    it("reads a state of maybe gone with the last still vote and four recent voters after three still then a newer gone", async () => {
      const votes = [
        vote(1, VoteSenseEnum.STILL, daysAgo(6)),
        vote(2, VoteSenseEnum.STILL, daysAgo(5)),
        vote(3, VoteSenseEnum.STILL, daysAgo(4)),
        vote(4, VoteSenseEnum.GONE, daysAgo(1)),
      ];
      given([at(1, "Alpha", 50.6, 3.06)], [toLink(1, 1, votes)]);

      expect(await service.getBeerVenues(BEER_ID, {})).toEqual([
        {
          venueId: 1,
          venueName: "Alpha",
          venueType: VenueTypeEnum.BAR,
          city: "Lille",
          address: "1 rue de Test",
          latitude: 50.6,
          longitude: 3.06,
          status: AvailabilityStatusEnum.MAYBE_GONE,
          lastConfirmedAt: daysAgo(4).toISOString(),
          recentVoterCount: 4,
          distanceKm: null,
        },
      ]);
    });
  });

  describe("getVenueBeers", () => {
    const VENUE_ID = 7;
    const daysAgo = (days: number): Date => new Date(NOW.getTime() - days * DAY_MS);
    const ALICE = 1;
    const BOB = 2;

    const toBeer = (id: number, name: string, family: BeerFamilyEnum): BeerDto => ({
      id,
      name,
      breweryName: `Brasserie ${id}`,
      country: "BE",
      styleId: id,
      styleName: `Style ${id}`,
      family,
      abv: 5,
      aromas: [],
      formats: [],
      description: "Une bière.",
      bitternessLevel: null,
      colorLevel: null,
      styleColorRange: null,
      source: BeerSourceEnum.OFFICIAL,
      createdBy: null,
    });

    const linkOf = (beerId: number, votes: VenueLinkDto["votes"] = []): VenueLinkDto => ({
      id: beerId,
      venueId: VENUE_ID,
      beerId,
      votes,
    });

    const vote = (userId: number | null, sense: VoteSenseEnum, votedAt: Date) => ({ userId, sense, votedAt });

    const given = (beers: BeerDto[], links: VenueLinkDto[]) => {
      repository.existsById.mockResolvedValue(true);
      repository.findLinksByVenue.mockResolvedValue(links);
      beersService.getBeersByIds.mockResolvedValue(beers);
    };

    const namesOf = (venueBeers: { beerName: string }[]) => venueBeers.map((venueBeer) => venueBeer.beerName);

    it("throws not found for an unknown venue and reads no link nor beer", async () => {
      repository.existsById.mockResolvedValue(false);

      await expect(service.getVenueBeers(ALICE, 42, {})).rejects.toThrow(new NotFoundException("Venue 42 not found."));
      expect(repository.existsById).toHaveBeenCalledExactlyOnceWith(42);
      expect(repository.findLinksByVenue).not.toHaveBeenCalled();
      expect(beersService.getBeersByIds).not.toHaveBeenCalled();
      expect(tastingsService.getBeerStates).not.toHaveBeenCalled();
      expect(tastingsService.getDiscoveries).not.toHaveBeenCalled();
      expect(tastingsService.getVenueVisits).not.toHaveBeenCalled();
    });

    it("returns an empty list for a venue without beer", async () => {
      given([], []);

      expect(await service.getVenueBeers(ALICE, VENUE_ID, {})).toEqual([]);
      expect(repository.findLinksByVenue).toHaveBeenCalledWith(VENUE_ID);
      expect(beersService.getBeersByIds).toHaveBeenCalledWith([]);
    });

    it("sorts by family in catalogue order, then by name", async () => {
      const beers = [
        toBeer(1, "Zed", BeerFamilyEnum.IPA),
        toBeer(2, "Écume", BeerFamilyEnum.LAGER),
        toBeer(3, "Bravo", BeerFamilyEnum.LAGER),
        toBeer(4, "Cora", BeerFamilyEnum.STOUT),
        toBeer(5, "Alpha", BeerFamilyEnum.PALE_ALE),
        toBeer(6, "Abel", BeerFamilyEnum.IPA),
      ];
      given(beers, [4, 1, 6, 2, 5, 3].map((beerId) => linkOf(beerId)));

      const result = await service.getVenueBeers(ALICE, VENUE_ID, {});

      expect(namesOf(result)).toEqual(["Bravo", "Écume", "Alpha", "Abel", "Zed", "Cora"]);
      expect(result.map((venueBeer) => venueBeer.family)).toEqual([
        BeerFamilyEnum.LAGER,
        BeerFamilyEnum.LAGER,
        BeerFamilyEnum.PALE_ALE,
        BeerFamilyEnum.IPA,
        BeerFamilyEnum.IPA,
        BeerFamilyEnum.STOUT,
      ]);
      expect(beersService.getBeersByIds).toHaveBeenCalledWith([4, 1, 6, 2, 5, 3]);
    });

    it("gives each beer its state, last confirmation, recent voters and no revote date for a user who has not voted", async () => {
      const votes = [vote(BOB, VoteSenseEnum.STILL, daysAgo(2)), vote(3, VoteSenseEnum.STILL, daysAgo(1))];
      given([toBeer(1, "Orval", BeerFamilyEnum.TRAPPIST)], [linkOf(1, votes)]);

      expect(await service.getVenueBeers(ALICE, VENUE_ID, {})).toEqual([
        {
          beerId: 1,
          beerName: "Orval",
          breweryName: "Brasserie 1",
          styleName: "Style 1",
          family: BeerFamilyEnum.TRAPPIST,
          status: AvailabilityStatusEnum.CONFIRMED,
          lastConfirmedAt: daysAgo(1).toISOString(),
          recentVoterCount: 2,
          nextVoteAt: null,
          drunk: false,
          checkinCount: 0,
          lastCheckinAt: null,
        },
      ]);
    });

    it("gives Alice the count and last check-in of her drunk beer and Bob the untouched state of the same beer", async () => {
      const orvalDiscovery = {
        beerId: 1,
        firstCheckinAt: "2026-10-02T18:00:00.000Z",
        lastCheckinAt: "2026-10-10T18:00:00.000Z",
      };
      const chimayDiscovery = {
        beerId: 2,
        firstCheckinAt: "2026-10-12T18:00:00.000Z",
        lastCheckinAt: "2026-10-12T19:00:00.000Z",
      };
      given(
        [toBeer(1, "Orval", BeerFamilyEnum.TRAPPIST), toBeer(2, "Chimay", BeerFamilyEnum.TRAPPIST), toBeer(3, "Delirium", BeerFamilyEnum.TRAPPIST)],
        [linkOf(1), linkOf(2), linkOf(3)],
      );
      tastingsService.getBeerStates.mockImplementation(async (userId: number) =>
        userId === ALICE
          ? [
              { beerId: 1, drunk: true, checkinCount: 2, inWishlist: false },
              { beerId: 2, drunk: true, checkinCount: 1, inWishlist: true },
              { beerId: 3, drunk: false, checkinCount: 0, inWishlist: true },
            ]
          : [],
      );
      tastingsService.getDiscoveries.mockImplementation(async (userId: number) =>
        userId === ALICE ? [chimayDiscovery, orvalDiscovery] : [],
      );

      const forAlice = await service.getVenueBeers(ALICE, VENUE_ID, {});
      const forBob = await service.getVenueBeers(BOB, VENUE_ID, {});

      expect(forAlice.map((item) => [item.beerName, item.drunk, item.checkinCount, item.lastCheckinAt])).toEqual([
        ["Chimay", true, 1, "2026-10-12T19:00:00.000Z"],
        ["Delirium", false, 0, null],
        ["Orval", true, 2, "2026-10-10T18:00:00.000Z"],
      ]);
      expect(forBob.map((item) => [item.drunk, item.checkinCount, item.lastCheckinAt])).toEqual([
        [false, 0, null],
        [false, 0, null],
        [false, 0, null],
      ]);
      expect(tastingsService.getBeerStates).toHaveBeenCalledWith(ALICE, [1, 2, 3]);
      expect(tastingsService.getDiscoveries).toHaveBeenCalledWith(ALICE);
    });

    it("gives a never confirmed beer a null last confirmation and the unknown state", async () => {
      given([toBeer(1, "Orval", BeerFamilyEnum.TRAPPIST)], [linkOf(1)]);

      const [venueBeer] = await service.getVenueBeers(ALICE, VENUE_ID, {});

      expect(venueBeer.status).toBe(AvailabilityStatusEnum.UNKNOWN);
      expect(venueBeer.lastConfirmedAt).toBeNull();
      expect(venueBeer.recentVoterCount).toBe(0);
    });

    it("keeps only the beers of the family filter and answers an empty list when none matches", async () => {
      given(
        [toBeer(1, "Zed", BeerFamilyEnum.IPA), toBeer(2, "Bravo", BeerFamilyEnum.LAGER), toBeer(3, "Abel", BeerFamilyEnum.IPA)],
        [linkOf(1), linkOf(2), linkOf(3)],
      );

      expect(namesOf(await service.getVenueBeers(ALICE, VENUE_ID, { family: BeerFamilyEnum.IPA }))).toEqual(["Abel", "Zed"]);
      expect(await service.getVenueBeers(ALICE, VENUE_ID, { family: BeerFamilyEnum.STOUT })).toEqual([]);
    });

    it("gives Alice a revote date 21 hours ahead after a vote 3 hours ago while Bob has none", async () => {
      const votes = [vote(ALICE, VoteSenseEnum.STILL, new Date(NOW.getTime() - 3 * HOUR_MS))];
      given(
        [toBeer(1, "Orval", BeerFamilyEnum.TRAPPIST), toBeer(2, "Chimay", BeerFamilyEnum.TRAPPIST)],
        [linkOf(1, votes), linkOf(2, [vote(ALICE, VoteSenseEnum.STILL, daysAgo(3))])],
      );

      const forAlice = await service.getVenueBeers(ALICE, VENUE_ID, {});
      const forBob = await service.getVenueBeers(BOB, VENUE_ID, {});

      expect(forAlice.map((venueBeer) => [venueBeer.beerName, venueBeer.nextVoteAt])).toEqual([
        ["Chimay", null],
        ["Orval", new Date(NOW.getTime() + 21 * HOUR_MS).toISOString()],
      ]);
      expect(forBob.map((venueBeer) => venueBeer.nextVoteAt)).toEqual([null, null]);
    });

    it("ignores a link whose beer is not in the catalogue", async () => {
      given([toBeer(1, "Orval", BeerFamilyEnum.TRAPPIST)], [linkOf(1), linkOf(2)]);

      expect(namesOf(await service.getVenueBeers(ALICE, VENUE_ID, {}))).toEqual(["Orval"]);
    });
  });

  describe("getUserVotes", () => {
    it("hands back the votes of the user read by the repository, untouched", async () => {
      const votes = [
        { userId: 7, sense: VoteSenseEnum.STILL, votedAt: new Date("2026-03-01T10:00:00.000Z") },
        { userId: 7, sense: VoteSenseEnum.GONE, votedAt: new Date("2026-03-02T10:00:00.000Z") },
      ];
      repository.findVotesByUser.mockResolvedValue(votes);

      expect(await service.getUserVotes(7)).toBe(votes);
      expect(repository.findVotesByUser).toHaveBeenCalledExactlyOnceWith(7);
    });
  });

  describe("vote", () => {
    const USER_ID = 7;
    const OTHER_USER_ID = 8;
    const VOTE_VENUE_ID = 3;
    const LINK_ID = 55;
    const COOLDOWN_MS = 24 * HOUR_MS;
    const STILL_DTO = { sense: VoteSenseEnum.STILL };
    const BEER = {
      id: BEER_ID,
      name: "Orval",
      breweryName: "Brasserie d'Orval",
      styleName: "Trappiste pale",
      family: BeerFamilyEnum.TRAPPIST,
    };
    const noVotesLink: VenueLinkDto = { id: LINK_ID, venueId: VOTE_VENUE_ID, beerId: BEER_ID, votes: [] };
    const ago = (ms: number): Date => new Date(NOW.getTime() - ms);
    const lastVoteAt = (votedAt: Date) => ({ userId: USER_ID, sense: VoteSenseEnum.GONE, votedAt });

    const given = (options: { link?: VenueLinkDto | null; lastVote?: ReturnType<typeof lastVoteAt> | null } = {}) => {
      repository.existsById.mockResolvedValue(true);
      repository.findLink.mockResolvedValue(options.link === undefined ? noVotesLink : options.link);
      repository.findLastUserVote.mockResolvedValue(options.lastVote ?? null);
      repository.createVote.mockResolvedValue(undefined);
      beersService.getBeer.mockResolvedValue(BEER);
    };

    const expectNoWrite = () => expect(repository.createVote).not.toHaveBeenCalled();

    it("rejects an unknown venue with a 404 and writes nothing", async () => {
      given();
      repository.existsById.mockResolvedValue(false);

      await expect(service.vote(USER_ID, VOTE_VENUE_ID, BEER_ID, STILL_DTO)).rejects.toThrow(
        new NotFoundException("Venue 3 not found."),
      );
      expect(repository.existsById).toHaveBeenCalledExactlyOnceWith(VOTE_VENUE_ID);
      expect(repository.findLink).not.toHaveBeenCalled();
      expect(tastingsService.getVenueVisits).not.toHaveBeenCalled();
      expectNoWrite();
    });

    it("rejects a beer that is not listed at the venue with a 404 and writes nothing", async () => {
      given({ link: null });

      await expect(service.vote(USER_ID, VOTE_VENUE_ID, BEER_ID, STILL_DTO)).rejects.toThrow(
        new NotFoundException("Beer 4 is not listed at venue 3."),
      );
      expect(repository.findLink).toHaveBeenCalledWith(VOTE_VENUE_ID, BEER_ID);
      expect(repository.findLastUserVote).not.toHaveBeenCalled();
      expectNoWrite();
    });

    it("reports an unknown venue before a vote that is still in its cooldown", async () => {
      given({ lastVote: lastVoteAt(ago(HOUR_MS)) });
      repository.existsById.mockResolvedValue(false);

      await expect(service.vote(USER_ID, VOTE_VENUE_ID, BEER_ID, STILL_DTO)).rejects.toBeInstanceOf(NotFoundException);
      expectNoWrite();
    });

    it("reports an unlisted beer before a vote that is still in its cooldown", async () => {
      given({ link: null, lastVote: lastVoteAt(ago(HOUR_MS)) });

      await expect(service.vote(USER_ID, VOTE_VENUE_ID, BEER_ID, STILL_DTO)).rejects.toBeInstanceOf(NotFoundException);
      expectNoWrite();
    });

    it("refuses a second vote 3 hours later with the 21 hours left and writes nothing", async () => {
      given({ lastVote: lastVoteAt(ago(3 * HOUR_MS)) });

      await expect(service.vote(USER_ID, VOTE_VENUE_ID, BEER_ID, STILL_DTO)).rejects.toThrow(
        new ConflictException("You already voted for this beer here in the last 24 hours. Try again in 21 hours."),
      );
      expect(repository.findLastUserVote).toHaveBeenCalledWith(LINK_ID, USER_ID);
      expectNoWrite();
    });

    it("refuses a vote in the other sense during the cooldown too", async () => {
      given({ lastVote: lastVoteAt(ago(HOUR_MS)) });

      await expect(
        service.vote(USER_ID, VOTE_VENUE_ID, BEER_ID, { sense: VoteSenseEnum.GONE }),
      ).rejects.toBeInstanceOf(ConflictException);
      expectNoWrite();
    });

    it.each([
      ["a vote cast right now", 0, "24 hours"],
      ["a vote 1 minute ago", 60_000, "24 hours"],
      ["a vote 22 hours and 30 minutes ago", 22.5 * HOUR_MS, "2 hours"],
      ["a vote 23 hours ago", 23 * HOUR_MS, "1 hour"],
      ["a vote 24 hours minus 1 ms ago", COOLDOWN_MS - 1, "1 hour"],
    ])("rounds the remaining time up for %s", async (_label, elapsedMs, expected) => {
      given({ lastVote: lastVoteAt(ago(elapsedMs)) });

      await expect(service.vote(USER_ID, VOTE_VENUE_ID, BEER_ID, STILL_DTO)).rejects.toThrow(
        new ConflictException(`You already voted for this beer here in the last 24 hours. Try again in ${expected}.`),
      );
    });

    it("accepts a vote exactly 24 hours after the previous one", async () => {
      given({ lastVote: lastVoteAt(ago(COOLDOWN_MS)) });

      await service.vote(USER_ID, VOTE_VENUE_ID, BEER_ID, STILL_DTO);

      expect(repository.createVote).toHaveBeenCalledTimes(1);
    });

    it("stores the vote of the user at the current time before reading the link again", async () => {
      given();

      await service.vote(USER_ID, VOTE_VENUE_ID, BEER_ID, { sense: VoteSenseEnum.GONE });

      expect(repository.createVote).toHaveBeenCalledWith({
        venueBeerId: LINK_ID,
        userId: USER_ID,
        sense: VoteSenseEnum.GONE,
        votedAt: NOW,
      });
      expect(repository.findLink).toHaveBeenCalledTimes(2);
      expect(repository.createVote.mock.invocationCallOrder[0]).toBeLessThan(
        repository.findLink.mock.invocationCallOrder[1],
      );
    });

    it("answers with the updated beer once a second user confirms it", async () => {
      const aliceVote = { userId: OTHER_USER_ID, sense: VoteSenseEnum.STILL, votedAt: ago(HOUR_MS) };
      const myVote = { userId: USER_ID, sense: VoteSenseEnum.STILL, votedAt: NOW };
      given({ link: { ...noVotesLink, votes: [aliceVote] } });
      repository.findLink
        .mockResolvedValueOnce({ ...noVotesLink, votes: [aliceVote] })
        .mockResolvedValueOnce({ ...noVotesLink, votes: [aliceVote, myVote] });

      expect(await service.vote(USER_ID, VOTE_VENUE_ID, BEER_ID, STILL_DTO)).toEqual({
        beerId: BEER_ID,
        beerName: "Orval",
        breweryName: "Brasserie d'Orval",
        styleName: "Trappiste pale",
        family: BeerFamilyEnum.TRAPPIST,
        status: AvailabilityStatusEnum.CONFIRMED,
        lastConfirmedAt: NOW.toISOString(),
        recentVoterCount: 2,
        nextVoteAt: new Date(NOW.getTime() + COOLDOWN_MS).toISOString(),
        drunk: false,
        checkinCount: 0,
        lastCheckinAt: null,
      });
      expect(beersService.getBeer).toHaveBeenCalledWith(BEER_ID);
    });

    it("carries the check-ins of the voter on the beer returned by the vote", async () => {
      given();
      tastingsService.getBeerStates.mockResolvedValue([{ beerId: BEER_ID, drunk: true, checkinCount: 2, inWishlist: false }]);
      tastingsService.getDiscoveries.mockResolvedValue([
        { beerId: 99, firstCheckinAt: "2026-10-13T08:00:00.000Z", lastCheckinAt: "2026-10-13T09:00:00.000Z" },
        { beerId: BEER_ID, firstCheckinAt: "2026-10-02T18:00:00.000Z", lastCheckinAt: "2026-10-10T18:00:00.000Z" },
      ]);

      const result = await service.vote(USER_ID, VOTE_VENUE_ID, BEER_ID, STILL_DTO);

      expect([result.drunk, result.checkinCount, result.lastCheckinAt]).toEqual([true, 2, "2026-10-10T18:00:00.000Z"]);
      expect(tastingsService.getBeerStates).toHaveBeenCalledWith(USER_ID, [BEER_ID]);
      expect(tastingsService.getDiscoveries).toHaveBeenCalledWith(USER_ID);
    });

    it("reads no state of the user when the vote is refused", async () => {
      given({ lastVote: lastVoteAt(ago(HOUR_MS)) });

      await expect(service.vote(USER_ID, VOTE_VENUE_ID, BEER_ID, STILL_DTO)).rejects.toBeInstanceOf(ConflictException);
      expect(tastingsService.getBeerStates).not.toHaveBeenCalled();
    });

    it("counts only the new vote of a user who changes sense after 25 hours", async () => {
      const oldStill = { userId: USER_ID, sense: VoteSenseEnum.STILL, votedAt: ago(25 * HOUR_MS) };
      const newGone = { userId: USER_ID, sense: VoteSenseEnum.GONE, votedAt: NOW };
      given({ lastVote: oldStill });
      repository.findLink
        .mockResolvedValueOnce({ ...noVotesLink, votes: [oldStill] })
        .mockResolvedValueOnce({ ...noVotesLink, votes: [oldStill, newGone] });

      const result = await service.vote(USER_ID, VOTE_VENUE_ID, BEER_ID, { sense: VoteSenseEnum.GONE });

      expect(result.status).toBe(AvailabilityStatusEnum.MAYBE_GONE);
      expect(result.recentVoterCount).toBe(1);
      expect(result.lastConfirmedAt).toBe(oldStill.votedAt.toISOString());
    });
  });
  describe("createVenue", () => {
    const DTO: CreateVenueDto = {
      name: "Chez Mousse",
      type: VenueTypeEnum.SHOP,
      address: "12 rue de la Biere",
      latitude: 50.63,
      longitude: 3.06,
      city: "Lille",
      description: "Une cave.",
    };
    const CREATED: VenueRecordDto = {
      id: 40,
      name: "Chez Mousse",
      type: VenueTypeEnum.SHOP,
      city: "Lille",
      address: "12 rue de la Biere",
      latitude: 50.63,
      longitude: 3.06,
      description: "Une cave.",
    };

    it("creates the venue with its name key and returns it unknown with no distance", async () => {
      repository.existsByNameKey.mockResolvedValue(false);
      repository.createVenue.mockResolvedValue(CREATED);

      expect(await service.createVenue(DTO)).toEqual({
        ...CREATED,
        distanceKm: null,
        status: AvailabilityStatusEnum.UNKNOWN,
        ...NO_VISIT,
        isApproximateMatch: false,
      });
      expect(tastingsService.getVenueVisits).not.toHaveBeenCalled();
      expect(repository.existsByNameKey).toHaveBeenCalledWith("chez mousse");
      expect(repository.createVenue).toHaveBeenCalledWith({
        name: "Chez Mousse",
        nameKey: "chez mousse",
        searchName: "chez mousse",
        searchCity: "lille",
        type: VenueTypeEnum.SHOP,
        city: "Lille",
        address: "12 rue de la Biere",
        latitude: 50.63,
        longitude: 3.06,
        description: "Une cave.",
      });
    });

    it("rejects a name that only differs by case with a 409 and writes nothing", async () => {
      repository.existsByNameKey.mockResolvedValue(true);

      await expect(service.createVenue({ ...DTO, name: "la fine mousse" })).rejects.toThrow(
        new ConflictException('A venue named "la fine mousse" already exists.'),
      );
      expect(repository.existsByNameKey).toHaveBeenCalledWith("la fine mousse");
      expect(repository.createVenue).not.toHaveBeenCalled();
    });
  });

  describe("reportBeer", () => {
    const REPORT_VENUE_ID = 3;
    const REPORT_BEER_ID = 4;
    const REPORTER_ID = 5;
    const BEER = {
      id: REPORT_BEER_ID,
      name: "Orval",
      breweryName: "Brasserie d'Orval",
      styleName: "Trappiste pale",
      family: BeerFamilyEnum.TRAPPIST,
    };
    const CREATED_LINK: VenueLinkDto = { id: 77, venueId: REPORT_VENUE_ID, beerId: REPORT_BEER_ID, votes: [] };
    const DTO = { beerId: REPORT_BEER_ID };

    const given = () => {
      repository.existsById.mockResolvedValue(true);
      beersService.getBeer.mockResolvedValue(BEER);
      repository.findLink.mockResolvedValue(null);
      repository.createLink.mockResolvedValue(CREATED_LINK);
    };

    const expectNoWrite = () => expect(repository.createLink).not.toHaveBeenCalled();

    it("returns the beer as drunk with the count and last check-in of the reporter once the link is created", async () => {
      given();
      tastingsService.getBeerStates.mockResolvedValue([
        { beerId: REPORT_BEER_ID, drunk: true, checkinCount: 2, inWishlist: false },
      ]);
      tastingsService.getDiscoveries.mockResolvedValue([
        { beerId: REPORT_BEER_ID, firstCheckinAt: "2026-10-02T18:00:00.000Z", lastCheckinAt: "2026-10-10T18:00:00.000Z" },
      ]);

      const result = await service.reportBeer(REPORTER_ID, REPORT_VENUE_ID, DTO);

      expect([result.drunk, result.checkinCount, result.lastCheckinAt]).toEqual([true, 2, "2026-10-10T18:00:00.000Z"]);
      expect(tastingsService.getBeerStates).toHaveBeenCalledWith(REPORTER_ID, [REPORT_BEER_ID]);
      expect(tastingsService.getDiscoveries).toHaveBeenCalledWith(REPORTER_ID);
      expect(repository.createLink.mock.invocationCallOrder[0]).toBeLessThan(
        tastingsService.getBeerStates.mock.invocationCallOrder[0],
      );
    });

    it("reads no state of the user when the report is refused", async () => {
      given();
      repository.findLink.mockResolvedValue(CREATED_LINK);

      await expect(service.reportBeer(REPORTER_ID, REPORT_VENUE_ID, DTO)).rejects.toBeInstanceOf(ConflictException);
      expect(tastingsService.getBeerStates).not.toHaveBeenCalled();
    });

    it("creates the link and returns the beer unknown with no vote", async () => {
      given();

      expect(await service.reportBeer(REPORTER_ID, REPORT_VENUE_ID, DTO)).toEqual({
        beerId: REPORT_BEER_ID,
        beerName: "Orval",
        breweryName: "Brasserie d'Orval",
        styleName: "Trappiste pale",
        family: BeerFamilyEnum.TRAPPIST,
        status: AvailabilityStatusEnum.UNKNOWN,
        lastConfirmedAt: null,
        recentVoterCount: 0,
        nextVoteAt: null,
        drunk: false,
        checkinCount: 0,
        lastCheckinAt: null,
      });
      expect(repository.findLink).toHaveBeenCalledWith(REPORT_VENUE_ID, REPORT_BEER_ID);
      expect(repository.createLink).toHaveBeenCalledWith(REPORT_VENUE_ID, REPORT_BEER_ID);
    });

    it("rejects an unknown venue with a 404 before reading the beer and writes nothing", async () => {
      given();
      repository.existsById.mockResolvedValue(false);
      beersService.getBeer.mockRejectedValue(new NotFoundException("Beer 4 not found."));

      await expect(service.reportBeer(REPORTER_ID, REPORT_VENUE_ID, DTO)).rejects.toThrow(new NotFoundException("Venue 3 not found."));
      expect(beersService.getBeer).not.toHaveBeenCalled();
      expect(repository.findLink).not.toHaveBeenCalled();
      expect(tastingsService.getVenueVisits).not.toHaveBeenCalled();
      expectNoWrite();
    });

    it("rejects an unknown beer with a 404 before the conflict check and writes nothing", async () => {
      given();
      repository.findLink.mockResolvedValue(CREATED_LINK);
      beersService.getBeer.mockRejectedValue(new NotFoundException("Beer 4 not found."));

      await expect(service.reportBeer(REPORTER_ID, REPORT_VENUE_ID, DTO)).rejects.toThrow(new NotFoundException("Beer 4 not found."));
      expect(beersService.getBeer).toHaveBeenCalledWith(REPORT_BEER_ID);
      expect(repository.findLink).not.toHaveBeenCalled();
      expectNoWrite();
    });

    it("rejects a beer already listed at the venue with a 409 and writes nothing", async () => {
      given();
      repository.findLink.mockResolvedValue(CREATED_LINK);

      await expect(service.reportBeer(REPORTER_ID, REPORT_VENUE_ID, DTO)).rejects.toThrow(
        new ConflictException("Beer 4 is already listed at venue 3."),
      );
      expectNoWrite();
    });
  });
});
