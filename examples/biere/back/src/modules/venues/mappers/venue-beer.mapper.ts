import type { BeerDto } from "@/modules/beers/dtos/beer.dto";
import type { AvailabilityDto } from "@/modules/venues/dtos/availability.dto";
import type { VenueBeerDto } from "@/modules/venues/dtos/venue-beer.dto";
import type { VenueLinkDto } from "@/modules/venues/dtos/venue-link.dto";
import type { VoteRecordDto } from "@/modules/venues/dtos/vote-record.dto";
import type { AvailabilityVote } from "@/modules/venues/entities/availability-vote.entity";
import type { VoteSenseEnum } from "@/modules/venues/enums/vote-sense.enum";
import type { VenueBeer } from "@/modules/venues/entities/venue-beer.entity";

type VenueLinkEntity = Pick<VenueBeer, "id" | "venueId" | "beerId"> & {
  readonly votes: readonly Pick<AvailabilityVote, "userId" | "sense" | "votedAt">[];
};

export const toVoteRecordDto = (vote: Pick<AvailabilityVote, "userId" | "sense" | "votedAt">): VoteRecordDto => ({
  userId: vote.userId,
  sense: vote.sense,
  votedAt: vote.votedAt,
});

export const toVenueLinkDto = (entity: VenueLinkEntity): VenueLinkDto => ({
  id: entity.id,
  venueId: entity.venueId,
  beerId: entity.beerId,
  votes: entity.votes.map(toVoteRecordDto),
});

export const toVenueBeerDto = (
  link: VenueLinkDto,
  beer: BeerDto,
  availability: AvailabilityDto,
  nextVoteAt: Date | null,
): VenueBeerDto => ({
  beerId: link.beerId,
  beerName: beer.name,
  breweryName: beer.breweryName,
  styleName: beer.styleName,
  family: beer.family,
  status: availability.status,
  lastConfirmedAt: availability.lastConfirmedAt?.toISOString() ?? null,
  recentVoterCount: availability.recentVoterCount,
  nextVoteAt: nextVoteAt?.toISOString() ?? null,
});

export const toNewVote = (
  venueBeerId: number,
  userId: number,
  sense: VoteSenseEnum,
  votedAt: Date,
): Omit<AvailabilityVote, "id" | "venueBeer"> => ({ venueBeerId, userId, sense, votedAt });
