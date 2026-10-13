import { describe, expect, it } from "vitest";
import { VoteSenseEnum } from "@/modules/venues/enums/vote-sense.enum";
import type { BeerDto } from "@/modules/beers/dtos/beer.dto";
import { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";
import type { AvailabilityDto } from "@/modules/venues/dtos/availability.dto";
import { AvailabilityStatusEnum } from "@/modules/venues/enums/availability-status.enum";
import { toNewVote, toVenueBeerDto, toVenueLinkDto, toVoteRecordDto } from "@/modules/venues/mappers/venue-beer.mapper";

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
  };
  const NEXT_VOTE_DATE = new Date("2026-03-03T08:00:00.000Z");

  it("lists the beer, availability and revote fields with dates in ISO and nothing else", () => {
    const availability: AvailabilityDto = {
      status: AvailabilityStatusEnum.CONFIRMED,
      lastConfirmedAt: STILL_DATE,
      recentVoterCount: 4,
    };

    expect(toVenueBeerDto(LINK, BEER, availability, NEXT_VOTE_DATE)).toEqual({
      beerId: 9,
      beerName: "Orval",
      breweryName: "Brasserie d'Orval",
      styleName: "Trappiste pale",
      family: BeerFamilyEnum.TRAPPIST,
      status: AvailabilityStatusEnum.CONFIRMED,
      lastConfirmedAt: "2026-03-01T10:00:00.000Z",
      recentVoterCount: 4,
      nextVoteAt: "2026-03-03T08:00:00.000Z",
    });
  });

  it("keeps an absent last confirmation and an absent revote date as null", () => {
    const availability: AvailabilityDto = {
      status: AvailabilityStatusEnum.UNKNOWN,
      lastConfirmedAt: null,
      recentVoterCount: 0,
    };

    const result = toVenueBeerDto(LINK, BEER, availability, null);

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
