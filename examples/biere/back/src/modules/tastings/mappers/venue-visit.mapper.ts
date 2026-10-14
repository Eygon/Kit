import type { VenueVisitDto } from "@/modules/tastings/dtos/venue-visit.dto";

export interface RawVenueVisitRow {
  readonly venueId: number | string;
  readonly checkinCount: number | string;
  readonly lastCheckinAt: string;
}

export const toIsoDate = (stored: string): string => new Date(`${stored.replace(" ", "T")}Z`).toISOString();

export const toVenueVisitDto = (row: RawVenueVisitRow): VenueVisitDto => ({
  venueId: Number(row.venueId),
  checkinCount: Number(row.checkinCount),
  lastCheckinAt: toIsoDate(row.lastCheckinAt),
});
