export interface UpdateCheckinDto {
  drankAt?: string;
  place?: string;
  venueId?: number | null;
  rating?: number | null;
  aromas?: string[];
  format?: string;
  price?: number | null;
  comment?: string;
}
