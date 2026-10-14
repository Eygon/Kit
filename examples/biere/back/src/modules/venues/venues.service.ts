import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { BeersService } from "@/modules/beers/beers.service";
import type { BeerDto } from "@/modules/beers/dtos/beer.dto";
import { TastingsService } from "@/modules/tastings/tastings.service";
import { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";
import type { BeerVenueDto } from "@/modules/venues/dtos/beer-venue.dto";
import type { GeoPointDto } from "@/modules/venues/dtos/geo-point.dto";
import type { PositionQueryDto } from "@/modules/venues/dtos/position-query.dto";
import type { VenueAreaFiltersDto, VenueBoundsDto } from "@/modules/venues/dtos/venue-area-filters.dto";
import type { CreateVenueDto } from "@/modules/venues/dtos/create-venue.dto";
import type { CreateVoteDto } from "@/modules/venues/dtos/create-vote.dto";
import type { ReportVenueBeerDto } from "@/modules/venues/dtos/report-venue-beer.dto";
import type { VenueBeerDto } from "@/modules/venues/dtos/venue-beer.dto";
import type { VenueBeerUserStateDto } from "@/modules/venues/dtos/venue-beer-user-state.dto";
import type { VenueBeersQueryDto } from "@/modules/venues/dtos/venue-beers-query.dto";
import type { VenueDto } from "@/modules/venues/dtos/venue.dto";
import type { VenueLinkDto } from "@/modules/venues/dtos/venue-link.dto";
import type { VenueRecordDto } from "@/modules/venues/dtos/venue-record.dto";
import type { VoteRecordDto } from "@/modules/venues/dtos/vote-record.dto";
import type { VenuesQueryDto } from "@/modules/venues/dtos/venues-query.dto";
import { AVAILABILITY_STATUS_RANK, AvailabilityStatusEnum } from "@/modules/venues/enums/availability-status.enum";
import { computeDistanceKm } from "@/modules/venues/geo-distance";
import { toBeerVenueDto } from "@/modules/venues/mappers/beer-venue.mapper";
import { toNewVote, toVenueBeerDto, toVenueBeerUserStateDto } from "@/modules/venues/mappers/venue-beer.mapper";
import { toNewVenue, toVenueDto } from "@/modules/venues/mappers/venue.mapper";
import { computeAvailability, computeNextVoteAt, pickBestStatus } from "@/modules/venues/venue-availability";
import { HOUR_MS } from "@/modules/venues/venues.constants";
import { VenuesRepository } from "@/modules/venues/venues.repository";

const NAME_SORT_LOCALE = "fr";

const toBounds = (query: VenuesQueryDto): VenueBoundsDto | null => {
  const { north, south, east, west } = query;
  const supplied = [north, south, east, west].filter((bound) => bound !== undefined).length;
  if (supplied === 0) {
    return null;
  }
  if (north === undefined || south === undefined || east === undefined || west === undefined) {
    throw new BadRequestException("north, south, east and west must be supplied together.");
  }
  if (south > north) {
    throw new BadRequestException("south must not be greater than north.");
  }
  if (west > east) {
    throw new BadRequestException("west must not be greater than east.");
  }
  return { north, south, east, west };
};

const toAreaFilters = (query: VenuesQueryDto): VenueAreaFiltersDto => ({
  bounds: toBounds(query),
  types: query.type ?? [],
  search: query.q ?? "",
});

const groupByVenue = (links: readonly VenueLinkDto[]): Map<number, VenueLinkDto[]> => {
  const linksByVenue = new Map<number, VenueLinkDto[]>();
  links.forEach((link) => linksByVenue.set(link.venueId, [...(linksByVenue.get(link.venueId) ?? []), link]));
  return linksByVenue;
};

const toVenueWithStatus = (
  record: VenueRecordDto,
  links: readonly VenueLinkDto[],
  now: Date,
  distanceKm: number | null,
): VenueDto =>
  toVenueDto(record, pickBestStatus(links.map((link) => computeAvailability(link.votes, now).status)), distanceKm);

const toPosition = (query: PositionQueryDto): GeoPointDto | null => {
  const { latitude, longitude } = query;
  if (latitude === undefined && longitude === undefined) {
    return null;
  }
  if (latitude === undefined || longitude === undefined) {
    throw new BadRequestException("latitude and longitude must be supplied together.");
  }
  return { latitude, longitude };
};

const isInFamily = (beer: BeerDto, family: BeerFamilyEnum | undefined): boolean =>
  family === undefined || beer.family === family;

const toRadiusKm = (query: VenuesQueryDto, position: GeoPointDto | null): number | null => {
  if (query.radiusKm === undefined) {
    return null;
  }
  if (position === null) {
    throw new BadRequestException("radiusKm requires latitude and longitude.");
  }
  return query.radiusKm;
};

const hasBeerFilter = (query: VenuesQueryDto): boolean =>
  query.beer !== undefined || query.family !== undefined || query.style !== undefined;

const matchesBeerFilter = (beer: BeerDto, query: VenuesQueryDto): boolean =>
  (query.beer === undefined || beer.id === query.beer) &&
  isInFamily(beer, query.family) &&
  (query.style === undefined || query.style.includes(beer.styleId));

const toCooldownMessage = (remainingMs: number): string => {
  const hours = Math.ceil(remainingMs / HOUR_MS);
  const unit = hours === 1 ? "hour" : "hours";
  return `You already voted for this beer here in the last 24 hours. Try again in ${hours} ${unit}.`;
};

const compareNames = (left: BeerVenueDto, right: BeerVenueDto): number =>
  left.venueName.localeCompare(right.venueName, NAME_SORT_LOCALE);

const confirmationTime = (beerVenue: BeerVenueDto): number =>
  beerVenue.lastConfirmedAt === null ? Number.NEGATIVE_INFINITY : new Date(beerVenue.lastConfirmedAt).getTime();

const compareVenuesByDistance = (left: VenueDto, right: VenueDto): number =>
  (left.distanceKm as number) - (right.distanceKm as number) ||
  left.name.localeCompare(right.name, NAME_SORT_LOCALE);

const compareByDistance = (left: BeerVenueDto, right: BeerVenueDto): number =>
  (left.distanceKm as number) - (right.distanceKm as number) || compareNames(left, right);

const compareByAvailability = (left: BeerVenueDto, right: BeerVenueDto): number =>
  AVAILABILITY_STATUS_RANK[left.status] - AVAILABILITY_STATUS_RANK[right.status] ||
  confirmationTime(right) - confirmationTime(left) ||
  compareNames(left, right);

const FAMILY_ORDER: readonly BeerFamilyEnum[] = Object.values(BeerFamilyEnum);

const compareVenueBeers = (left: VenueBeerDto, right: VenueBeerDto): number =>
  FAMILY_ORDER.indexOf(left.family) - FAMILY_ORDER.indexOf(right.family) ||
  left.beerName.localeCompare(right.beerName, NAME_SORT_LOCALE);

@Injectable()
export class VenuesService {
  constructor(
    private readonly venuesRepository: VenuesRepository,
    private readonly beersService: BeersService,
    private readonly tastingsService: TastingsService,
  ) {}

  async getVenues(userId: number, query: VenuesQueryDto): Promise<VenueDto[]> {
    const area = toAreaFilters(query);
    const position = toPosition(query);
    const radiusKm = toRadiusKm(query, position);
    const records = await this.venuesRepository.findVenues(area);
    const links = await this.venuesRepository.findLinks(records.map((record) => record.id));
    const retainedLinks = await this.retainLinks(links, query);
    const undiscoveredLinks = await this.keepUndiscoveredLinks(userId, retainedLinks, query);
    const linksByVenue = groupByVenue(retainedLinks);
    const undiscoveredVenueIds = new Set(undiscoveredLinks.map((link) => link.venueId));
    const now = new Date();
    const venues = records
      .filter((record) => !hasBeerFilter(query) || linksByVenue.has(record.id))
      .filter((record) => query.undiscovered !== true || undiscoveredVenueIds.has(record.id))
      .map((record) =>
        toVenueWithStatus(
          record,
          linksByVenue.get(record.id) ?? [],
          now,
          position === null ? null : computeDistanceKm(position, record),
        ),
      )
      .filter((venue) => query.confirmedOnly !== true || venue.status === AvailabilityStatusEnum.CONFIRMED)
      .filter((venue) => radiusKm === null || (venue.distanceKm as number) <= radiusKm);
    return position === null || area.search !== "" ? venues : venues.sort(compareVenuesByDistance);
  }

  async getVenue(id: number): Promise<VenueDto> {
    const record = await this.venuesRepository.findVenueById(id);
    if (record === null) {
      throw new NotFoundException(`Venue ${id} not found.`);
    }
    const links = await this.venuesRepository.findLinks([id]);
    return toVenueWithStatus(record, links, new Date(), null);
  }

  async getBeerVenues(beerId: number, query: PositionQueryDto): Promise<BeerVenueDto[]> {
    const position = toPosition(query);
    await this.beersService.getBeer(beerId);
    const links = await this.venuesRepository.findLinksByBeer(beerId);
    const venues = await this.venuesRepository.findVenuesByIds(links.map((link) => link.venueId));
    const linksByVenue = groupByVenue(links);
    const now = new Date();
    return venues
      .map((venue) =>
        toBeerVenueDto(
          venue,
          computeAvailability(linksByVenue.get(venue.id)?.flatMap((link) => link.votes) ?? [], now),
          position === null ? null : computeDistanceKm(position, venue),
        ),
      )
      .sort(position === null ? compareByAvailability : compareByDistance);
  }

  async getVenueBeers(userId: number, venueId: number, query: VenueBeersQueryDto): Promise<VenueBeerDto[]> {
    await this.getVenue(venueId);
    const links = await this.venuesRepository.findLinksByVenue(venueId);
    const beers = await this.beersService.getBeersByIds(links.map((link) => link.beerId));
    const beersById = new Map(beers.filter((beer) => isInFamily(beer, query.family)).map((beer) => [beer.id, beer]));
    const userStates = await this.getUserStates(
      userId,
      links.map((link) => link.beerId),
    );
    const now = new Date();
    return links
      .flatMap((link) => {
        const beer = beersById.get(link.beerId);
        return beer === undefined
          ? []
          : [
              toVenueBeerDto(
                link,
                beer,
                computeAvailability(link.votes, now),
                computeNextVoteAt(link.votes, userId, now),
                userStates.get(link.beerId) as VenueBeerUserStateDto,
              ),
            ];
      })
      .sort(compareVenueBeers);
  }

  getUserVotes(userId: number): Promise<VoteRecordDto[]> {
    return this.venuesRepository.findVotesByUser(userId);
  }

  async vote(userId: number, venueId: number, beerId: number, dto: CreateVoteDto): Promise<VenueBeerDto> {
    await this.getVenue(venueId);
    const link = await this.getLink(venueId, beerId);
    const now = new Date();
    const lastVote = await this.venuesRepository.findLastUserVote(link.id, userId);
    const cooldownEnd = lastVote === null ? null : computeNextVoteAt([lastVote], userId, now);
    if (cooldownEnd !== null) {
      throw new ConflictException(toCooldownMessage(cooldownEnd.getTime() - now.getTime()));
    }
    await this.venuesRepository.createVote(toNewVote(link.id, userId, dto.sense, now));
    const updated = await this.getLink(venueId, beerId);
    const beer = await this.beersService.getBeer(beerId);
    const availability = computeAvailability(updated.votes, now);
    const userStates = await this.getUserStates(userId, [beerId]);
    return toVenueBeerDto(
      updated,
      beer,
      availability,
      computeNextVoteAt(updated.votes, userId, now),
      userStates.get(beerId) as VenueBeerUserStateDto,
    );
  }

  async createVenue(dto: CreateVenueDto): Promise<VenueDto> {
    const data = toNewVenue(dto);
    if (await this.venuesRepository.existsByNameKey(data.nameKey)) {
      throw new ConflictException(`A venue named "${data.name}" already exists.`);
    }
    const record = await this.venuesRepository.createVenue(data);
    return toVenueDto(record, AvailabilityStatusEnum.UNKNOWN, null);
  }

  async reportBeer(userId: number, venueId: number, dto: ReportVenueBeerDto): Promise<VenueBeerDto> {
    await this.getVenue(venueId);
    const beer = await this.beersService.getBeer(dto.beerId);
    if ((await this.venuesRepository.findLink(venueId, dto.beerId)) !== null) {
      throw new ConflictException(`Beer ${dto.beerId} is already listed at venue ${venueId}.`);
    }
    const link = await this.venuesRepository.createLink(venueId, dto.beerId);
    const userStates = await this.getUserStates(userId, [dto.beerId]);
    return toVenueBeerDto(
      link,
      beer,
      computeAvailability([], new Date()),
      null,
      userStates.get(dto.beerId) as VenueBeerUserStateDto,
    );
  }

  private async getUserStates(userId: number, beerIds: readonly number[]): Promise<Map<number, VenueBeerUserStateDto>> {
    const [states, discoveries] = await Promise.all([
      this.tastingsService.getBeerStates(userId, beerIds),
      this.tastingsService.getDiscoveries(userId),
    ]);
    const statesByBeer = new Map(states.map((state) => [state.beerId, state]));
    const discoveriesByBeer = new Map(discoveries.map((discovery) => [discovery.beerId, discovery]));
    return new Map(
      beerIds.map((beerId) => [beerId, toVenueBeerUserStateDto(statesByBeer.get(beerId), discoveriesByBeer.get(beerId))]),
    );
  }

  private async getLink(venueId: number, beerId: number): Promise<VenueLinkDto> {
    const link = await this.venuesRepository.findLink(venueId, beerId);
    if (link === null) {
      throw new NotFoundException(`Beer ${beerId} is not listed at venue ${venueId}.`);
    }
    return link;
  }

  private async keepUndiscoveredLinks(
    userId: number,
    links: readonly VenueLinkDto[],
    query: VenuesQueryDto,
  ): Promise<readonly VenueLinkDto[]> {
    if (query.undiscovered !== true) {
      return links;
    }
    const drunkBeerIds = new Set(await this.tastingsService.getDrunkBeerIds(userId));
    return links.filter((link) => !drunkBeerIds.has(link.beerId));
  }

  private async retainLinks(links: readonly VenueLinkDto[], query: VenuesQueryDto): Promise<readonly VenueLinkDto[]> {
    if (!hasBeerFilter(query)) {
      return links;
    }
    const beers = await this.beersService.getBeersByIds([...new Set(links.map((link) => link.beerId))]);
    const matchingBeerIds = new Set(beers.filter((beer) => matchesBeerFilter(beer, query)).map((beer) => beer.id));
    return links.filter((link) => matchingBeerIds.has(link.beerId));
  }
}
