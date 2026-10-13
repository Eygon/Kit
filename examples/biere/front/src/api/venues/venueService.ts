import { httpClient } from "@/api/httpClient";
import { HttpError } from "@/api/httpError";
import type { VenueBeerDto } from "@/types/dtos/venue/venueBeerDto";
import type { VenueDto } from "@/types/dtos/venue/venueDto";
import { venueBeerDtoToModel } from "@/types/mappers/venue/venueBeerMapper";
import { venueDtoToModel } from "@/types/mappers/venue/venueMapper";
import { venueQueryToSearchParams } from "@/types/mappers/venue/venueQueryMapper";
import type { VenueBeer } from "@/types/models/venue/venueBeer";
import type { Venue } from "@/types/models/venue/venue";
import type { VenueQuery } from "@/types/models/venue/venueQuery";
import { HttpStatusCodeEnum } from "@/types/enums/http/httpStatusCodeEnum";
import type { VoteSenseEnum } from "@/types/enums/venue/voteSenseEnum";
import { VENUES, VENUE_BEERS, VENUE_BEER_VOTES } from "@/utils/apiURL/apiURL";
import { DisplayError } from "@/utils/displayError/displayError";
import { getErrorTranslationKey } from "@/utils/displayError/getErrorTranslationKey";

const getVoteErrorTranslationKey = (error: unknown): string =>
  error instanceof HttpError && error.status === HttpStatusCodeEnum.CONFLICT
    ? "pages.map.vote.alreadyVoted"
    : getErrorTranslationKey(error);

export default class VenueService {
  static async getAll(query: VenueQuery): Promise<Venue[]> {
    const response = await httpClient.get<VenueDto[]>(`${VENUES()}?${venueQueryToSearchParams(query)}`);
    if (response.data === null) return [];
    return response.data.map(venueDtoToModel);
  }

  static async getBeers(venueId: number): Promise<VenueBeer[]> {
    const response = await httpClient.get<VenueBeerDto[]>(VENUE_BEERS(venueId));
    if (response.data === null) return [];
    return response.data.map(venueBeerDtoToModel);
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
}
