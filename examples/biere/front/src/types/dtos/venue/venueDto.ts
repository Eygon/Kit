export interface VenueDto {
  id: number;
  name: string;
  type: string;
  city: string;
  address: string;
  latitude: number;
  longitude: number;
  description: string;
  distanceKm: number | null;
  status: string;
}
