import type { VenueTypeEnum } from "@/modules/venues/enums/venue-type.enum";

export interface VenueRecordDto {
  readonly id: number;
  readonly name: string;
  readonly type: VenueTypeEnum;
  readonly city: string;
  readonly address: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly description: string;
}
