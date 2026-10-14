import type { VenueDto } from "@/types/dtos/venue/venueDto";
import { venueDtoToModel } from "@/types/mappers/venue/venueMapper";
import type { VenueSearchResult } from "@/types/models/venue/venueSearchResult";

export const venueDtosToSearchResult = (dtos: VenueDto[]): VenueSearchResult => ({
  venues: dtos.map(venueDtoToModel),
  isApproximate: dtos.some((dto) => dto.isApproximateMatch === true),
});
