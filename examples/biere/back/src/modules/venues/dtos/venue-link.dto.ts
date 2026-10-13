import type { VoteRecordDto } from "@/modules/venues/dtos/vote-record.dto";

export interface VenueLinkDto {
  readonly id: number;
  readonly venueId: number;
  readonly beerId: number;
  readonly votes: readonly VoteRecordDto[];
}
