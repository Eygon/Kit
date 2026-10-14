import { httpClient } from "@/api/httpClient";
import { HttpError } from "@/api/httpError";
import type { BeerVenueDto } from "@/types/dtos/venue/beerVenueDto";
import type { VenueBeerDto } from "@/types/dtos/venue/venueBeerDto";
import type { VenueDto } from "@/types/dtos/venue/venueDto";
import { beerVenueDtoToModel } from "@/types/mappers/venue/beerVenueMapper";
import { newVenueToDto } from "@/types/mappers/venue/newVenueMapper";
import { venueBeerDtoToModel } from "@/types/mappers/venue/venueBeerMapper";
import { venueDtoToModel } from "@/types/mappers/venue/venueMapper";
import { venueDtosToSearchResult } from "@/types/mappers/venue/venueSearchResultMapper";
import { venueQueryToSearchParams } from "@/types/mappers/venue/venueQueryMapper";
import type { BeerVenue } from "@/types/models/venue/beerVenue";
import type { NewVenue } from "@/types/models/venue/newVenue";
import type { VenueBeer } from "@/types/models/venue/venueBeer";
import type { Venue } from "@/types/models/venue/venue";
import type { VenueQuery } from "@/types/models/venue/venueQuery";
import type { VenueSearchResult } from "@/types/models/venue/venueSearchResult";
import { HttpStatusCodeEnum } from "@/types/enums/http/httpStatusCodeEnum";
import type { VoteSenseEnum } from "@/types/enums/venue/voteSenseEnum";
import { BEER_VENUES, VENUES, VENUE_BEERS, VENUE_BEER_VOTES, VENUE_BY_ID } from "@/utils/apiURL/apiURL";
import { DisplayError } from "@/utils/displayError/displayError";
import { getErrorTranslationKey } from "@/utils/displayError/getErrorTranslationKey";

const getVoteErrorTranslationKey = (error: unknown): string =>
  error instanceof HttpError && error.status === HttpStatusCodeEnum.CONFLICT
    ? "pages.map.vote.alreadyVoted"
    : getErrorTranslationKey(error);

const getReportErrorTranslationKey = (error: unknown): string =>
  error instanceof HttpError && error.status === HttpStatusCodeEnum.CONFLICT
    ? "pages.map.report.alreadyListed"
    : getErrorTranslationKey(error);

const getCreateErrorTranslationKey = (error: unknown): string =>
  error instanceof HttpError && error.status === HttpStatusCodeEnum.CONFLICT
    ? "pages.map.propose.nameTaken"
    : getErrorTranslationKey(error);

const getVenueReadErrorTranslationKey = (error: unknown): string =>
  error instanceof HttpError && error.status === HttpStatusCodeEnum.NOT_FOUND
    ? "pages.map.venue.gone"
    : getErrorTranslationKey(error);

export default class VenueService {
  static async getAll(query: VenueQuery): Promise<Venue[]> {
    const response = await httpClient.get<VenueDto[]>(`${VENUES()}?${venueQueryToSearchParams(query)}`);
    if (response.data === null) return [];
    return response.data.map(venueDtoToModel);
  }

  static async search(query: VenueQuery): Promise<VenueSearchResult> {
    const response = await httpClient.get<VenueDto[]>(`${VENUES()}?${venueQueryToSearchParams(query)}`);
    if (response.data === null) return { venues: [], isApproximate: false };
    return venueDtosToSearchResult(response.data);
  }

  static async getById(venueId: number): Promise<Venue | null> {
    try {
      const response = await httpClient.get<VenueDto>(VENUE_BY_ID(venueId));
      if (response.data === null) return null;
      return venueDtoToModel(response.data);
    } catch (error) {
      DisplayError(error, getVenueReadErrorTranslationKey);
      return null;
    }
  }

  static async getBeers(venueId: number): Promise<VenueBeer[]> {
    const response = await httpClient.get<VenueBeerDto[]>(VENUE_BEERS(venueId));
    if (response.data === null) return [];
    return response.data.map(venueBeerDtoToModel);
  }

  static async getForBeer(beerId: number): Promise<BeerVenue[]> {
    const response = await httpClient.get<BeerVenueDto[]>(BEER_VENUES(beerId));
    if (response.data === null) return [];
    return response.data.map(beerVenueDtoToModel);
  }

  static async vote(venueId: number, beerId: number, sense: VoteSenseEnum): Promise<VenueBeer> {
    try {
      const response = await httpClient.post<VenueBeerDto>(VENUE_BEER_VOTES(venueId, beerId), { sense });
      if (response.data === null) throw new Error("Empty vote response");
      return venueBeerDtoToModel(response.data);
    } catch (error) {
      DisplayError(error, getVoteErrorTranslationKey);
      throw error;
    }
  }

  static async reportBeer(venueId: number, beerId: number): Promise<VenueBeer> {
    try {
      const response = await httpClient.post<VenueBeerDto>(VENUE_BEERS(venueId), { beerId });
      if (response.data === null) throw new Error("Empty report response");
      return venueBeerDtoToModel(response.data);
    } catch (error) {
      DisplayError(error, getReportErrorTranslationKey);
      throw error;
    }
  }

  static async create(newVenue: NewVenue): Promise<Venue> {
    try {
      const response = await httpClient.post<VenueDto>(VENUES(), newVenueToDto(newVenue));
      if (response.data === null) throw new Error("Empty create response");
      return venueDtoToModel(response.data);
    } catch (error) {
      DisplayError(error, getCreateErrorTranslationKey);
      throw error;
    }
  }
}
