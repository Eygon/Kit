import type { AvailabilityDto } from "@/modules/venues/dtos/availability.dto";
import type { BeerVenueDto } from "@/modules/venues/dtos/beer-venue.dto";
import type { VenueRecordDto } from "@/modules/venues/dtos/venue-record.dto";

export const toBeerVenueDto = (
  venue: VenueRecordDto,
  availability: AvailabilityDto,
  distanceKm: number | null,
): BeerVenueDto => ({
  venueId: venue.id,
  venueName: venue.name,
  venueType: venue.type,
  city: venue.city,
  address: venue.address,
  latitude: venue.latitude,
  longitude: venue.longitude,
  status: availability.status,
  lastConfirmedAt: availability.lastConfirmedAt?.toISOString() ?? null,
  recentVoterCount: availability.recentVoterCount,
  distanceKm,
});
