import VenueService from "@/api/venues/venueService";
import type { VoteSenseEnum } from "@/types/enums/venue/voteSenseEnum";
import type { NewVenue } from "@/types/models/venue/newVenue";
import type { VenueQuery } from "@/types/models/venue/venueQuery";

export const fetchVenues = (query: VenueQuery) => VenueService.getAll(query);

export const fetchVenue = (venueId: number) => VenueService.getById(venueId);

export const fetchVenueBeers = (venueId: number) => VenueService.getBeers(venueId);

export const fetchBeerVenues = (beerId: number) => VenueService.getForBeer(beerId);

export const voteVenueBeer = (venueId: number, beerId: number, sense: VoteSenseEnum) =>
  VenueService.vote(venueId, beerId, sense);

export const reportVenueBeer = (venueId: number, beerId: number) => VenueService.reportBeer(venueId, beerId);

export const createVenue = (newVenue: NewVenue) => VenueService.create(newVenue);
