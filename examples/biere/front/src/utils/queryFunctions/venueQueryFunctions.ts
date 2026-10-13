import VenueService from "@/api/venues/venueService";
import type { VoteSenseEnum } from "@/types/enums/venue/voteSenseEnum";
import type { VenueQuery } from "@/types/models/venue/venueQuery";

export const fetchVenues = (query: VenueQuery) => VenueService.getAll(query);

export const fetchVenueBeers = (venueId: number) => VenueService.getBeers(venueId);

export const voteVenueBeer = (venueId: number, beerId: number, sense: VoteSenseEnum) =>
  VenueService.vote(venueId, beerId, sense);
