import { describe, expect, it } from "vitest";
import { VoteSenseEnum } from "@/modules/venues/enums/vote-sense.enum";
import type { BeerDto } from "@/modules/beers/dtos/beer.dto";
import { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";
import type { AvailabilityDto } from "@/modules/venues/dtos/availability.dto";
import { AvailabilityStatusEnum } from "@/modules/venues/enums/availability-status.enum";
import type { BeerUserStateDto } from "@/modules/tastings/dtos/beer-user-state.dto";
import type { DiscoveryDto } from "@/modules/tastings/dtos/discovery.dto";
import type { VenueBeerUserStateDto } from "@/modules/venues/dtos/venue-beer-user-state.dto";
import {
  toNewVote,
  toVenueBeerDto,
  toVenueBeerUserStateDto,
  toVenueLinkDto,
  toVoteRecordDto,
} from "@/modules/venues/mappers/venue-beer.mapper";

const STILL_DATE = new Date("2026-03-01T10:00:00.000Z");
const GONE_DATE = new Date("2026-03-02T11:30:00.000Z");

const STILL_VOTE = { id: 11, venueBeerId: 5, userId: 2, sense: VoteSenseEnum.STILL, votedAt: STILL_DATE };
const GONE_VOTE = { id: 12, venueBeerId: 5, userId: null, sense: VoteSenseEnum.GONE, votedAt: GONE_DATE };

describe("toVoteRecordDto", () => {
  it("keeps the user, the sense and the date and nothing else", () => {
    expect(toVoteRecordDto(STILL_VOTE)).toEqual({ userId: 2, sense: VoteSenseEnum.STILL, votedAt: STILL_DATE });
  });

  it("keeps a seed vote without user", () => {
    expect(toVoteRecordDto(GONE_VOTE)).toEqual({ userId: null, sense: VoteSenseEnum.GONE, votedAt: GONE_DATE });
  });
});

describe("toVenueLinkDto", () => {
  it("lists the link fields and maps every vote", () => {
    const link = toVenueLinkDto({
      id: 5,
      venueId: 3,
      beerId: 9,
      votes: [STILL_VOTE, GONE_VOTE],
    });

    expect(link).toEqual({
      id: 5,
      venueId: 3,
      beerId: 9,
      votes: [
        { userId: 2, sense: VoteSenseEnum.STILL, votedAt: STILL_DATE },
        { userId: null, sense: VoteSenseEnum.GONE, votedAt: GONE_DATE },
      ],
    });
  });

  it("maps a link without vote to an empty list", () => {
    expect(toVenueLinkDto({ id: 6, venueId: 3, beerId: 10, votes: [] }).votes).toEqual([]);
  });
});

describe("toVenueBeerDto", () => {
  const LINK = { id: 5, venueId: 3, beerId: 9, votes: [] };
  const BEER: BeerDto = {
    id: 9,
    name: "Orval",
    breweryName: "Brasserie d'Orval",
    country: "BE",
    styleId: 4,
    styleName: "Trappiste pale",
    family: BeerFamilyEnum.TRAPPIST,
    abv: 6.2,
    aromas: [],
    formats: [],
    description: "Une trappiste.",
    bitternessLevel: null,
    colorLevel: null,
    styleColorRange: null,
  };
  const NEXT_VOTE_DATE = new Date("2026-03-03T08:00:00.000Z");
  const NEVER_DRUNK: VenueBeerUserStateDto = { drunk: false, checkinCount: 0, lastCheckinAt: null };
  const DRUNK_TWICE: VenueBeerUserStateDto = {
    drunk: true,
    checkinCount: 2,
    lastCheckinAt: "2026-10-10T18:00:00.000Z",
  };

  it("lists the beer, availability and revote fields with dates in ISO and nothing else", () => {
    const availability: AvailabilityDto = {
      status: AvailabilityStatusEnum.CONFIRMED,
      lastConfirmedAt: STILL_DATE,
      recentVoterCount: 4,
    };

    expect(toVenueBeerDto(LINK, BEER, availability, NEXT_VOTE_DATE, DRUNK_TWICE)).toEqual({
      beerId: 9,
      beerName: "Orval",
      breweryName: "Brasserie d'Orval",
      styleName: "Trappiste pale",
      family: BeerFamilyEnum.TRAPPIST,
      status: AvailabilityStatusEnum.CONFIRMED,
      lastConfirmedAt: "2026-03-01T10:00:00.000Z",
      recentVoterCount: 4,
      nextVoteAt: "2026-03-03T08:00:00.000Z",
      drunk: true,
      checkinCount: 2,
      lastCheckinAt: "2026-10-10T18:00:00.000Z",
    });
  });

  it("copies the untouched state of a beer never drunk", () => {
    const availability: AvailabilityDto = {
      status: AvailabilityStatusEnum.UNKNOWN,
      lastConfirmedAt: null,
      recentVoterCount: 0,
    };

    const result = toVenueBeerDto(LINK, BEER, availability, null, NEVER_DRUNK);

    expect(result.drunk).toBe(false);
    expect(result.checkinCount).toBe(0);
    expect(result.lastCheckinAt).toBeNull();
  });

  it("keeps an absent last confirmation and an absent revote date as null", () => {
    const availability: AvailabilityDto = {
      status: AvailabilityStatusEnum.UNKNOWN,
      lastConfirmedAt: null,
      recentVoterCount: 0,
    };

    const result = toVenueBeerDto(LINK, BEER, availability, null, NEVER_DRUNK);

    expect(result.lastConfirmedAt).toBeNull();
    expect(result.nextVoteAt).toBeNull();
  });
});

describe("toNewVote", () => {
  it("lists exactly the columns of a vote to insert", () => {
    expect(toNewVote(5, 2, VoteSenseEnum.GONE, GONE_DATE)).toEqual({
      venueBeerId: 5,
      userId: 2,
      sense: VoteSenseEnum.GONE,
      votedAt: GONE_DATE,
    });
  });
});

describe("toVenueBeerUserStateDto", () => {
  const STATE: BeerUserStateDto = { beerId: 9, drunk: true, checkinCount: 2, inWishlist: true };
  const DISCOVERY: DiscoveryDto = {
    beerId: 9,
    firstCheckinAt: "2026-10-02T18:00:00.000Z",
    lastCheckinAt: "2026-10-10T18:00:00.000Z",
  };

  it("keeps the count, flags the beer drunk and takes the last check-in of the discovery and nothing else", () => {
    expect(toVenueBeerUserStateDto(STATE, DISCOVERY)).toEqual({
      drunk: true,
      checkinCount: 2,
      lastCheckinAt: "2026-10-10T18:00:00.000Z",
    });
  });

  it("answers not drunk, zero and no date without state nor discovery", () => {
    expect(toVenueBeerUserStateDto(undefined, undefined)).toEqual({ drunk: false, checkinCount: 0, lastCheckinAt: null });
  });

  it("answers not drunk for a state with a zero count even when a discovery exists", () => {
    expect(toVenueBeerUserStateDto({ ...STATE, drunk: true, checkinCount: 0 }, undefined)).toEqual({
      drunk: false,
      checkinCount: 0,
      lastCheckinAt: null,
    });
  });

  it("keeps a null date for a drunk beer without discovery", () => {
    expect(toVenueBeerUserStateDto(STATE, undefined).lastCheckinAt).toBeNull();
  });
});
