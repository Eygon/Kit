export interface BeerVenueDto {
  venueId: number;
  venueName: string;
  venueType: string;
  city: string;
  address: string;
  latitude: number;
  longitude: number;
  status: string;
  lastConfirmedAt: string | null;
  recentVoterCount: number;
  distanceKm: number | null;
}
