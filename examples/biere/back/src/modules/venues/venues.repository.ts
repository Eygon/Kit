import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { escapeLikePattern } from "@/common/text/escape-like-pattern";
import { normalizeSearchText } from "@/common/text/normalize-search-text";
import type { VenueAreaFiltersDto } from "@/modules/venues/dtos/venue-area-filters.dto";
import type { VenueLinkDto } from "@/modules/venues/dtos/venue-link.dto";
import type { VoteRecordDto } from "@/modules/venues/dtos/vote-record.dto";
import type { VenueRecordDto } from "@/modules/venues/dtos/venue-record.dto";
import { AvailabilityVote } from "@/modules/venues/entities/availability-vote.entity";
import { Venue } from "@/modules/venues/entities/venue.entity";
import { VenueBeer } from "@/modules/venues/entities/venue-beer.entity";
import { toVenueLinkDto, toVoteRecordDto } from "@/modules/venues/mappers/venue-beer.mapper";
import { toVenueRecordDto } from "@/modules/venues/mappers/venue.mapper";

const SEARCH_CONDITION = "(venue.searchName LIKE :pattern ESCAPE '\\' OR venue.searchCity LIKE :pattern ESCAPE '\\')";

const SEARCH_RELEVANCE_ORDER =
  "CASE WHEN venue.searchName LIKE :prefix ESCAPE '\\' THEN 0 WHEN venue.searchName LIKE :pattern ESCAPE '\\' THEN 1 ELSE 2 END";

@Injectable()
export class VenuesRepository {
  constructor(
    @InjectRepository(Venue) private readonly venues: Repository<Venue>,
    @InjectRepository(VenueBeer) private readonly links: Repository<VenueBeer>,
    @InjectRepository(AvailabilityVote) private readonly votes: Repository<AvailabilityVote>,
  ) {}

  async findVenues(area: VenueAreaFiltersDto): Promise<VenueRecordDto[]> {
    const query = this.venues.createQueryBuilder("venue");
    if (area.bounds !== null) {
      query
        .andWhere("venue.latitude BETWEEN :south AND :north", { south: area.bounds.south, north: area.bounds.north })
        .andWhere("venue.longitude BETWEEN :west AND :east", { west: area.bounds.west, east: area.bounds.east });
    }
    if (area.types.length > 0) {
      query.andWhere("venue.type IN (:...types)", { types: area.types });
    }
    const term = normalizeSearchText(area.search);
    if (term === "") {
      query.orderBy("venue.name", "ASC");
    } else {
      const escaped = escapeLikePattern(term);
      query
        .andWhere(SEARCH_CONDITION, { pattern: `%${escaped}%` })
        .setParameter("prefix", `${escaped}%`)
        .orderBy(SEARCH_RELEVANCE_ORDER, "ASC")
        .addOrderBy("venue.searchName", "ASC");
    }
    const entities = await query.addOrderBy("venue.id", "ASC").getMany();
    return entities.map(toVenueRecordDto);
  }

  async findVenueById(id: number): Promise<VenueRecordDto | null> {
    const entity = await this.venues.findOneBy({ id });
    return entity === null ? null : toVenueRecordDto(entity);
  }

  async findLinks(venueIds: readonly number[]): Promise<VenueLinkDto[]> {
    if (venueIds.length === 0) {
      return [];
    }
    const entities = await this.links
      .createQueryBuilder("link")
      .leftJoinAndSelect("link.votes", "vote")
      .where("link.venueId IN (:...venueIds)", { venueIds })
      .orderBy("link.id", "ASC")
      .addOrderBy("vote.id", "ASC")
      .getMany();
    return entities.map(toVenueLinkDto);
  }

  async findLinksByVenue(venueId: number): Promise<VenueLinkDto[]> {
    const entities = await this.links
      .createQueryBuilder("link")
      .leftJoinAndSelect("link.votes", "vote")
      .where("link.venueId = :venueId", { venueId })
      .orderBy("link.id", "ASC")
      .addOrderBy("vote.id", "ASC")
      .getMany();
    return entities.map(toVenueLinkDto);
  }

  async findLinksByBeer(beerId: number): Promise<VenueLinkDto[]> {
    const entities = await this.links
      .createQueryBuilder("link")
      .leftJoinAndSelect("link.votes", "vote")
      .where("link.beerId = :beerId", { beerId })
      .orderBy("link.id", "ASC")
      .addOrderBy("vote.id", "ASC")
      .getMany();
    return entities.map(toVenueLinkDto);
  }

  async findLink(venueId: number, beerId: number): Promise<VenueLinkDto | null> {
    const entity = await this.links
      .createQueryBuilder("link")
      .leftJoinAndSelect("link.votes", "vote")
      .where("link.venueId = :venueId", { venueId })
      .andWhere("link.beerId = :beerId", { beerId })
      .orderBy("vote.id", "ASC")
      .getOne();
    return entity === null ? null : toVenueLinkDto(entity);
  }

  async findLastUserVote(venueBeerId: number, userId: number): Promise<VoteRecordDto | null> {
    const entity = await this.votes.findOne({
      where: { venueBeerId, userId },
      order: { votedAt: "DESC", id: "DESC" },
    });
    return entity === null ? null : toVoteRecordDto(entity);
  }

  async findVotesByUser(userId: number): Promise<VoteRecordDto[]> {
    const entities = await this.votes.find({ where: { userId }, order: { votedAt: "ASC", id: "ASC" } });
    return entities.map(toVoteRecordDto);
  }

  async createVote(data: Omit<AvailabilityVote, "id" | "venueBeer">): Promise<void> {
    await this.votes.insert(data);
  }

  async existsByNameKey(nameKey: string): Promise<boolean> {
    return this.venues.existsBy({ nameKey });
  }

  existsById(id: number): Promise<boolean> {
    return this.venues.existsBy({ id });
  }

  async createVenue(data: Omit<Venue, "id">): Promise<VenueRecordDto> {
    const entity = await this.venues.save(this.venues.create(data));
    return toVenueRecordDto(entity);
  }

  async createLink(venueId: number, beerId: number): Promise<VenueLinkDto> {
    const entity = await this.links.save(this.links.create({ venueId, beerId }));
    return toVenueLinkDto({ id: entity.id, venueId, beerId, votes: [] });
  }

  async findVenuesByIds(ids: readonly number[]): Promise<VenueRecordDto[]> {
    if (ids.length === 0) {
      return [];
    }
    const entities = await this.venues
      .createQueryBuilder("venue")
      .where("venue.id IN (:...ids)", { ids })
      .orderBy("venue.id", "ASC")
      .getMany();
    return entities.map(toVenueRecordDto);
  }
}
