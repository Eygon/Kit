export interface CheckinDto {
  id: number;
  beerId: number;
  beerName: string;
  drankAt: string;
  place: string;
  rating: number | null;
  aromas: string[];
  format: string;
  price: number | null;
  comment: string;
  photoId: string | null;
  venueId: number | null;
}
